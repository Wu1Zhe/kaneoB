#!/usr/bin/env python3
import argparse
import os
import secrets
import shutil
import signal
import sys
from pathlib import Path

from kaneob_ops.archive import copy_tree, unpack
from kaneob_ops.activate import activate
from kaneob_ops.backup import backup
from kaneob_ops.config import Config, OpsError
from kaneob_ops.remote import sync_file
from kaneob_ops.restore import restore, verify
from kaneob_ops.runtime import Runtime, operation_lock, update_env, write_atomic
from kaneob_ops.upgrade import upgrade


def initialize(config, image, url, port):
    config.check_mount()
    import re
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./:@+-]{0,500}", image) or not 1024 <= port <= 65535:
        raise OpsError("Invalid application image or port")
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or any(char.isspace() for char in url):
        raise OpsError("Use an http(s) public application URL without credentials, query or whitespace")
    root = config.root
    if root.exists() and any(root.iterdir()):
        raise OpsError("Initialization requires a new or completely empty deployment directory")
    root.mkdir(mode=0o750, parents=True, exist_ok=True)
    for name in ("postgres", "runtime", "api-data", "backups", "state/gateway", "config"):
        (root / name).mkdir(mode=0o750, parents=True, exist_ok=True)
    for name in ("runtime", "api-data"):
        os.chown(root / name, 1001, 0)
        os.chmod(root / name, 0o770)
    os.chmod(root / "state/gateway", 0o755)
    source = Path(__file__).resolve().parent
    write_atomic(root / "compose.yml", (source / "compose.yml").read_text().replace("name: kaneob-linux", "name: " + config.project, 1), 0o644)
    shutil.copyfile(source / "gateway.conf", root / "config/gateway.conf")
    os.chmod(root / "config/gateway.conf", 0o644)
    write_atomic(root / ".env", (source / "deployment.env.example").read_text())
    update_env(root / ".env", {"KANEO_ROOT": str(root), "KANEO_IMAGE": image,
               "KANEO_CLIENT_URL": url, "KANEO_PORT": str(port),
               "POSTGRES_PASSWORD": secrets.token_hex(32), "AUTH_SECRET": secrets.token_hex(32)})
    print(f"Initialized {root}; configure your public URL and start the three Compose services")


def interrupted(signum, frame):
    raise OpsError("Operation interrupted; check maintenance/recovery state before retrying")


def main():
    parser = argparse.ArgumentParser(description="KaneoB Linux backup and release operations")
    parser.add_argument("--config", default=os.environ.get("KANEO_OPS_CONFIG", "/etc/kaneob/ops.json"))
    commands = parser.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init")
    init.add_argument("--image", required=True)
    init.add_argument("--url", required=True)
    init.add_argument("--port", type=int, default=5173)
    commands.add_parser("backup")
    activation = commands.add_parser("activate")
    activation.add_argument("--url", required=True)
    activation.add_argument("--objects-restored", action="store_true")
    sync = commands.add_parser("sync")
    sync.add_argument("bundle")
    update = commands.add_parser("upgrade")
    update.add_argument("image")
    for name in ("verify", "restore", "unpack"):
        command = commands.add_parser(name)
        command.add_argument("bundle")
        command.add_argument("--identity", required=True)
        if name == "restore":
            command.add_argument("--target-root", required=True)
            command.add_argument("--project", required=True)
            command.add_argument("--port", type=int, default=15173)
            command.add_argument("--database-only", action="store_true")
        if name == "unpack":
            command.add_argument("--destination", required=True)
    args = parser.parse_args()
    os.umask(0o077)
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    config = Config.load(args.config)
    if args.command == "init":
        initialize(config, args.image, args.url, args.port)
        return
    runtime = Runtime(config)
    with operation_lock(config):
        if args.command == "backup":
            backup(runtime)
        elif args.command == "activate":
            activate(runtime, args.url, args.objects_restored)
        elif args.command == "upgrade":
            upgrade(runtime, args.image)
        elif args.command == "sync":
            file = Path(args.bundle).resolve(strict=True)
            if file.parent != config.backups or not file.name.startswith("kaneob-") or not file.name.endswith(".tar.age"):
                raise OpsError("Only a managed local backup can be synchronized")
            sync_file(config, file)
            print("Encrypted backup verified off-site")
        elif args.command == "verify":
            verify(runtime, args.bundle, args.identity)
        elif args.command == "restore":
            restore(runtime, args.bundle, args.identity, args.target_root, args.project, args.port, args.database_only)
        elif args.command == "unpack":
            target = Path(args.destination)
            if not target.is_absolute() or target.exists():
                raise OpsError("Use a NEW absolute private unpack directory")
            with unpack(args.bundle, args.identity) as (content, manifest):
                copy_tree(content, target)
            print("Decrypted contents exported privately; this directory includes credentials")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not echo parser errors, environment contents or exception values.
        message = str(error) if isinstance(error, OpsError) else "Operation failed; check paths, permissions, JSON configuration and available disk space"
        print(f"ERROR: {message}", file=sys.stderr)
        sys.exit(1)
