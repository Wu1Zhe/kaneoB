import datetime
import shutil
import tempfile
import uuid
from pathlib import Path

from .archive import copy_tree, image_metadata, pack, regular_files
from .config import OpsError
from .database import Database, verify_dump
from .remote import prune, sync_file
from .runtime import run, write_json


def create_backup(runtime):
    config = runtime.config
    settings = runtime.preflight()
    postgres = runtime.healthy("postgres")
    app = runtime.container("kaneo")
    database = Database(postgres["Id"])
    database.check_version()
    size = int(database.query("SELECT pg_database_size(current_database())"))
    app_details = runtime.image(app["Image"])
    image_space = 0 if app_details.get("RepoDigests") else int(app_details.get("Size", 0)) * 2
    if shutil.disk_usage(config.backups).free < size * 2 + image_space + 1024 ** 3:
        raise OpsError("Not enough backup filesystem space for staging and a safety reserve")
    now = datetime.datetime.now(datetime.timezone.utc)
    name = "kaneob-" + now.strftime("%Y%m%dT%H%M%SZ-") + uuid.uuid4().hex[:12] + ".tar.age"
    result = config.backups / name
    with tempfile.TemporaryDirectory(prefix=".backup-", dir=config.backups) as temporary:
        content = Path(temporary) / "content"
        content.mkdir(mode=0o700)
        with database.snapshot() as snapshot:
            database.dump(content / "database.dump", snapshot)
            inventory = database.inventory(snapshot)
        # Restore the entire archive, not just its table-of-contents, before publication.
        verify_dump(content / "database.dump", inventory, postgres["Image"])
        files = content / "config"
        files.mkdir(mode=0o700)
        for source, destination in ((".env", ".env"), ("compose.yml", "compose.yml"), ("config/gateway.conf", "gateway.conf")):
            shutil.copyfile(config.root / source, files / destination)
        write_json(files / "ops.json", {"root": str(config.root), "data_mount": str(config.data_mount),
                   "project": config.project, "age_recipient": config.recipient, "remote": config.remote,
                   "retention_days": config.retention_days, "timeout_seconds": config.timeout,
                   "object_backup_command": list(config.object_backup_command)})
        copy_tree(config.root / "api-data", content / "api-data")
        if config.object_backup_command:
            objects = content / "objects"
            objects.mkdir(mode=0o700)
            command = [value.replace("{destination}", str(objects)) for value in config.object_backup_command]
            run(command, timeout=config.timeout)
            list(regular_files(objects))
        app_image = image_metadata(runtime, app, config.backups)
        pg_image = runtime.image(postgres["Image"])
        manifest = {"format": 1, "created_at": now.isoformat(), "project": config.project,
                    "postgres_image_id": postgres["Image"], "postgres_image_reference": postgres["Config"]["Image"],
                    "postgres_image_digest": next(iter(pg_image.get("RepoDigests", [])), None),
                    "app_image": app_image, "inventory": inventory,
                    "objects_included": bool(config.object_backup_command),
                    "s3_enabled": bool(settings["services"]["kaneo"].get("environment", {}).get("S3_ENDPOINT"))}
        write_json(content / "manifest.json", manifest)
        pack(content, result, config.recipient)
    if app_image.get("archive"):
        sync_file(config, config.backups / app_image["archive"], "images")
    sync_file(config, result)
    prune(config)
    return result, manifest


def backup(runtime):
    if runtime.config.recovery.exists():
        raise OpsError("An interrupted upgrade needs recovery; refusing to label its data as a normal backup")
    result, _ = create_backup(runtime)
    print(f"Backup restored in isolation, encrypted and verified off-site: {result}")
    return result
