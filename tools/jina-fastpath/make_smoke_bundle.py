#!/usr/bin/env python3
"""
tools/jina-fastpath/make_smoke_bundle.py
녹화기 검증용 작은 가짜 번들 및 짧은 plan 생성.
.agy-work/smoke/ 아래에만 생성한다.
"""

import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

SMOKE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath/.agy-work/smoke").resolve()
SMOKE_DIR.mkdir(parents=True, exist_ok=True)

SPEECH_UNITS = [
    "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
    "palatal", "velar", "glottal", "vowel-open", "vowel-mid",
    "vowel-spread", "vowel-round"
]

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sha256_file(p: Path) -> str:
    return sha256_bytes(p.read_bytes())

def main():
    # 1. 158x242 중립 머리 PNG 생성
    neutral_head_path = SMOKE_DIR / "neutral-head.png"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=158x242:d=0.1",
        "-frames:v", "1", str(neutral_head_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    neutral_bytes = neutral_head_path.read_bytes()
    neutral_sha = sha256_bytes(neutral_bytes)

    # 2. 720x1280 1초 몸체 비디오 생성
    body_video_path = SMOKE_DIR / "smoke-body.webm"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=darkgreen:s=720x1280:r=25:d=1.0",
        "-c:v", "libvpx-vp9", "-b:v", "500k", "-pix_fmt", "yuva420p", str(body_video_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    body_bytes = body_video_path.read_bytes()

    # 3. 5프레임 VP9 무손실 조각 생성 (158x242)
    piece_path = SMOKE_DIR / "piece.webm"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=red:s=158x242:r=25:d=0.2",
        "-frames:v", "5", "-c:v", "libvpx-vp9", "-lossless", "1", "-pix_fmt", "yuva420p", str(piece_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    piece_bytes = piece_path.read_bytes()
    piece_sha = sha256_bytes(piece_bytes)

    # 4. atlas.bin 생성 (두 개 조각: sil>closed, closed>sil)
    atlas_bin_path = SMOKE_DIR / "atlas.bin"
    atlas_bytes = piece_bytes + piece_bytes
    atlas_bin_path.write_bytes(atlas_bytes)
    atlas_sha = sha256_bytes(atlas_bytes)

    piece_len = len(piece_bytes)
    atlas_index = {
        "version": "1",
        "entries": {
            "sil>closed": {
                "offset": 0,
                "length": piece_len,
                "sha256": piece_sha,
                "frames": 5,
                "fps": 25,
                "codec": "vp09.00.10.08",
                "lossless": True
            },
            "closed>sil": {
                "offset": piece_len,
                "length": piece_len,
                "sha256": piece_sha,
                "frames": 5,
                "fps": 25,
                "codec": "vp09.00.10.08",
                "lossless": True
            }
        }
    }
    index_bytes = json.dumps(atlas_index).encode("utf-8")
    index_sha = sha256_bytes(index_bytes)
    (SMOKE_DIR / "atlas-index.json").write_bytes(index_bytes)

    # 5. validation report & quality report
    val_report = {"status": "passed", "checks": []}
    val_bytes = json.dumps(val_report).encode("utf-8")
    val_sha = sha256_bytes(val_bytes)
    (SMOKE_DIR / "validation-report.json").write_bytes(val_bytes)

    qual_report = {
        "status": "screened",
        "metrics": {}
    }
    qual_bytes = json.dumps(qual_report).encode("utf-8")
    qual_sha = sha256_bytes(qual_bytes)
    (SMOKE_DIR / "quality-report.json").write_bytes(qual_bytes)

    # 6. generation-result.json
    gen_result = {
        "version": "1",
        "job_id": "job_01JINASMOKE0000000000000",
        "assets": [
            {"role": "neutral_head", "path": "speech/neutral-head.png", "sha256": neutral_sha, "bytes": len(neutral_bytes)},
            {"role": "speech_atlas", "path": "speech/atlas.bin", "sha256": atlas_sha, "bytes": len(atlas_bytes)},
            {"role": "speech_atlas_index", "path": "speech/atlas-index.json", "sha256": index_sha, "bytes": len(index_bytes)},
            {"role": "validation_report", "path": "speech/validation-report.json", "sha256": val_sha, "bytes": len(val_bytes)},
            {"role": "quality_report", "path": "speech/quality-report.json", "sha256": qual_sha, "bytes": len(qual_bytes)},
        ],
        "provenance": {
            "generator": {"kind": "smoke-test", "version": "1.0"},
            "input_sha256": "0" * 64,
            "settings_sha256": "0" * 64,
            "inventory_version": "1.0.0",
            "inventory": SPEECH_UNITS,
            "validation": {"status": "passed", "report_sha256": val_sha},
            "representation": "whole-head-layer",
            "region": [280, 70, 158, 242]
        },
        "quality": {
            "report_sha256": qual_sha,
            "sync": {"status": "screened"},
            "continuity": {"status": "screened"},
            "naturalness": {"status": "not_evaluated"},
            "performance": {"status": "screened"},
            "bundle": {"status": "not_evaluated"}
        },
        "source_deleted_at": None,
        "source_retention": "local-operator-file"
    }
    gen_bytes = json.dumps(gen_result, indent=2).encode("utf-8")
    (SMOKE_DIR / "generation-result.json").write_bytes(gen_bytes)

    # 7. manifest.json
    manifest = {
        "nva_version": "0.2",
        "canvas": {"width": 720, "height": 1280, "fps": 25},
        "animations": {
            "idle": {
                "clip": "clips/smoke-body.webm",
                "loop": True
            },
            "talking": {
                "clip": "clips/smoke-body.webm",
                "loop": True,
                "can_talk": True,
                "face_bbox": [0.38, 0.05, 0.22, 0.19]
            }
        },
        "speech_motion": {
            "version": "1",
            "representation": "whole-head-layer",
            "region": [280, 70, 158, 242],
            "inventory_version": "1.0.0",
            "inventory": SPEECH_UNITS,
            "neutral_head": "speech/neutral-head.png",
            "atlas": "speech/atlas.bin",
            "atlas_index": "speech/atlas-index.json",
            "validation_report": "speech/validation-report.json",
            "quality_report": "speech/quality-report.json",
            "provenance": "speech/generation-result.json"
        }
    }
    manifest_bytes = json.dumps(manifest, indent=2).encode("utf-8")

    # 8. .nva 파일 압축 (ZIP)
    nva_path = SMOKE_DIR / "smoke.nva"
    with zipfile.ZipFile(nva_path, "w", compression=zipfile.ZIP_STORED) as zf:
        zf.writestr("manifest.json", manifest_bytes)
        zf.writestr("clips/smoke-body.webm", body_bytes)
        zf.writestr("speech/neutral-head.png", neutral_bytes)
        zf.writestr("speech/atlas.bin", atlas_bytes)
        zf.writestr("speech/atlas-index.json", index_bytes)
        zf.writestr("speech/validation-report.json", val_bytes)
        zf.writestr("speech/quality-report.json", qual_bytes)
        zf.writestr("speech/generation-result.json", gen_bytes)

    # 9. 0.4초 오디오 WAV 생성
    wav_path = SMOKE_DIR / "smoke.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.4",
        "-ar", "16000", "-ac", "1", str(wav_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wav_sha = sha256_file(wav_path)

    # 10. SpeechPlan 생성 (0.4초 = 400,000 us)
    plan = {
        "version": "1",
        "quality_mode": "aligned",
        "aligner": {
            "provider": "smoke",
            "version": "1.0",
            "model_sha256": "0" * 64
        },
        "audio": {
            "sha256": wav_sha,
            "duration_us": 400000
        },
        "text": "smoke",
        "events": [
            {"unit": "sil", "start_us": 0, "end_us": 150000},
            {"unit": "closed", "start_us": 150000, "end_us": 250000},
            {"unit": "sil", "start_us": 250000, "end_us": 400000}
        ]
    }
    (SMOKE_DIR / "smoke.plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(f"SMOKE BUNDLE READY in {SMOKE_DIR}")

if __name__ == "__main__":
    main()
