import contextlib
import json
import re
import select
import subprocess
import time
import uuid
from pathlib import Path

from .config import OpsError
from .runtime import run

CORE_TABLES = {"public.user", "public.workspace", "public.project", "public.task", "public.idea", "public.dashboard_snapshot"}


def quote_identifier(value):
    return '"' + value.replace('"', '""') + '"'


class Database:
    def __init__(self, container, user=None, database=None, host=None):
        self.container = container
        self.user = user
        self.database = database
        self.host = host

    def command(self, tool, *args, interactive=False):
        credentials = ["-U", self.user, "-d", self.database] if self.user else []
        if self.host:
            credentials = ["-h", self.host, *credentials]
        if self.user:
            return ["docker", "exec", *(["-i"] if interactive else []), self.container, tool, *credentials, *args]
        return ["docker", "exec", *(["-i"] if interactive else []), self.container, "sh", "-ec",
                f'exec {tool} -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"', "sh", *args]

    def query(self, query, snapshot=None):
        if snapshot:
            query = f"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '{snapshot}'; {query}; COMMIT;"
        return run(self.command("psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", query)).decode().strip()

    def check_version(self):
        if int(self.query("SHOW server_version_num")) // 10000 != 16:
            raise OpsError("Only PostgreSQL 16 is supported by this deployment workflow")

    @contextlib.contextmanager
    def snapshot(self):
        process = subprocess.Popen(self.command("psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", interactive=True),
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            process.stdin.write(b"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n")
            process.stdin.flush()
            if not select.select([process.stdout], [], [], 30)[0]:
                raise OpsError("Timed out acquiring a consistent database snapshot")
            snapshot = process.stdout.readline().decode().strip()
            if not re.fullmatch(r"[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+", snapshot):
                raise OpsError("Unable to acquire a database snapshot")
            yield snapshot
        finally:
            if process.poll() is None:
                try:
                    process.stdin.write(b"ROLLBACK;\n\\q\n")
                    process.stdin.flush()
                except (BrokenPipeError, OSError):
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            for stream in (process.stdin, process.stdout):
                stream.close()

    def dump(self, file, snapshot):
        with Path(file).open("wb") as stream:
            run(self.command("pg_dump", "--format=custom", "--lock-wait-timeout=60000", f"--snapshot={snapshot}"), output_file=stream)

    def inventory(self, snapshot=None):
        rows = json.loads(self.query("SELECT COALESCE(json_agg(json_build_array(n.nspname,c.relname)), '[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'", snapshot))
        if not rows:
            return {}
        statements = []
        for schema, table in rows:
            name = schema + "." + table
            identifier = quote_identifier(schema) + "." + quote_identifier(table)
            ids = "md5(COALESCE(string_agg(id::text, E'\\n' ORDER BY id::text COLLATE \"C\"), ''))" if name in CORE_TABLES else "NULL::text"
            literal = "'" + name.replace("'", "''") + "'"
            statements.append(f"SELECT {literal} AS name, json_build_object('rows',count(*),'ids',{ids}) AS data FROM {identifier}")
        return json.loads(self.query("SELECT json_object_agg(name,data) FROM (" + " UNION ALL ".join(statements) + ") entries", snapshot))

    def restore(self, file):
        with Path(file).open("rb") as stream:
            run(self.command("pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", interactive=True), input_file=stream)


def check_inventory(expected, actual, core_only=False):
    keys = set(expected) & CORE_TABLES if core_only else set(expected)
    if not core_only and set(expected) != set(actual):
        raise OpsError("Restored database table list differs from the backup")
    for key in keys:
        if expected[key] != actual.get(key):
            raise OpsError("Database record verification failed; access remains closed")


@contextlib.contextmanager
def verification_database(image):
    name = "kaneob-verify-" + uuid.uuid4().hex[:16]
    created = False
    try:
        run(["docker", "run", "--detach", "--pull=never", "--name", name, "--label", "kaneob.ops=restore-check",
             "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_USER=verify", "-e", "POSTGRES_DB=verify", image])
        created = True
        # The image's initialization server only listens on a Unix socket.
        # TCP avoids restoring while that temporary server is shutting down.
        database = Database(name, "verify", "verify", host="127.0.0.1")
        for _ in range(120):
            try:
                database.query("SELECT 1")
                break
            except OpsError:
                time.sleep(1)
        else:
            raise OpsError("Isolated restore database did not become ready")
        database.check_version()
        yield database
    finally:
        if created:
            run(["docker", "rm", "--force", "--volumes", name], timeout=120)


def verify_dump(file, expected, image):
    with verification_database(image) as database:
        database.restore(file)
        check_inventory(expected, database.inventory())
