import contextlib
import hashlib
import json
import os
import shutil
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

from .config import OpsError
from .runtime import run, write_atomic


def sha256(file):
    digest = hashlib.sha256()
    with Path(file).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_checksum(file):
    write_atomic(str(file) + ".sha256", f"{sha256(file)}  {Path(file).name}\n")


def check_checksum(file):
    file = Path(file)
    if not file.is_file() or file.is_symlink():
        raise OpsError("Backup must be a regular file")
    sidecar = Path(str(file) + ".sha256")
    if sidecar.is_symlink():
        raise OpsError("Backup checksum must be a regular file")
    if sidecar.read_text().strip() != f"{sha256(file)}  {file.name}":
        raise OpsError("Backup checksum verification failed")


def encrypt(source, target, recipient):
    temporary = Path(str(target) + ".part")
    try:
        run(["age", "--encrypt", "--recipient", recipient, "--output", temporary, source])
        with temporary.open("rb") as stream:
            os.fsync(stream.fileno())
        os.replace(temporary, target)
        write_checksum(target)
    finally:
        temporary.unlink(missing_ok=True)


def image_metadata(runtime, container, directory):
    image = runtime.image(container["Image"])
    metadata = {"id": image["Id"], "reference": container["Config"]["Image"],
                "digest": next(iter(image.get("RepoDigests", [])), None)}
    if not metadata["digest"]:
        images = directory / "images"
        images.mkdir(mode=0o700, exist_ok=True)
        key = hashlib.sha256(runtime.config.recipient.encode()).hexdigest()[:12]
        name = f"image-{image['Id'].split(':')[-1]}-{key}.tar.age"
        file = images / name
        if not file.exists():
            with tempfile.TemporaryDirectory(prefix=".image-", dir=directory) as temporary:
                tar = Path(temporary) / "image.tar"
                with tar.open("wb") as output:
                    run(["docker", "image", "save", image["Id"]], output_file=output)
                encrypt(tar, file, runtime.config.recipient)
        check_checksum(file)
        metadata["archive"] = "images/" + name
    return metadata


def regular_files(directory):
    for file in sorted(Path(directory).rglob("*")):
        if file.is_symlink() or not (file.is_dir() or file.is_file()):
            raise OpsError("Backup content must contain only regular files and directories")
        if file.is_file():
            yield file


def copy_tree(source, destination):
    source = Path(source)
    if source.is_symlink():
        raise OpsError("Symlinked backup directories are not supported")
    list(regular_files(source))
    shutil.copytree(source, destination, symlinks=True)


def pack(content, target, recipient):
    files = [file for file in regular_files(content) if file != content / "SHA256SUMS"]
    checksums = {str(file.relative_to(content)): sha256(file) for file in files}
    write_atomic(content / "SHA256SUMS", json.dumps(checksums, sort_keys=True) + "\n")
    tar = content.parent / "bundle.tar"
    with tarfile.open(tar, "w") as archive:
        for file in sorted(content.rglob("*")):
            archive.add(file, arcname=str(file.relative_to(content)), recursive=False)
    encrypt(tar, target, recipient)


def safe_extract(tar, directory):
    allowed = {"database.dump", "manifest.json", "SHA256SUMS", "config", "api-data", "objects"}
    seen = set()
    with tarfile.open(tar, "r:") as archive:
        for member in archive:
            name = PurePosixPath(member.name)
            if name.is_absolute() or not name.parts or ".." in name.parts or name.parts[0] not in allowed or name in seen or not (member.isfile() or member.isdir()):
                raise OpsError("Unsafe or unexpected member in backup archive")
            seen.add(name)
            target = directory.joinpath(*name.parts)
            target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            if member.isdir():
                target.mkdir(mode=0o700, exist_ok=True)
            else:
                with archive.extractfile(member) as source, target.open("xb") as output:
                    os.chmod(target, 0o600)
                    shutil.copyfileobj(source, output)
    expected = json.loads((directory / "SHA256SUMS").read_text())
    actual = {str(file.relative_to(directory)): sha256(file) for file in regular_files(directory) if file != directory / "SHA256SUMS"}
    if expected != actual:
        raise OpsError("Backup contents differ from their checksums")
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest.get("format") != 1 or not (directory / "database.dump").is_file():
        raise OpsError("Unsupported or incomplete backup format")
    return manifest


@contextlib.contextmanager
def unpack(file, identity):
    file = Path(file).resolve(strict=True)
    check_checksum(file)
    with tempfile.TemporaryDirectory(prefix="kaneob-restore-") as temporary:
        stage = Path(temporary)
        tar = stage / "bundle.tar"
        run(["age", "--decrypt", "--identity", identity, "--output", tar, file])
        content = stage / "content"
        content.mkdir(mode=0o700)
        yield content, safe_extract(tar, content)
