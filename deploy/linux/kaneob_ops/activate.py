import datetime
import json
from urllib.parse import urlparse

from .config import OpsError
from .database import Database, check_inventory
from .runtime import update_env, write_json


def activate(runtime, url, objects_restored=False):
    config = runtime.config
    if not config.recovery.exists() or not config.maintenance.exists():
        raise OpsError("Activation requires a restored deployment still in maintenance")
    pending = json.loads(config.recovery.read_text())
    if pending.get("phase") != "restored-awaiting-activation":
        raise OpsError("This recovery state cannot be activated; restore to a new directory again")
    if pending.get("requires_objects") and not objects_restored:
        raise OpsError("Restore external objects to a new bucket and pass --objects-restored after reviewing its credentials")
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or any(char.isspace() for char in url):
        raise OpsError("Use the intended public http(s) site URL without credentials or query")
    url = url.rstrip("/")
    update_env(config.root / ".env", {"KANEO_CLIENT_URL": url, "KANEO_API_URL": url + "/api", "CORS_ORIGINS": url})
    # Activation is an explicit promotion: only now may background jobs run.
    pending["phase"] = "activation-may-have-started"
    write_json(config.recovery, pending)
    try:
        runtime.compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "120", "gateway")
        runtime.check_gate(True)
        settings = runtime.preflight(allow_uncreated_application=True)
        environment = settings["services"]["kaneo"].get("environment", {})
        if pending.get("requires_objects") and not (environment.get("S3_ENDPOINT") and environment.get("S3_BUCKET")):
            raise OpsError("Configure the restored bucket before activating attachments")
        database = Database(runtime.healthy("postgres")["Id"])
        database.check_version()
        runtime.compose("up", "-d", "--no-deps", "--wait", "--wait-timeout", "240", "kaneo")
        runtime.preflight()
        current = runtime.healthy("kaneo")
        if current["Image"] != pending["image"]:
            raise OpsError("Activation must use the exact backed-up application image")
        check_inventory(pending["inventory"], database.inventory(), core_only=True)
        runtime.check_gate(True)
        write_json(config.state / "release.json", {"image": current["Image"], "restored_from": pending["backup"],
                   "activated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
        config.recovery.unlink()
        config.maintenance.unlink()
        print("Restored application activated; direct the intended reverse proxy to this deployment and enable its backups")
    except BaseException as error:
        try:
            runtime.compose("stop", "--timeout", "60", "kaneo")
        except OpsError:
            pass
        raise OpsError("Activation failed; application stopped and maintenance retained. Original deployment is untouched") from error
