#!/usr/bin/env python3
"""Prepare private local NVA samples without recording their source paths."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE_BYTES = 200 * 1024 * 1024
MAX_EXPANDED_BYTES = 400 * 1024 * 1024
MAX_FILES = 512
FIXED_TIME = (1980, 1, 1, 0, 0, 0)


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    return bool(name) and "\\" not in name and not path.is_absolute() and all(
        part not in ("", ".", "..") for part in path.parts
    )


def manifest_paths(manifest: dict) -> set[str]:
    paths: set[str] = set()
    for animation in manifest.get("animations", {}).values():
        for field in ("clip", "head_image"):
            if animation.get(field):
                paths.add(animation[field])
    background = manifest.get("background", {})
    if background.get("src"):
        paths.add(background["src"])
    for speech in manifest.get("speech_clips", {}).values():
        if speech.get("clip"):
            paths.add(speech["clip"])
    if any(not safe_name(path) for path in paths):
        raise ValueError("manifest contains an unsafe asset path")
    return paths


def read_manifest(raw: bytes) -> dict:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("manifest.json is not valid UTF-8 JSON") from error
    if not isinstance(value, dict) or value.get("nva_version") not in {"0.2", "0.3"}:
        raise ValueError("manifest.json is not a supported NVA object")
    return value


def validate_directory(source: Path) -> list[Path]:
    if source.is_symlink() or not source.is_dir():
        raise ValueError(f"NVA directory is unavailable: {source}")
    files: list[Path] = []
    total = 0
    for path in sorted(source.rglob("*"), key=lambda item: item.relative_to(source).as_posix()):
        if path.is_symlink():
            raise ValueError(f"NVA directory contains a symlink: {path}")
        if path.is_file():
            relative = path.relative_to(source).as_posix()
            if not safe_name(relative):
                raise ValueError(f"unsafe NVA path: {relative}")
            files.append(path)
            total += path.stat().st_size
    if not files or len(files) > MAX_FILES or total > MAX_EXPANDED_BYTES:
        raise ValueError("NVA directory exceeds file or expanded-size limits")
    manifest_file = source / "manifest.json"
    if manifest_file not in files:
        raise ValueError("manifest.json is missing")
    required = manifest_paths(read_manifest(manifest_file.read_bytes()))
    available = {path.relative_to(source).as_posix() for path in files}
    missing = sorted(required - available)
    if missing:
        raise ValueError(f"manifest assets are missing: {', '.join(missing)}")
    return files


def write_directory_bundle(source: Path, destination: Path) -> None:
    files = validate_directory(source)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            name = path.relative_to(source).as_posix()
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    if destination.stat().st_size > MAX_ARCHIVE_BYTES:
        destination.unlink(missing_ok=True)
        raise ValueError("prepared NVA archive exceeds the 200 MiB limit")


def validate_bundle(source: Path) -> None:
    if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError(f"NVA file is unavailable or too large: {source}")
    try:
        with zipfile.ZipFile(source) as archive:
            infos = archive.infolist()
            names = [info.filename for info in infos if not info.is_dir()]
            if not names or len(names) > MAX_FILES or len(names) != len(set(names)):
                raise ValueError("NVA file table is invalid")
            if any(not safe_name(name) for name in names):
                raise ValueError("NVA contains an unsafe path")
            if sum(info.file_size for info in infos) > MAX_EXPANDED_BYTES:
                raise ValueError("NVA expanded assets exceed the size limit")
            manifest = read_manifest(archive.read("manifest.json"))
            missing = sorted(manifest_paths(manifest) - set(names))
            if missing:
                raise ValueError(f"manifest assets are missing: {', '.join(missing)}")
    except (zipfile.BadZipFile, KeyError) as error:
        raise ValueError("NVA ZIP or manifest is invalid") from error


def parse_sample(value: str) -> tuple[str, Path]:
    label, separator, raw_path = value.partition("=")
    label = label.strip()
    if not separator or not label or len(label) > 80 or not raw_path:
        raise argparse.ArgumentTypeError("sample must be LABEL=/absolute/or/relative/path")
    return label, Path(raw_path).expanduser().resolve()


def prepare(samples: list[tuple[str, Path]], output: Path) -> dict:
    if not samples or len(samples) > 32 or len({label for label, _ in samples}) != len(samples):
        raise ValueError("provide 1-32 samples with unique labels")
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".nva-local-stage-", dir=output.parent))
    try:
        catalog = {"version": "1", "samples": []}
        for index, (label, source) in enumerate(samples, 1):
            temporary_name = f"sample-{index:02d}.nva"
            destination = staging / temporary_name
            if source.is_dir():
                write_directory_bundle(source, destination)
            else:
                validate_bundle(source)
                shutil.copyfile(source, destination)
            digest = hashlib.sha256(destination.read_bytes()).hexdigest()[:12]
            name = f"sample-{index:02d}-{digest}.nva"
            destination.rename(staging / name)
            catalog["samples"].append({"label": label, "url": name})
        catalog_bytes = (json.dumps(catalog, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        (staging / "catalog.json").write_bytes(catalog_bytes)

        output.mkdir(parents=True, exist_ok=True)
        for path in sorted(staging.glob("*.nva")):
            os.replace(path, output / path.name)
        os.replace(staging / "catalog.json", output / "catalog.json")
        return catalog
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", action="append", required=True, type=parse_sample,
                        help="repeatable LABEL=PATH input; PATH is never written to the catalog")
    parser.add_argument("--output", type=Path, default=Path("examples/.local"))
    args = parser.parse_args()
    catalog = prepare(args.sample, args.output)
    print(f"Prepared {len(catalog['samples'])} local NVA samples in {args.output.resolve()}")


if __name__ == "__main__":
    main()
