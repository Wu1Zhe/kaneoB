import datetime

from .backup import create_backup
from .config import OpsError
from .database import Database, check_inventory
from .runtime import update_env, write_atomic, write_json


def upgrade(runtime, reference):
    config = runtime.config
    if config.recovery.exists() or config.maintenance.exists():
        raise OpsError("Resolve the existing maintenance/recovery state before upgrading")
    runtime.preflight()
    old = runtime.healthy("kaneo")
    runtime.healthy("postgres")
    runtime.healthy("gateway")
    runtime.check_gate(False)
    target = runtime.image(reference, pull=True)["Id"]
    if target == old["Image"]:
        print("Requested image is already running; no upgrade performed")
        return
    stopped = False
    migration_started = False
    backup_file = None
    write_json(config.recovery, {"old_image": old["Image"], "new_image": target, "phase": "pre-backup"})
    write_atomic(config.maintenance, "Upgrade in progress\n", mode=0o644)
    try:
        runtime.check_gate(True)
        stopped = True
        runtime.compose("stop", "--timeout", "60", "kaneo")
        backup_file, manifest = create_backup(runtime)
        # Persist this before any command that can run a new schema migration.
        write_json(config.recovery, {"old_image": old["Image"], "new_image": target,
                                    "backup": str(backup_file), "phase": "migration-may-have-started"})
        migration_started = True
        update_env(config.root / ".env", {"KANEO_IMAGE": target})
        runtime.compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "240", "kaneo")
        current = runtime.healthy("kaneo")
        runtime.check_gate(True)
        if current["Image"] != target:
            raise OpsError("The requested immutable image did not start")
        actual = Database(runtime.healthy("postgres")["Id"]).inventory()
        check_inventory(manifest["inventory"], actual, core_only=True)
        write_json(config.state / "release.json", {"image": target, "reference": reference,
                   "previous_image": old["Image"], "backup": str(backup_file),
                   "finished_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
        config.recovery.unlink()
        config.maintenance.unlink()
        print(f"Upgrade verified and access reopened; recovery backup: {backup_file}")
    except BaseException as error:
        if migration_started:
            try:
                runtime.compose("stop", "--timeout", "60", "kaneo")
            except OpsError:
                pass
            raise OpsError(f"Upgrade halted; maintenance remains enabled. Restore to a NEW deployment using {backup_file}; do not restart an old image against an unverified migrated database") from error
        if stopped:
            try:
                runtime.compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "240", "kaneo",
                                extra_env={"KANEO_IMAGE": old["Image"]})
                resumed = runtime.healthy("kaneo")
                if resumed["Image"] != old["Image"]:
                    raise OpsError("Old image did not resume")
            except BaseException as resume_error:
                write_json(config.recovery, {"phase": "backup-failed-old-app-not-healthy", "old_image": old["Image"]})
                raise OpsError("Backup failed and the old application could not resume; maintenance remains enabled") from resume_error
        config.maintenance.unlink(missing_ok=True)
        config.recovery.unlink(missing_ok=True)
        raise OpsError("Backup or off-site verification failed; upgrade aborted and the original image resumed") from error
