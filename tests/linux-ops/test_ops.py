import dataclasses
import importlib
import io
import json
import os
import socket
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "deploy/linux"))
from kaneob_ops.archive import check_checksum, safe_extract, unpack, write_checksum
from kaneob_ops.activate import activate
from kaneob_ops.backup import create_backup
from kaneob_ops.config import Config, OpsError
from kaneob_ops.database import Database, verify_dump, verification_database
from kaneob_ops.remote import prune, sync_file
from kaneob_ops.restore import restore
from kaneob_ops.runtime import Runtime, operation_lock, run, write_json
from kaneob_ops.upgrade import upgrade
from main import initialize

OLD = "sha256:" + "1" * 64
NEW = "sha256:" + "2" * 64
INVENTORY = {"public.task": {"rows": 1, "ids": "kept"}}


def deployment(root):
    root.mkdir()
    for name in ("postgres", "runtime", "api-data", "backups", "state/gateway", "config"):
        (root / name).mkdir(parents=True, exist_ok=True)
    (root / ".env").write_text("KANEO_IMAGE=" + OLD + "\nAUTH_SECRET=synthetic-test-secret\n")
    os.chmod(root / ".env", 0o600)
    (root / "compose.yml").write_text("name: isolated-test\n")
    (root / "config/gateway.conf").write_text("# synthetic test configuration\n")
    return Config(root, Path("/"), "ops-test", "age1" + "a" * 58,
                  {"host": "backup@example.invalid", "directory": "/backups", "ssh_key": "/key", "known_hosts": "/hosts"})


class FakeRelease:
    def __init__(self, config):
        self.config = config
        self.current = OLD
        self.calls = []
        self.fail_start = False
        self.fail_resume = False

    def preflight(self, **kwargs):
        return {"services": {"kaneo": {"environment": {}}}}

    def container(self, service):
        return {"Id": service, "Image": self.current if service == "kaneo" else OLD, "Config": {"Image": "test:old"}}

    def healthy(self, service):
        return self.container(service)

    def image(self, reference, pull=False):
        return {"Id": NEW if reference == "test:new" else reference}

    def check_gate(self, maintenance):
        if self.config.maintenance.exists() != maintenance:
            raise AssertionError("Unexpected public access state")

    def compose(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        if args[0] == "up":
            self.assert_closed()
            target = kwargs.get("extra_env", {}).get("KANEO_IMAGE", NEW)
            self.current = target
            if (target == NEW and self.fail_start) or (target == OLD and self.fail_resume):
                raise OpsError("synthetic start failure")

    def assert_closed(self):
        if not self.config.maintenance.exists():
            raise AssertionError("Application started before the public gateway was closed")


class OperationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "deployment"
        self.config = deployment(self.root)
        self.runtime = FakeRelease(self.config)

    def test_backup_and_sync_failure_never_start_new_image(self):
        for reason in ("dump failed", "restore verification failed", "off-site checksum failed"):
            with self.subTest(reason=reason):
                original = (self.root / ".env").read_bytes()
                with patch("kaneob_ops.upgrade.create_backup", side_effect=OpsError(reason)):
                    with self.assertRaisesRegex(OpsError, "upgrade aborted"):
                        upgrade(self.runtime, "test:new")
                self.assertEqual((self.root / ".env").read_bytes(), original)
                self.assertEqual(self.runtime.current, OLD)
                self.assertFalse(self.config.recovery.exists())
                self.assertFalse(self.config.maintenance.exists())
                self.assertTrue(all(call[1].get("extra_env", {}).get("KANEO_IMAGE") == OLD for call in self.runtime.calls if call[0][0] == "up"))

    def test_backup_failure_keeps_maintenance_if_old_image_cannot_resume(self):
        self.runtime.fail_resume = True
        with patch("kaneob_ops.upgrade.create_backup", side_effect=OpsError("dump failed")):
            with self.assertRaisesRegex(OpsError, "could not resume"):
                upgrade(self.runtime, "test:new")
        self.assertTrue(self.config.recovery.exists())
        self.assertTrue(self.config.maintenance.exists())

    def test_migration_failure_keeps_gate_closed_without_blind_rollback(self):
        self.runtime.fail_start = True
        with patch("kaneob_ops.upgrade.create_backup", return_value=(Path("/verified.age"), {"inventory": INVENTORY})):
            with self.assertRaisesRegex(OpsError, "maintenance remains"):
                upgrade(self.runtime, "test:new")
        self.assertEqual(json.loads(self.config.recovery.read_text())["backup"], "/verified.age")
        self.assertTrue(self.config.maintenance.exists())
        self.assertEqual([call[0][0] for call in self.runtime.calls], ["stop", "up", "stop"])

    def test_lost_core_record_blocks_public_access(self):
        with patch("kaneob_ops.upgrade.create_backup", return_value=(Path("/verified.age"), {"inventory": INVENTORY})), patch("kaneob_ops.upgrade.Database") as database:
            database.return_value.inventory.return_value = {}
            with self.assertRaises(OpsError):
                upgrade(self.runtime, "test:new")
        self.assertTrue(self.config.maintenance.exists())
        self.assertTrue(self.config.recovery.exists())

    def test_success_opens_gate_only_after_verification(self):
        with patch("kaneob_ops.upgrade.create_backup", return_value=(Path("/verified.age"), {"inventory": INVENTORY})), patch("kaneob_ops.upgrade.Database") as database:
            database.return_value.inventory.side_effect = lambda: self.assertTrue(self.config.maintenance.exists()) or INVENTORY
            upgrade(self.runtime, "test:new")
        self.assertFalse(self.config.maintenance.exists())
        self.assertFalse(self.config.recovery.exists())
        self.assertEqual(json.loads((self.config.state / "release.json").read_text())["image"], NEW)

    def test_existing_recovery_marker_blocks_another_upgrade(self):
        write_json(self.config.recovery, {"phase": "interrupted"})
        with self.assertRaises(OpsError):
            upgrade(self.runtime, "test:new")
        self.assertEqual(self.runtime.calls, [])

    def test_activation_rejects_unrestored_objects_and_keeps_failed_promotions_closed(self):
        self.config.maintenance.write_text("maintenance")
        write_json(self.config.recovery, {"phase": "restored-awaiting-activation", "requires_objects": True})
        with self.assertRaisesRegex(OpsError, "external objects"):
            activate(self.runtime, "https://restored.example.com")
        self.assertEqual(self.runtime.calls, [])
        write_json(self.config.recovery, {"phase": "restored-awaiting-activation", "image": OLD, "backup": "/verified.age", "inventory": INVENTORY})
        self.runtime.fail_start = True
        with self.assertRaisesRegex(OpsError, "Activation failed"):
            activate(self.runtime, "https://restored.example.com")
        self.assertTrue(self.config.maintenance.exists())
        self.assertTrue(self.config.recovery.exists())

    def test_lock_prevents_overlapping_backup_and_upgrade(self):
        with operation_lock(self.config):
            with self.assertRaisesRegex(OpsError, "Another"):
                with operation_lock(self.config):
                    self.fail("A second operation acquired the lock")

    def test_retention_keeps_unsynced_and_upgrade_recovery_archives(self):
        for name in ("expired", "unsynced", "protected", "newest"):
            file = self.config.backups / f"kaneob-{name}.tar.age"
            file.write_bytes(b"synthetic encrypted data")
            write_checksum(file)
            if name != "unsynced":
                write_json(str(file) + ".synced.json", {})
            if name != "newest":
                os.utime(file, (1, 1))
        protected = self.config.backups / "kaneob-protected.tar.age"
        write_json(self.config.state / "release.json", {"backup": str(protected)})
        prune(self.config)
        self.assertFalse((self.config.backups / "kaneob-expired.tar.age").exists())
        for name in ("unsynced", "protected", "newest"):
            self.assertTrue((self.config.backups / f"kaneob-{name}.tar.age").exists())

    def test_archive_rejects_traversal_symlink_and_duplicate_files(self):
        for kind in ("traversal", "symlink", "duplicate"):
            with self.subTest(kind=kind):
                tar = self.root / f"{kind}.tar"
                with tarfile.open(tar, "w") as archive:
                    entry = tarfile.TarInfo("../outside" if kind == "traversal" else "config/value")
                    if kind == "symlink":
                        entry.type = tarfile.SYMTYPE
                        entry.linkname = "/etc/passwd"
                    archive.addfile(entry, io.BytesIO())
                    if kind == "duplicate":
                        archive.addfile(entry, io.BytesIO())
                output = self.root / kind
                output.mkdir()
                with self.assertRaises(OpsError):
                    safe_extract(tar, output)

    def test_config_rejects_shell_injection_and_invalid_mount_paths(self):
        data = {"root": str(self.root), "data_mount": "/", "project": "ops-test", "age_recipient": self.config.recipient, "remote": self.config.remote}
        for key, value in (("host", "backup@host;touch /tmp/oops"), ("host", "-Fconfig@host"), ("directory", "/backup/../etc")):
            bad = {**data, "remote": {**self.config.remote, key: value}}
            file = self.root / "bad.json"
            file.write_text(json.dumps(bad))
            with self.assertRaises(OpsError):
                Config.load(file)

    def test_preflight_rejects_external_database_missing_objects_and_wrong_running_mounts(self):
        local_context = patch.dict(os.environ, {"DOCKER_HOST": "unix:///test-fixture", "DOCKER_CONTEXT": ""})
        local_context.start()
        self.addCleanup(local_context.stop)
        runtime = Runtime(self.config)
        expected = {"postgres": {"/var/lib/postgresql/data": "postgres"},
                    "kaneo": {"/var/lib/kaneo": "runtime", "/app/apps/api/data": "api-data"},
                    "gateway": {"/maintenance": "state/gateway", "/etc/nginx/conf.d/default.conf": "config/gateway.conf"}}
        settings = {"services": {name: {"volumes": [{"source": str(self.root / source), "target": target, "type": "bind"} for target, source in targets.items()]} for name, targets in expected.items()}}
        settings["services"]["kaneo"]["environment"] = {"AUTH_SECRET": "synthetic-test-secret"}
        settings["services"]["postgres"]["environment"] = {"POSTGRES_DB": "kaneo", "POSTGRES_USER": "kaneo"}
        containers = {name: {"Mounts": [{"Source": str(self.root / source), "Destination": target, "Type": "bind"} for target, source in targets.items()]} for name, targets in expected.items()}
        containers["postgres"]["Config"] = {"Env": ["POSTGRES_DB=kaneo", "POSTGRES_USER=kaneo"]}
        runtime.compose = lambda *args: json.dumps(settings).encode()
        runtime.container = lambda service: containers[service]
        self.assertEqual(runtime.preflight(), settings)
        with patch.dict(os.environ, {"DOCKER_HOST": "tcp://remote.invalid:2375"}):
            with self.assertRaisesRegex(OpsError, "local Linux Docker"):
                runtime.preflight()
        environment = settings["services"]["kaneo"]["environment"]
        for key, value in (("DATABASE_URL", "postgresql://external.invalid/kaneo"), ("S3_ENDPOINT", "https://objects.invalid"), ("AUTH_SECRET_FILE", "/not-included")):
            environment[key] = value
            with self.assertRaises(OpsError):
                runtime.preflight()
            del environment[key]
        containers["postgres"]["Mounts"][0]["Source"] = "/an/unrelated/database"
        with self.assertRaises(OpsError):
            runtime.preflight()

    def test_linux_compose_keeps_data_external_and_has_only_one_public_entry(self):
        (self.root / ".env").write_text(f"KANEO_ROOT={self.root}\nKANEO_IMAGE=test:fixture\nPOSTGRES_DB=kaneo\nPOSTGRES_USER=kaneo\nPOSTGRES_PASSWORD=synthetic-only\nAUTH_SECRET=synthetic-only\n")
        template = Path(__file__).resolve().parents[2] / "deploy/linux/compose.yml"
        rendered = json.loads(run(["docker", "compose", "--env-file", self.root / ".env", "-f", template, "config", "--format", "json"]))
        self.assertEqual(set(rendered["services"]), {"kaneo", "postgres", "gateway"})
        for name in ("kaneo", "postgres"):
            self.assertFalse(rendered["services"][name].get("ports"))
        self.assertEqual(rendered["services"]["gateway"]["ports"][0]["host_ip"], "127.0.0.1")
        for service in rendered["services"].values():
            for volume in service.get("volumes", []):
                self.assertEqual(volume["type"], "bind")
                self.assertFalse(volume["bind"].get("create_host_path", False))

    def test_gateway_probe_handles_wget_error_diagnostic_without_bypassing_maintenance(self):
        runtime = Runtime(self.config)
        runtime.container = lambda service: {"Id": "synthetic-gateway"}
        diagnostic = b'  HTTP/1.1 503 Service Temporarily Unavailable\nwget: server returned error: HTTP/1.1 503 Service Temporarily Unavailable\n'
        with patch("kaneob_ops.runtime.run", return_value=diagnostic):
            runtime.check_gate(True)
            with self.assertRaises(OpsError):
                runtime.check_gate(False)
        with patch("kaneob_ops.runtime.run", return_value=b"HTTP/1.1 200 OK\n"):
            with self.assertRaises(OpsError):
                runtime.check_gate(True)

    def test_initialization_sets_linux_permissions_and_never_replaces_existing_secrets(self):
        root = self.root.parent / "fresh"
        config = dataclasses.replace(self.config, root=root)
        initialize(config, "test:commit", "https://projects.example.com", 5173)
        original = (root / ".env").read_bytes()
        self.assertEqual((root / ".env").stat().st_mode & 0o777, 0o600)
        self.assertEqual((root / "runtime").stat().st_uid, 1001)
        self.assertEqual((root / "state/gateway").stat().st_mode & 0o777, 0o755)
        self.assertIn("name: ops-test", (root / "compose.yml").read_text())
        with self.assertRaises(OpsError):
            initialize(config, "test:new", "https://projects.example.com", 5173)
        self.assertEqual(original, (root / ".env").read_bytes())


@unittest.skipUnless(os.environ.get("KANEO_OPS_INTEGRATION") == "1", "needs disposable Docker and Linux tools")
class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="kaneob-ops-tests-")
        cls.base = Path(cls.temporary.name)
        cls.pg_image = json.loads(run(["docker", "image", "inspect", "postgres:16-alpine"]))[0]["Id"]
        cls.identity = cls.base / "identity"
        run(["age-keygen", "-o", cls.identity])
        cls.recipient = run(["age-keygen", "-y", cls.identity]).decode().strip()
        cls.key = cls.base / "ssh-key"
        host_key = cls.base / "host-key"
        for key in (cls.key, host_key):
            run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", key])
        authorized = cls.base / "authorized_keys"
        authorized.write_bytes(Path(str(cls.key) + ".pub").read_bytes())
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
        cls.hosts = cls.base / "known_hosts"
        cls.hosts.write_text(f"[127.0.0.1]:{cls.port} " + Path(str(host_key) + ".pub").read_text())
        sshd_config = cls.base / "sshd_config"
        sshd_config.write_text(f"Port {cls.port}\nListenAddress 127.0.0.1\nHostKey {host_key}\nPidFile {cls.base}/sshd.pid\nAuthorizedKeysFile {authorized}\nStrictModes no\nPermitRootLogin prohibit-password\nPasswordAuthentication no\nUsePAM no\nLogLevel ERROR\n")
        Path("/run/sshd").mkdir(exist_ok=True)
        cls.sshd = subprocess.Popen(["/usr/sbin/sshd", "-D", "-e", "-f", str(sshd_config)], stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                with socket.create_connection(("127.0.0.1", cls.port), timeout=0.1):
                    break
            except OSError:
                time.sleep(0.1)
        cls.image_tag = "kaneob-ops-fixture:" + cls.base.name
        process = subprocess.run(["docker", "build", "--quiet", "-t", cls.image_tag, "-"], input=b'FROM scratch\nLABEL purpose="synthetic-ops-test"\nCMD ["/unused"]\n', stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode:
            raise RuntimeError("Could not build the synthetic application image")
        cls.app_image = json.loads(run(["docker", "image", "inspect", cls.image_tag]))[0]

    @classmethod
    def tearDownClass(cls):
        cls.sshd.terminate()
        cls.sshd.wait(timeout=10)
        run(["docker", "image", "rm", cls.image_tag])
        cls.temporary.cleanup()

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(dir=self.base)
        self.addCleanup(self.directory.cleanup)
        self.config = deployment(Path(self.directory.name) / "deployment")
        self.config.recipient = self.recipient
        self.config.remote = {"host": "root@127.0.0.1", "port": self.port, "directory": str(Path(self.directory.name) / "remote"), "ssh_key": str(self.key), "known_hosts": str(self.hosts)}

    def seed(self, database):
        database.query("CREATE TABLE public.task(id text PRIMARY KEY, title text); INSERT INTO public.task VALUES ('one','synthetic data only'); CREATE SCHEMA drizzle; CREATE TABLE drizzle.migrations(id integer); INSERT INTO drizzle.migrations VALUES (1)")

    def test_consistent_snapshot_survives_concurrent_writes_and_really_restores(self):
        with verification_database(self.pg_image) as database:
            self.seed(database)
            dump = self.config.root / "snapshot.dump"
            with database.snapshot() as snapshot:
                expected = database.inventory(snapshot)
                database.query("INSERT INTO task VALUES ('two','concurrent synthetic write')")
                database.dump(dump, snapshot)
                self.assertEqual(database.inventory(snapshot), expected)
            self.assertEqual(database.inventory()["public.task"]["rows"], 2)
            verify_dump(dump, expected, self.pg_image)
            dump.write_bytes(dump.read_bytes()[:50])
            with self.assertRaises(OpsError):
                verify_dump(dump, expected, self.pg_image)

    def test_real_encryption_strict_ssh_sync_and_remote_corruption_detection(self):
        file = self.config.backups / "kaneob-sync.tar.age"
        file.write_bytes(b"synthetic encrypted payload for transport test")
        write_checksum(file)
        sync_file(self.config, file)
        marker = Path(str(file) + ".synced.json")
        self.assertTrue(marker.exists())
        marker.unlink()
        remote_module = importlib.import_module("kaneob_ops.remote")
        def corrupt_after_transport(args, **kwargs):
            output = run(args, **kwargs)
            if args[0] == "rsync":
                (Path(self.config.remote["directory"]) / file.name).write_bytes(b"corrupted remotely")
            return output
        with patch.object(remote_module, "run", side_effect=corrupt_after_transport):
            with self.assertRaises(OpsError):
                sync_file(self.config, file)
        self.assertFalse(marker.exists())

    def test_complete_backup_restores_database_encrypts_secrets_and_saves_local_image(self):
        with verification_database(self.pg_image) as database:
            self.seed(database)
            pg = json.loads(run(["docker", "inspect", database.container]))[0]
            runtime = FakeRelease(self.config)
            runtime.container = lambda service: pg if service == "postgres" else {"Image": self.app_image["Id"], "Config": {"Image": self.image_tag}}
            runtime.healthy = runtime.container
            runtime.image = lambda reference: json.loads(run(["docker", "image", "inspect", reference]))[0]
            # Use the synthetic database's explicit credentials in this isolated fixture.
            with patch("kaneob_ops.backup.Database", side_effect=lambda container: Database(container, "verify", "verify")):
                bundle, manifest = create_backup(runtime)
            self.assertIn("archive", manifest["app_image"])
            self.assertTrue(Path(str(bundle) + ".synced.json").exists())
            self.assertNotIn(b"synthetic-test-secret", bundle.read_bytes())
            with unpack(bundle, self.identity) as (content, data):
                self.assertTrue((content / "api-data").is_dir())
                self.assertIn("synthetic-test-secret", (content / "config/.env").read_text())
                verify_dump(content / "database.dump", data["inventory"], self.pg_image)
            original_env = (self.config.root / ".env").read_bytes()
            with verification_database(self.pg_image) as recovered_database:
                postgres = json.loads(run(["docker", "inspect", recovered_database.container]))[0]
                calls = []
                class RecoveredRuntime:
                    def __init__(self, config):
                        self.config = config
                    def compose(self, *args, **kwargs):
                        calls.append(args)
                        if args[0] == "up" and "kaneo" in args:
                            self_assert = self.config.maintenance.exists()
                            if not self_assert:
                                raise AssertionError("Restored application started without maintenance")
                    def healthy(self, service):
                        return postgres if service == "postgres" else {"Image": manifest["app_image"]["id"]}
                    def preflight(self, **kwargs):
                        return {"services": {"kaneo": {"environment": {}}}}
                    def check_gate(self, maintenance):
                        if self.config.maintenance.exists() != maintenance:
                            raise AssertionError("Recovered gate state differs")
                target = Path(self.directory.name) / "restored"
                with patch("kaneob_ops.restore.Runtime", RecoveredRuntime):
                    restore(runtime, bundle, self.identity, target, "ops-restored", 15173)
                self.assertEqual(recovered_database.inventory(), database.inventory())
                self.assertTrue((target / "state/gateway/maintenance").exists())
                self.assertEqual(len(calls), 1, "Restore must not start copied background jobs")
                self.assertIn(str(target), (target / ".env").read_text())
                self.assertIn("KANEO_PORT=15173", (target / ".env").read_text())
                self.assertIn("name: ops-restored", (target / "compose.yml").read_text())
                self.assertEqual((self.config.root / ".env").read_bytes(), original_env)
                self.assertEqual(calls[0][-1], "postgres")
                promoted = RecoveredRuntime(dataclasses.replace(self.config, root=target, project="ops-restored"))
                activate(promoted, "https://restored.example.com")
                self.assertFalse((target / "state/gateway/maintenance").exists())
                self.assertIn("KANEO_API_URL=https://restored.example.com/api", (target / ".env").read_text())
            with patch("kaneob_ops.backup.Database", side_effect=lambda container: Database(container, "verify", "verify")), patch("kaneob_ops.backup.sync_file", side_effect=OpsError("synthetic off-site outage")):
                with self.assertRaises(OpsError):
                    create_backup(runtime)
            self.assertEqual(len(list(self.config.backups.glob("kaneob-*.tar.age"))), 2)
            self.assertEqual(list(self.config.backups.glob(".backup-*")), [])
            damaged = bytearray(bundle.read_bytes())
            damaged[-1] ^= 1
            bundle.write_bytes(damaged)
            with self.assertRaises(OpsError):
                check_checksum(bundle)


if __name__ == "__main__":
    unittest.main(verbosity=2)
