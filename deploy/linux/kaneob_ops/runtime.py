import contextlib
import fcntl
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from .config import OpsError


def run(args, *, input_file=None, output_file=None, timeout=3600, env=None):
    try:
        result = subprocess.run(
            [str(a) for a in args], stdin=input_file,
            stdout=output_file if output_file else subprocess.PIPE,
            stderr=subprocess.PIPE, timeout=timeout, env=env, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise OpsError(f"{Path(str(args[0])).name} could not finish") from error
    if result.returncode:
        # Tool output can contain database rows, URLs or private configuration.
        raise OpsError(f"{Path(str(args[0])).name} failed (exit {result.returncode}); private tool output suppressed")
    return result.stdout or b""


def write_atomic(file, contents, mode=0o600):
    file = Path(file)
    fd, temporary = tempfile.mkstemp(prefix=".write-", dir=file.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(contents if isinstance(contents, bytes) else contents.encode())
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, file)
        directory = os.open(file.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        Path(temporary).unlink(missing_ok=True)


def write_json(file, data):
    write_atomic(file, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def update_env(file, values):
    lines = Path(file).read_text().splitlines()
    for key, value in values.items():
        indices = [i for i, line in enumerate(lines) if line.startswith(key + "=")]
        if len(indices) > 1:
            raise OpsError(f"Duplicate deployment key: {key}")
        text = f"{key}={value}"
        if indices:
            lines[indices[0]] = text
        else:
            lines.append(text)
    write_atomic(file, "\n".join(lines) + "\n")


@contextlib.contextmanager
def operation_lock(config):
    config.check_mount()
    if not config.state.is_dir() or config.state.is_symlink():
        raise OpsError("Initialize the deployment state directory first")
    lock = os.open(config.state / "operations.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise OpsError("Another backup, restore or upgrade is running") from error
        yield
    finally:
        os.close(lock)


class Runtime:
    def __init__(self, config):
        self.config = config

    def compose(self, *args, **kwargs):
        env = os.environ.copy()
        for key in ("KANEO_IMAGE", "KANEO_ROOT", "COMPOSE_FILE", "COMPOSE_PROJECT_NAME", "POSTGRES_IMAGE"):
            env.pop(key, None)
        env["KANEO_ROOT"] = str(self.config.root)
        env.update(kwargs.pop("extra_env", {}))
        return run(["docker", "compose", "--project-name", self.config.project,
                    "--env-file", self.config.root / ".env", "-f", self.config.root / "compose.yml", *args],
                   env=env, timeout=self.config.timeout, **kwargs)

    def container(self, service):
        value = self.compose("ps", "--all", "--quiet", service).decode().strip().splitlines()
        if len(value) != 1:
            raise OpsError(f"Expected exactly one {service} container")
        return json.loads(run(["docker", "inspect", value[0]]))[0]

    def image(self, reference, pull=False):
        try:
            return json.loads(run(["docker", "image", "inspect", reference]))[0]
        except OpsError:
            if not pull:
                raise
            run(["docker", "pull", reference], timeout=self.config.timeout)
            return json.loads(run(["docker", "image", "inspect", reference]))[0]

    def preflight(self, allow_uncreated_application=False):
        self.config.check_mount()
        context = json.loads(run(["docker", "context", "inspect"]))[0]
        endpoint = context["Endpoints"]["docker"]["Host"]
        if not os.environ.get("DOCKER_CONTEXT"):
            endpoint = os.environ.get("DOCKER_HOST", endpoint)
        if urlparse(endpoint).scheme != "unix":
            raise OpsError("Use a local Linux Docker daemon, not a remote Docker context")
        for tool in ("docker", "age", "rsync", "ssh"):
            if not shutil.which(tool):
                raise OpsError(f"Missing executable: {tool}")
        for folder in ("postgres", "runtime", "api-data", "backups", "state/gateway", "config"):
            path = self.config.root / folder
            if not path.is_dir() or path.is_symlink():
                raise OpsError(f"Missing or symlinked deployment directory: {folder}")
        for name in (".env", "compose.yml", "config/gateway.conf"):
            path = self.config.root / name
            if not path.is_file() or path.is_symlink():
                raise OpsError(f"Missing or symlinked deployment file: {name}")
        if (self.config.root / ".env").stat().st_mode & 0o077:
            raise OpsError("Deployment .env must have permissions 0600")
        settings = json.loads(self.compose("config", "--format", "json"))
        services = settings["services"]
        environment = services["kaneo"].get("environment", {})
        db_env = services["postgres"]["environment"]
        if environment.get("AUTH_SECRET_FILE") or environment.get("POSTGRES_PASSWORD_FILE") or db_env.get("POSTGRES_PASSWORD_FILE"):
            raise OpsError("This managed backup format requires secrets in the private deployment .env, not external secret files")
        if environment.get("DATABASE_URL"):
            url = urlparse(environment["DATABASE_URL"])
            if url.hostname != "postgres" or url.port not in (None, 5432) or url.path != "/" + db_env["POSTGRES_DB"]:
                raise OpsError("These scripts only support the bundled PostgreSQL database")
        elif environment.get("POSTGRES_HOST", "postgres") != "postgres" or str(environment.get("POSTGRES_PORT", "5432")) != "5432":
            raise OpsError("The application database must be the bundled postgres service")
        for key in ("POSTGRES_DB", "POSTGRES_USER"):
            if environment.get(key, "kaneo") != db_env[key]:
                raise OpsError("Application and PostgreSQL database settings differ")
        if services["kaneo"].get("ports"):
            raise OpsError("The application must only be reachable through the maintenance gateway")
        expected = {"postgres": {"/var/lib/postgresql/data": "postgres"},
                    "kaneo": {"/var/lib/kaneo": "runtime", "/app/apps/api/data": "api-data"},
                    "gateway": {"/maintenance": "state/gateway", "/etc/nginx/conf.d/default.conf": "config/gateway.conf"}}
        for service, targets in expected.items():
            actual = None if allow_uncreated_application and service == "kaneo" else self.container(service)
            if actual and service in ("kaneo", "postgres") and any(actual.get("NetworkSettings", {}).get("Ports", {}).values()):
                raise OpsError("Running application/database ports must not bypass the maintenance gateway")
            if actual and service == "postgres":
                running_env = dict(value.split("=", 1) for value in actual["Config"]["Env"] if "=" in value)
                if any(running_env.get(key) != db_env[key] for key in ("POSTGRES_USER", "POSTGRES_DB")):
                    raise OpsError("Running PostgreSQL identity differs from the deployment .env")
            for target, source in targets.items():
                mount = next((v for v in actual["Mounts"] if v["Destination"] == target), None) if actual else None
                configured = next((v for v in services[service].get("volumes", []) if v["target"] == target), None)
                wanted = str(self.config.root / source)
                if not configured or configured.get("source") != wanted or configured.get("type") != "bind":
                    raise OpsError("Configured data mounts must match the deployment root")
                if actual and (not mount or mount["Type"] != "bind" or mount["Source"] != wanted):
                    raise OpsError("Running and configured data mounts must match the deployment root")
        if environment.get("S3_ENDPOINT") and not self.config.object_backup_command:
            raise OpsError("S3 is enabled: configure object_backup_command before claiming a complete backup")
        if not environment.get("AUTH_SECRET") and not environment.get("AUTH_SECRET_FILE"):
            raise OpsError("A stable AUTH_SECRET is required")
        return settings

    def healthy(self, service):
        container = self.container(service)
        if not container["State"].get("Running") or container["State"].get("Health", {}).get("Status") != "healthy":
            raise OpsError(f"{service} did not pass its health check")
        return container

    def check_gate(self, maintenance):
        container = self.container("gateway")
        response = run(["docker", "exec", container["Id"], "sh", "-ec",
                        "wget -S --spider http://127.0.0.1/api/health 2>&1 || true"], timeout=30).decode()
        statuses = re.findall(r"(?m)^\s*HTTP/\S+\s+(\d{3})", response)
        if statuses != ["503" if maintenance else "200"]:
            raise OpsError("Maintenance gateway did not return the expected HTTP status")
