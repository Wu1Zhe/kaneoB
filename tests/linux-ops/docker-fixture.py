#!/usr/bin/env python3
"""Test-only Docker transport: real PG16 processes, no daemon or host access.

This deliberately implements only the commands exercised by the ops tests.
The compose-config path delegates to the real CLI without a daemon connection.
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tarfile
from pathlib import Path

root = Path(os.environ["KANEO_TEST_DOCKER_ROOT"])
root.mkdir(mode=0o755, parents=True, exist_ok=True)
args = sys.argv[1:]
pg_id = "sha256:" + "3" * 64
app_id = "sha256:" + "4" * 64


def pg_command(values):
    subprocess.run(["su-exec", "postgres", *map(str, values)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def record(file, data):
    file.write_text(json.dumps(data))


if args[:2] == ["context", "inspect"]:
    print(json.dumps([{"Endpoints": {"docker": {"Host": "unix:///var/run/docker.sock"}}}]))
elif args[:1] == ["compose"]:
    if "config" not in args:
        raise SystemExit("Fixture only allows daemon-free compose config")
    os.execv("/usr/local/bin/docker", ["docker", *args])
elif args[:2] == ["image", "inspect"]:
    reference = args[2]
    if reference in ("postgres:16-alpine", pg_id):
        print(json.dumps([{"Id": pg_id, "RepoDigests": ["postgres@" + pg_id]}]))
    elif reference == app_id or (root / "image.json").exists() and reference == json.loads((root / "image.json").read_text())["tag"]:
        print(json.dumps([{"Id": app_id, "RepoDigests": []}]))
    else:
        raise SystemExit(1)
elif args[:1] == ["build"]:
    sys.stdin.buffer.read()
    record(root / "image.json", {"tag": args[args.index("-t") + 1]})
    print(app_id)
elif args[:2] == ["image", "save"]:
    with tarfile.open(fileobj=sys.stdout.buffer, mode="w|") as archive:
        import io
        content = b"synthetic image bytes, no real application"
        member = tarfile.TarInfo("fixture.txt")
        member.size = len(content)
        archive.addfile(member, io.BytesIO(content))
elif args[:2] == ["image", "load"]:
    sys.stdin.buffer.read()
    print("Synthetic image loaded")
elif args[:2] == ["image", "rm"]:
    (root / "image.json").unlink(missing_ok=True)
elif args[:1] == ["run"]:
    name = args[args.index("--name") + 1]
    if not name.startswith("kaneob-verify-"):
        raise SystemExit("Unexpected test container name")
    directory = root / name
    directory.mkdir(mode=0o700)
    os.chown(directory, 70, 70)
    pg_command(["initdb", "-D", directory / "pgdata", "-U", "verify", "-A", "trust", "--no-instructions"])
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    pg_command(["pg_ctl", "-D", directory / "pgdata", "-l", directory / "postgres.log", "-o", f"-k {directory} -h 127.0.0.1 -p {port}", "-w", "start"])
    (directory / "port").write_text(str(port))
    pg_command(["createdb", "-h", directory, "-p", str(port), "-U", "verify", "verify"])
    record(directory / "container.json", {"Id": name, "Image": pg_id, "Config": {"Image": "postgres:16-alpine"}, "State": {"Running": True}})
    print(name)
elif args[:1] == ["inspect"]:
    print("[" + (root / args[1] / "container.json").read_text() + "]")
elif args[:1] == ["exec"]:
    offset = 2 if args[1] == "-i" else 1
    name = args[offset]
    directory = root / name
    if not (directory / "container.json").exists():
        raise SystemExit("Unknown synthetic container")
    environment = {**os.environ, "PGHOST": str(directory), "PGPORT": (directory / "port").read_text(), "POSTGRES_USER": "verify", "POSTGRES_DB": "verify"}
    command = args[offset + 1:]
    os.execvpe(command[0], command, environment)
elif args[:1] == ["rm"]:
    name = args[-1]
    directory = root / name
    if not name.startswith("kaneob-verify-") or not (directory / "container.json").exists():
        raise SystemExit("Refusing unknown test resource cleanup")
    pg_command(["pg_ctl", "-D", directory / "pgdata", "-m", "immediate", "-w", "stop"])
    shutil.rmtree(directory)
elif args[:1] == ["ps"]:
    pass
else:
    raise SystemExit("Docker fixture does not allow this command")
