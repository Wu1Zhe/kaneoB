import dataclasses
import json
import os
import shutil
import tempfile
from pathlib import Path

from .archive import check_checksum, copy_tree, unpack
from .config import OpsError
from .database import Database, check_inventory, verify_dump
from .runtime import Runtime, run, update_env, write_atomic, write_json


def postgres_image(runtime, manifest):
    try:
        return runtime.image(manifest["postgres_image_id"])["Id"]
    except OpsError:
        reference = manifest.get("postgres_image_digest") or manifest["postgres_image_reference"]
        return runtime.image(reference, pull=True)["Id"]


def application_image(runtime, manifest, bundle, identity):
    info = manifest["app_image"]
    try:
        image = runtime.image(info["id"])
    except OpsError:
        if info.get("digest"):
            image = runtime.image(info["digest"], pull=True)
        else:
            name = Path(info.get("archive", ""))
            if name.parts[:1] != ("images",) or len(name.parts) != 2 or ".." in name.parts:
                raise OpsError("Invalid saved application image reference")
            file = Path(bundle).resolve().parent / name
            check_checksum(file)
            with tempfile.TemporaryDirectory(prefix="kaneob-image-load-") as directory:
                tar = Path(directory) / "image.tar"
                run(["age", "--decrypt", "--identity", identity, "--output", tar, file])
                with tar.open("rb") as stream:
                    run(["docker", "image", "load"], input_file=stream)
            image = runtime.image(info["id"])
    if image["Id"] != info["id"]:
        raise OpsError("Restoration requires the exact original application image and architecture")
    return image["Id"]


def verify(runtime, bundle, identity):
    with unpack(bundle, identity) as (content, manifest):
        verify_dump(content / "database.dump", manifest["inventory"], postgres_image(runtime, manifest))
    print("Backup checksums, decryption, complete database restore and record inventory passed")


def restore(runtime, bundle, identity, target, project, port, database_only=False):
    config = runtime.config
    target = Path(target)
    if not target.is_absolute() or target.resolve() != target or target.is_relative_to(config.root) or config.root.is_relative_to(target) or len(target.parts) < 3:
        raise OpsError("Restore into a NEW canonical absolute deployment path")
    if not target.is_relative_to(config.data_mount) or not 1024 <= port <= 65535:
        raise OpsError("Restore target must be inside data_mount and use a separate unprivileged port")
    import re
    if project == config.project or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,60}", project):
        raise OpsError("Use a NEW Compose project name for restoration")
    if target.exists() and (target.is_symlink() or any(target.iterdir())):
        raise OpsError("Restore target must not exist or must be completely empty")
    if run(["docker", "ps", "--all", "--quiet", "--filter", f"label=com.docker.compose.project={project}"]).strip():
        raise OpsError("The restore Compose project already owns containers")
    with unpack(bundle, identity) as (content, manifest):
        image = postgres_image(runtime, manifest)
        verify_dump(content / "database.dump", manifest["inventory"], image)
        app_image = application_image(runtime, manifest, bundle, identity)
        if manifest.get("objects_included") and not database_only:
            raise OpsError("External objects need provider-specific recovery. Use --database-only, restore objects to a NEW bucket and configure its credentials before starting the application")
        target.mkdir(mode=0o750, parents=True, exist_ok=True)
        for folder in ("postgres", "runtime", "api-data", "backups", "state/gateway", "config"):
            (target / folder).mkdir(mode=0o750, parents=True, exist_ok=True)
        shutil.copyfile(content / "config/.env", target / ".env")
        os.chmod(target / ".env", 0o600)
        update_env(target / ".env", {"KANEO_ROOT": str(target), "KANEO_IMAGE": app_image,
                                    "POSTGRES_IMAGE": image, "KANEO_BIND": "127.0.0.1", "KANEO_PORT": str(port)})
        if database_only:
            update_env(target / ".env", {"S3_ENDPOINT": "", "S3_BUCKET": ""})
        template = Path(__file__).resolve().parents[1] / "compose.yml"
        write_atomic(target / "compose.yml", template.read_text().replace("name: kaneob-linux", "name: " + project, 1), 0o644)
        shutil.copyfile(content / "config/gateway.conf", target / "config/gateway.conf")
        if (content / "config/ops.json").exists():
            operations = json.loads((content / "config/ops.json").read_text())
            operations.update(root=str(target), project=project, data_mount=str(config.data_mount))
            write_json(target / "config/ops.restore.example.json", operations)
        if (content / "api-data").exists():
            shutil.rmtree(target / "api-data")
            copy_tree(content / "api-data", target / "api-data")
        if (content / "objects").exists():
            copy_tree(content / "objects", target / "restored-objects")
        for folder in (target / "runtime", target / "api-data"):
            for entry in (folder, *folder.rglob("*")):
                os.chown(entry, 1001, 0)
                os.chmod(entry, 0o770 if entry.is_dir() else 0o660)
        os.chmod(target / "state/gateway", 0o755)
        os.chmod(target / "config/gateway.conf", 0o644)
        recovered = Runtime(dataclasses.replace(config, root=target, project=project))
        write_atomic(recovered.config.maintenance, "Restore validation in progress\n", 0o644)
        write_json(recovered.config.recovery, {"phase": "restore-in-progress", "backup": str(Path(bundle).resolve())})
        try:
            recovered.compose("up", "-d", "--wait", "--wait-timeout", "180", "postgres")
            database = Database(recovered.healthy("postgres")["Id"])
            database.check_version()
            database.restore(content / "database.dump")
            check_inventory(manifest["inventory"], database.inventory())
            write_json(recovered.config.recovery, {"phase": "restored-awaiting-activation",
                       "backup": str(Path(bundle).resolve()), "image": app_image,
                       "inventory": manifest["inventory"], "requires_objects": manifest.get("objects_included", False)})
        except BaseException as error:
            try:
                recovered.compose("stop", "--timeout", "60", "kaneo")
            except OpsError:
                pass
            raise OpsError("Restore failed; NEW target remains in maintenance. Original deployment was not changed") from error
    print(f"Database restored and verified at {target}; application remains stopped. Review config/ops.restore.example.json and explicitly activate before switching the reverse proxy")
