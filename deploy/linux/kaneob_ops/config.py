import json
import os
import re
from dataclasses import dataclass
from pathlib import Path


class OpsError(Exception):
    pass


@dataclass
class Config:
    root: Path
    data_mount: Path
    project: str
    recipient: str
    remote: dict
    retention_days: int = 30
    timeout: int = 3600
    object_backup_command: tuple = ()

    @property
    def backups(self):
        return self.root / "backups"

    @property
    def state(self):
        return self.root / "state"

    @property
    def maintenance(self):
        return self.state / "gateway" / "maintenance"

    @property
    def recovery(self):
        return self.state / "recovery-required.json"

    @classmethod
    def load(cls, file):
        path = Path(file)
        if path.stat().st_mode & 0o022:
            raise OpsError("The operations config must not be group/world writable")
        data = json.loads(path.read_text())
        root = Path(data["root"])
        mount = Path(data["data_mount"])
        if not root.is_absolute() or root.resolve() != root or len(root.parts) < 3:
            raise OpsError("root must be a canonical absolute dedicated deployment path")
        if not mount.is_absolute() or mount.resolve() != mount:
            raise OpsError("data_mount must be a canonical absolute path")
        if not root.is_relative_to(mount):
            raise OpsError("root must be inside data_mount")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,60}", data["project"]):
            raise OpsError("Invalid Compose project name")
        if not re.fullmatch(r"age1[0-9a-z]{50,100}", data["age_recipient"]):
            raise OpsError("Configure a real age public recipient")
        remote = data["remote"]
        if not re.fullmatch(r"(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9][A-Za-z0-9.-]*", remote["host"]):
            raise OpsError("remote.host must be an SSH hostname or user@hostname")
        directory = remote["directory"]
        if not re.fullmatch(r"/[A-Za-z0-9_./-]+", directory) or ".." in Path(directory).parts or directory == "/":
            raise OpsError("remote.directory must be a dedicated absolute path without spaces")
        for key in ("ssh_key", "known_hosts"):
            if not Path(remote[key]).is_absolute():
                raise OpsError(f"remote.{key} must be absolute")
        if not 1 <= int(remote.get("port", 22)) <= 65535:
            raise OpsError("Invalid SSH port")
        retention = int(data.get("retention_days", 30))
        timeout = int(data.get("timeout_seconds", 3600))
        if not 1 <= retention <= 3650 or not 60 <= timeout <= 86400:
            raise OpsError("Invalid retention or timeout")
        hook = data.get("object_backup_command", [])
        if not isinstance(hook, list) or any(not isinstance(v, str) for v in hook):
            raise OpsError("object_backup_command must be an argv array")
        if hook and (not Path(hook[0]).is_absolute() or not any("{destination}" in v for v in hook)):
            raise OpsError("Object backup command needs an absolute executable and {destination}")
        return cls(root, mount, data["project"], data["age_recipient"], remote, retention, timeout, tuple(hook))

    def check_mount(self):
        if not os.path.ismount(self.data_mount):
            raise OpsError("Configured data_mount is not mounted; refusing to use an empty filesystem")
