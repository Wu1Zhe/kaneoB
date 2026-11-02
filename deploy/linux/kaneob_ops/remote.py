import json
import shlex
import time
from pathlib import Path

from .archive import check_checksum
from .config import OpsError
from .runtime import run, write_json


def sync_file(config, file, subdirectory=""):
    file = Path(file)
    Path(str(file) + ".synced.json").unlink(missing_ok=True)
    check_checksum(file)
    remote = config.remote
    for key in ("ssh_key", "known_hosts"):
        if not Path(remote[key]).is_file():
            raise OpsError(f"Configure remote.{key} before backing up")
    if Path(remote["ssh_key"]).stat().st_mode & 0o077:
        raise OpsError("SSH private key must not be group/world readable")
    ssh = ["ssh", "-i", remote["ssh_key"], "-p", str(remote.get("port", 22)),
           "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "IdentitiesOnly=yes",
           "-o", "ConnectTimeout=15", "-o", f"UserKnownHostsFile={remote['known_hosts']}"]
    directory = remote["directory"].rstrip("/") + ("/images" if subdirectory == "images" else "")
    quoted = shlex.quote(directory)
    run([*ssh, remote["host"], f"umask 077; mkdir -p -- {quoted} && chmod 700 -- {quoted}"], timeout=config.timeout)
    run(["rsync", "--archive", "--checksum", "--protect-args", "--delay-updates", "--timeout=120",
         "--chmod=F600,D700", "-e", shlex.join(ssh), str(file), str(file) + ".sha256",
         remote["host"] + ":" + directory + "/"], timeout=config.timeout)
    # A successful transport alone is insufficient: verify the remote bytes and flush them.
    checksum = shlex.quote(file.name + ".sha256")
    name = shlex.quote("./" + file.name)
    complete = shlex.quote(file.name + ".complete")
    run([*ssh, remote["host"], f"cd {quoted} && sha256sum --check --status {checksum} && sync -f {name} && touch -- {complete} && sync -f ."], timeout=config.timeout)
    write_json(str(file) + ".synced.json", {"verified_at": time.time(), "host": remote["host"], "directory": directory})


def prune(config):
    protected = set()
    release = config.state / "release.json"
    if release.exists():
        protected.add(json.loads(release.read_text()).get("backup"))
    complete = sorted(config.backups.glob("kaneob-*.tar.age"), key=lambda f: f.stat().st_mtime)
    if complete:
        protected.add(str(complete[-1]))
    cutoff = time.time() - config.retention_days * 86400
    for file in complete:
        if file.is_symlink() or file.parent.resolve() != config.backups.resolve() or str(file) in protected:
            continue
        marker = Path(str(file) + ".synced.json")
        if file.stat().st_mtime < cutoff and marker.is_file():
            for path in (file, Path(str(file) + ".sha256"), marker):
                path.unlink(missing_ok=True)
