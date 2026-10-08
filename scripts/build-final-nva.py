#!/usr/bin/env python3
"""Build a deterministic completed-media NVA ZIP from a legacy NVA and rendered speech videos."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import zipfile
from copy import deepcopy
from pathlib import Path, PurePosixPath

FIXED_TIME = (1980, 1, 1, 0, 0, 0)
MAX_BYTES = 200 * 1024 * 1024
MAX_EXPANDED_BYTES = 400 * 1024 * 1024
MAX_FILES = 512


def safe_path(value: str) -> bool:
    path = PurePosixPath(value)
    return bool(value) and "\\" not in value and not path.is_absolute() and all(
        part not in ("", ".", "..") for part in path.parts
    )


def read_base(source: Path) -> dict[str, bytes]:
    source = source.resolve()
    if source.is_dir():
        if source.is_symlink():
            raise ValueError("base NVA directory cannot be a symlink")
        entries: dict[str, bytes] = {}
        for path in sorted(source.rglob("*")):
            if path.is_symlink():
                raise ValueError(f"base NVA contains a symlink: {path}")
            if path.is_file():
                name = path.relative_to(source).as_posix()
                if not safe_path(name):
                    raise ValueError(f"unsafe base NVA path: {name}")
                entries[name] = path.read_bytes()
    else:
        if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_BYTES:
            raise ValueError("base NVA ZIP is unavailable or too large")
        with zipfile.ZipFile(source) as archive:
            infos = [info for info in archive.infolist() if not info.is_dir()]
            names = [info.filename for info in infos]
            if (not infos or len(infos) > MAX_FILES or len(names) != len(set(names))
                    or any(not safe_path(name) for name in names)
                    or sum(info.file_size for info in infos) > MAX_EXPANDED_BYTES
                    or any(info.flag_bits & 1 for info in infos)):
                raise ValueError("base NVA ZIP file table is unsafe")
            entries = {info.filename: archive.read(info) for info in infos}
    if not entries or len(entries) > MAX_FILES or sum(map(len, entries.values())) > MAX_EXPANDED_BYTES:
        raise ValueError("base NVA exceeds file or size limits")
    return entries


def manifest_from(entries: dict[str, bytes]) -> dict:
    try:
        manifest = json.loads(entries["manifest.json"].decode("utf-8"))
    except (KeyError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("base manifest.json is missing or invalid") from error
    if not isinstance(manifest, dict) or manifest.get("nva_version") != "0.2":
        raise ValueError("base manifest must be NVA v0.2")
    return manifest


def probe_video(path: Path) -> tuple[int, int, int]:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_type,width,height", "-of", "json", str(path),
    ], check=True, capture_output=True, text=True)
    value = json.loads(result.stdout)
    streams = value.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    if not video or not audio:
        raise ValueError(f"completed speech must contain video and embedded audio: {path}")
    duration_ms = round(float(value["format"]["duration"]) * 1000)
    if duration_ms <= 0:
        raise ValueError(f"completed speech duration is invalid: {path}")
    return int(video["width"]), int(video["height"]), duration_ms


def parse_speech(value: str) -> tuple[str, str, str, Path]:
    parts = value.split("|", 3)
    if len(parts) != 4 or not all(part.strip() for part in parts):
        raise argparse.ArgumentTypeError("speech must be KEY|LANGUAGE|LABEL|VIDEO_PATH")
    key, language, label, raw_path = (part.strip() for part in parts)
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", key):
        raise argparse.ArgumentTypeError("speech KEY must use 1-64 ASCII letters, numbers, dot, underscore, or hyphen")
    if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", language):
        raise argparse.ArgumentTypeError("speech LANGUAGE must be a BCP 47 language tag")
    return key, language, label, Path(raw_path).expanduser().resolve()


def delivery_manifest(base: dict, speech: list[tuple[str, str, str, Path]]) -> tuple[dict, dict[str, bytes | None]]:
    public_meta_fields = {"name", "author", "owner", "license", "created", "description", "tagline", "persona"}
    base_meta = base.get("meta") if isinstance(base.get("meta"), dict) else {}
    meta = {field: deepcopy(value) for field, value in base_meta.items() if field in public_meta_fields}
    meta["delivery"] = {"kind": "completed-media", "realtime": False}
    canvas = base.get("canvas") if isinstance(base.get("canvas"), dict) else {}
    background = base.get("background") if isinstance(base.get("background"), dict) else {"type": "transparent"}
    manifest = {
        "nva_version": "0.3",
        "profile": "completed-media",
        "meta": meta,
        "canvas": {field: canvas[field] for field in ("width", "height", "fps") if field in canvas},
        "background": {field: background[field] for field in ("type", "color", "src") if field in background},
    }
    if isinstance(base.get("poses"), list):
        manifest["poses"] = deepcopy(base["poses"])

    animations = {}
    required: set[str] = set()
    for key, animation in base.get("animations", {}).items():
        if animation.get("can_talk"):
            continue
        public_animation = {
            field: deepcopy(animation[field])
            for field in ("clip", "loop", "entry_pose", "exit_pose", "label", "intent", "triggers")
            if field in animation
        }
        public_animation["loop"] = bool(public_animation.get("loop"))
        animations[key] = public_animation
        required.add(public_animation["clip"])
    if not any(animation.get("loop") for animation in animations.values()):
        raise ValueError("completed NVA requires an idle animation")
    manifest["animations"] = animations
    if manifest["background"].get("src"):
        required.add(manifest["background"]["src"])
    idle_key = next(key for key, animation in animations.items() if animation.get("loop"))
    manifest["scenario"] = {
        "nodes": {
            "start": {"type": "start", "label": "Entry"},
            "idle": {"type": "scene", "animation": idle_key, "label": "Idle"},
        },
        "edges": [{"from": "start", "to": "idle"}],
    }

    expressions = base.get("expressions")
    if isinstance(expressions, dict):
        manifest["expressions"] = {
            key: value for key, value in expressions.items()
            if not key.startswith("_") and value in animations
        }

    speech_files: dict[str, bytes] = {}
    speech_clips = {}
    canvas = manifest["canvas"]
    for key, language, label, path in speech:
        width, height, duration_ms = probe_video(path)
        if (width, height) != (canvas["width"], canvas["height"]):
            raise ValueError(
                f"speech video canvas {width}x{height} differs from NVA canvas "
                f"{canvas['width']}x{canvas['height']}: {path}"
            )
        suffix = path.suffix.lower()
        if suffix not in {".mp4", ".webm"}:
            raise ValueError("completed speech video must be MP4 or WebM")
        bundle_path = f"speech/{key}{suffix}"
        speech_files[bundle_path] = path.read_bytes()
        speech_clips[key] = {
            "clip": bundle_path,
            "audio": "embedded",
            "language": language,
            "label": label,
            "duration_ms": duration_ms,
        }
    manifest["speech_clips"] = speech_clips
    return manifest, {path: None for path in required} | speech_files


def build(base_path: Path, output: Path, speech: list[tuple[str, str, str, Path]]) -> None:
    if not speech or len(speech) > 32:
        raise ValueError("provide 1-32 completed speech videos")
    if len({item[0] for item in speech}) != len(speech):
        raise ValueError("speech keys must be unique")
    entries = read_base(base_path)
    manifest, requested = delivery_manifest(manifest_from(entries), speech)
    missing = sorted(
        path for path, value in requested.items()
        if not safe_path(path) or (value is None and path not in entries)
    )
    if missing:
        raise ValueError(f"base NVA assets are missing: {', '.join(missing)}")

    files = {path: entries[path] for path, value in requested.items() if value is None and path in entries}
    files.update({path: value for path, value in requested.items() if value is not None})
    files["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(files) > MAX_FILES or sum(map(len, files.values())) > MAX_EXPANDED_BYTES:
        raise ValueError("completed NVA exceeds file or size limits")

    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=f".{output.name}.", suffix=".tmp", dir=output.parent, delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name in sorted(files):
                info = zipfile.ZipInfo(name, FIXED_TIME)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, files[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        if temporary.stat().st_size > MAX_BYTES:
            temporary.unlink(missing_ok=True)
            raise ValueError("completed NVA archive exceeds the 200 MiB limit")
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True, type=Path, help="legacy NVA directory or .nva ZIP")
    parser.add_argument("--speech", action="append", required=True, type=parse_speech,
                        help="repeatable KEY|LANGUAGE|LABEL|VIDEO_PATH")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.suffix.lower() != ".nva":
        parser.error("output filename must end with .nva")
    build(args.base, args.output, args.speech)
    print(f"Built completed-media NVA: {args.output.resolve()}")


if __name__ == "__main__":
    main()
