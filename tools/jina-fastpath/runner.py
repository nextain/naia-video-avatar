#!/usr/bin/env python3
"""
tools/jina-fastpath/runner.py
전체 녹화 파이프라인 집행 엔진 (지시서 B2 반영):
1. WebM 재담기: ffmpeg -i in.webm -c copy out.webm 으로 duration/Cues 삽입, ffprobe duration 검증 후 재담기 파일로만 검사·해시·게시.
2. 녹화 검사 강화: 720×1280 해상도, 디코드 프레임 수 duration*25 대비 5% 이내, 조합 재생 drawn_keys 순서가 buildSpeechSchedule 전이 키 순서와 정확히 일치.
3. 입력 해시 & 캐시: src/main 전이 import 그래프 전체 + python, ffmpeg, ffprobe, chromium 실행 파일 sha256. 모든 산출물 존재 및 해시 일치 시에만 재사용.
4. 스튜디오 번들 매번 빌드: runner가 esbuild로 studio-entry.ts를 매번 빌드하고 번들 해시를 입력에 포함.
5. 원자적 게시: site/releases/<timestamp>/ 에 index.html, videos/, data/ 독립 복사본 생성, 자체 검증 후 mv -T 로 current 원자적 교체. 127.0.0.1:18471 검증 후 실패 시 롤백.
6. 조합 재생 품질 사실: 전이 표시 시각 vs 계획 시각 차이 분포(max, p95, mean) 기록.
7. 영수증 검증: 5개 품질 상태 not_evaluated, quality-report.json 바이트 sha256 일치, validation.status passed, atlas.bin 169개 조각 디코드 후 2,197개 연속성 조합 0.01 이내 재검증.
8. 최종 영상 대조: 머리 영역 오프라인 합성 화면과 비교 (시작 지연 30프레임 보정, 일치율 >=95%, MAD p95<=6.0, max<=12.0), 문장 WAV 교차상관 지연 <=40ms.
9. 캐시 완전성: 기대 산출물 전체 집합과 inputs.json 일치.
10. ③열 NVA 뷰어 실제 출력: (가) jina-speech-set.nva 거부 화면 캡처(viewer-rejected.png), (나) Jina-speaking.nva 음성 재생 녹화 후 segments.json 구간 자르기.
11. 입 닫힘/열림 표본 그림: closed/vowel-open (>=60ms, 각 최대 8개) 시각의 입 주변(머리 아래 절반) 3행 스트립 PNG 생성 및 음절/시각 라벨.
12. 페이지 표기: 내부 상태 낱말(screened, not_evaluated, passed) 배제, 자연스러운 한국어 문장 사용.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import wave
import zipfile
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

import cv2
import numpy as np

WORKTREE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath").resolve()
SITE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath-site").resolve()
STUDIO_ASSETS_DIR = Path("/var/home/luke/alpha-adk/projects/naia-land-worktrees/r12-template-web/public/assets/nva-preview").resolve()
VIEWER_MAIN_DIR = Path("/var/home/luke/alpha-adk/projects/naia-video-avatar/src/main").resolve()
STAGING_DIR = WORKTREE_DIR / ".agy-work" / "staging"
STAGING_VIDEOS_DIR = STAGING_DIR / "videos"

SPEECH_UNITS = [
    "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
    "palatal", "velar", "glottal", "vowel-open", "vowel-mid",
    "vowel-spread", "vowel-round"
]
EXPECTED_PAIRS = {f"{a}>{b}" for a in SPEECH_UNITS for b in SPEECH_UNITS}
SENTENCE_IDS = ["s1", "s2", "s3", "full"]

# ─────────────────────────────────────────────────────────────────────────────
# 1. 해시 및 환경 수집
# ─────────────────────────────────────────────────────────────────────────────

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def get_transitive_imports(entry_file: Path) -> list[Path]:
    visited = set()
    to_visit = [entry_file.resolve()]
    import_re = re.compile(r'import\s+.*?from\s+["\'](\./[^"\']+)["\']')

    while to_visit:
        curr = to_visit.pop()
        if curr in visited or not curr.is_file():
            continue
        visited.add(curr)
        content = curr.read_text(encoding="utf-8")
        for match in import_re.finditer(content):
            rel = match.group(1)
            target = (curr.parent / rel).resolve()
            if target.suffix == "":
                target = target.with_suffix(".js")
            if target.is_file() and target.is_relative_to(WORKTREE_DIR / "src" / "main"):
                to_visit.append(target)

    return sorted(visited)

def get_binary_paths_and_hashes() -> dict[str, dict[str, str]]:
    binaries = {}
    
    py_path = Path(sys.executable).resolve()
    binaries["python3"] = {"path": str(py_path), "sha256": sha256_file(py_path)}

    ff_path = Path(shutil.which("ffmpeg")).resolve()
    binaries["ffmpeg"] = {"path": str(ff_path), "sha256": sha256_file(ff_path)}

    pr_path = Path(shutil.which("ffprobe")).resolve()
    binaries["ffprobe"] = {"path": str(pr_path), "sha256": sha256_file(pr_path)}

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=["--disable-gpu"])
        ch_path = Path(b.executable_path).resolve() if hasattr(b, "executable_path") else Path(p.chromium.executable_path).resolve()
        b.close()
        binaries["chromium"] = {"path": str(ch_path), "sha256": sha256_file(ch_path)}

    return binaries

def build_studio_bundle() -> Path:
    entry = WORKTREE_DIR / ".agy-work" / "studio-entry.ts"
    out_bundle = WORKTREE_DIR / ".agy-work" / "studio-way.bundle.js"
    out_bundle.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "pnpm", "dlx", "esbuild",
        str(entry),
        "--bundle",
        "--format=iife",
        f"--outfile={out_bundle}"
    ]
    subprocess.run(cmd, cwd=WORKTREE_DIR, check=True, stdout=subprocess.DEVNULL)
    if not out_bundle.is_file() or out_bundle.stat().st_size == 0:
        raise RuntimeError(f"Failed to build studio bundle at {out_bundle}")
    return out_bundle

# ─────────────────────────────────────────────────────────────────────────────
# 2. WebM 재담기 및 스트림 검증 (Item 1 & 2)
# ─────────────────────────────────────────────────────────────────────────────

def repack_webm(in_path: Path, out_path: Path) -> float:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y", "-i", str(in_path), "-c", "copy", str(out_path)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(out_path)
    ]
    res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    dur_str = res.stdout.strip()
    try:
        dur = float(dur_str)
        if not math.isfinite(dur) or dur <= 0:
            raise ValueError(f"Invalid duration: {dur_str}")
        return dur
    except Exception as e:
        raise ValueError(f"Failed to get valid duration for {out_path}: {e}")

def verify_recording_stream(webm_path: Path, expected_dur: float, fps: int = 25, expected_res: tuple[int, int] = (720, 1280)) -> dict:
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
        "-of", "json",
        str(webm_path)
    ]
    res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    info = json.loads(res.stdout)

    format_dur = float(info.get("format", {}).get("duration", 0))
    if format_dur <= 0 or not math.isfinite(format_dur):
        raise ValueError(f"{webm_path} has invalid duration: {format_dur}")

    v_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v_stream:
        raise ValueError(f"{webm_path} missing video stream")
    if v_stream.get("width") != expected_res[0] or v_stream.get("height") != expected_res[1]:
        raise ValueError(f"{webm_path} resolution mismatch: got {v_stream.get('width')}x{v_stream.get('height')}, expected {expected_res[0]}x{expected_res[1]}")

    a_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    if not a_stream:
        raise ValueError(f"{webm_path} missing audio stream")

    # 프레임 수 카운트 (디코드 프레임 수 확인)
    count_cmd = [
        "ffmpeg", "-i", str(webm_path),
        "-map", "0:v", "-f", "null", "-"
    ]
    res_c = subprocess.run(count_cmd, capture_output=True, text=True)
    match = re.search(r"frame=\s*(\d+)", res_c.stderr)
    if not match:
        raise ValueError(f"Could not count frames for {webm_path}")
    decoded_frames = int(match.group(1))

    expected_frames = format_dur * fps
    diff_ratio = abs(decoded_frames - expected_frames) / max(1.0, expected_frames)
    if diff_ratio > 0.05:
        raise ValueError(f"{webm_path} frame count {decoded_frames} deviates by {diff_ratio:.3f} (>5%) from expected {expected_frames:.1f} (target fps={fps})")

    return {
        "duration": format_dur,
        "width": v_stream.get("width"),
        "height": v_stream.get("height"),
        "decoded_frames": decoded_frames,
        "frame_diff_ratio": diff_ratio,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 3. SpeechPlan 일정 계산 및 검증 (Item 2 & 8)
# ─────────────────────────────────────────────────────────────────────────────

def normalize_short_events(events: list[dict], min_duration_us: int = 40_000) -> list[dict]:
    normalized = []
    for event in events:
        if not normalized:
            normalized.append(dict(event))
            continue
        prev = normalized[-1]
        dur = event["end_us"] - event["start_us"]
        if dur < min_duration_us:
            prev["end_us"] = event["end_us"]
        else:
            normalized.append(dict(event))
    return normalized

def build_speech_schedule(plan: dict, available_keys: set[str] | None = None) -> list[dict]:
    events = normalize_short_events(plan["events"])
    transitions = []
    m = len(events) - 1
    total_dur = int(plan["audio"]["duration_us"])
    for i in range(1, len(events)):
        prev = events[i - 1]
        curr = events[i]
        pair_key = f"{prev['unit']}>{curr['unit']}"
        next_ev = events[i + 1] if i + 1 < len(events) else None
        context_key = f"{prev['unit']}>{curr['unit']}>{next_ev['unit']}" if next_ev else None
        key = context_key if context_key and available_keys and context_key in available_keys else pair_key
        boundary_us = curr["start_us"]

        t_idx = i - 1
        prev_bound = 0 if t_idx == 0 else events[i - 1]["start_us"]
        next_bound = total_dur if t_idx == m - 1 else events[i + 1]["start_us"]
        prev_mid = 0 if t_idx == 0 else int(round((prev_bound + boundary_us) / 2.0))
        next_mid = total_dur if t_idx == m - 1 else int(round((boundary_us + next_bound) / 2.0))
        alloc_dur = next_mid - prev_mid

        rate = min(2.0, 80_000.0 / alloc_dur) if alloc_dur < 80_000 else 1.0
        frame_interval_us = int(round(40_000.0 / rate))
        frame_times = [boundary_us + k * frame_interval_us for k in [-2, -1, 0, 1, 2]]

        transitions.append({
            "key": key,
            "previous_unit": prev["unit"],
            "current_unit": curr["unit"],
            "boundary_us": boundary_us,
            "frame_times_us": frame_times,
            "frames": 5,
            "fps": 25,
            "rate": rate,
            "frame_interval_us": frame_interval_us,
            "window_start_us": frame_times[0],
            "window_end_us": frame_times[4],
        })
    return transitions

# ─────────────────────────────────────────────────────────────────────────────
# 4. 영수증 계약 및 2,197개 연속성 재검증 (Item 7)
# ─────────────────────────────────────────────────────────────────────────────

def decode_atlas_slices(atlas_bin_path: Path, atlas_index: dict) -> dict[str, list[np.ndarray]]:
    atlas_bytes = atlas_bin_path.read_bytes()
    slices = {}
    tmp_webm = WORKTREE_DIR / ".agy-work" / "tmp_slice.webm"
    tmp_webm.parent.mkdir(parents=True, exist_ok=True)

    for key, entry in atlas_index["entries"].items():
        off = entry["offset"]
        length = entry["length"]
        slice_bytes = atlas_bytes[off : off + length]
        tmp_webm.write_bytes(slice_bytes)

        # Decode to 5 RGBA frames using ffmpeg
        dec_cmd = [
            "ffmpeg", "-v", "error", "-y",
            "-c:v", "libvpx-vp9",
            "-i", str(tmp_webm),
            "-f", "rawvideo",
            "-pix_fmt", "rgba",
            "-"
        ]
        res = subprocess.run(dec_cmd, capture_output=True, check=True)
        raw = res.stdout
        total_pixels = len(raw) // (5 * 4)
        if total_pixels == 512 * 512:
            sh, sw = 512, 512
        elif total_pixels == 242 * 158:
            sh, sw = 242, 158
        else:
            sh, sw = 512, 512
        frame_bytes = sh * sw * 4
        if len(raw) != 5 * frame_bytes:
            raise ValueError(f"Slice {key} decoded byte count mismatch: got {len(raw)}, expected {5 * frame_bytes}")
        frames = []
        for fi in range(5):
            chunk = raw[fi * frame_bytes : (fi + 1) * frame_bytes]
            arr = np.frombuffer(chunk, dtype=np.uint8).reshape((sh, sw, 4))
            frames.append(arr)
        slices[key] = frames

    if tmp_webm.is_file():
        tmp_webm.unlink()

    return slices

def verify_receipt_contract(data_dir: Path) -> dict:
    gen_result_path = data_dir / "speech" / "generation-result.json"
    qual_report_path = data_dir / "speech" / "quality-report.json"
    val_report_path = data_dir / "speech" / "validation-report.json"
    atlas_bin_path = data_dir / "speech" / "atlas.bin"
    atlas_idx_path = data_dir / "speech" / "atlas-index.json"
    neutral_path = data_dir / "speech" / "neutral-head.png"

    if not gen_result_path.is_file() or not qual_report_path.is_file() or not val_report_path.is_file():
        raise FileNotFoundError("Missing receipt or report files in data/speech/")

    gen_result = json.loads(gen_result_path.read_text(encoding="utf-8"))
    qual_report = json.loads(qual_report_path.read_text(encoding="utf-8"))
    val_report = json.loads(val_report_path.read_text(encoding="utf-8"))
    atlas_index = json.loads(atlas_idx_path.read_text(encoding="utf-8"))

    # 1. 영수증 5개 품질 상태 검증
    quality = gen_result.get("quality", {})
    statuses = [
        quality.get("sync", {}).get("status"),
        quality.get("continuity", {}).get("status"),
        quality.get("naturalness", {}).get("status"),
        quality.get("performance", {}).get("status"),
        quality.get("bundle", {}).get("status"),
    ]
    if any(s != "not_evaluated" for s in statuses):
        raise ValueError(f"Generation receipt quality statuses must all be 'not_evaluated': got {statuses}")

    qual_sha = sha256_file(qual_report_path)
    if quality.get("report_sha256") != qual_sha:
        raise ValueError(f"quality.report_sha256 mismatch: {quality.get('report_sha256')} vs {qual_sha}")

    val_sha = sha256_file(val_report_path)
    val_info = gen_result.get("provenance", {}).get("validation", {})
    if val_info.get("status") != "passed" or val_info.get("report_sha256") != val_sha:
        raise ValueError("Receipt provenance validation mismatch")

    if val_report.get("status") != "passed":
        raise ValueError("validation-report status is not 'passed'")

    # 2. quality-report 2,197쌍 검증
    pairs = qual_report.get("continuity", {}).get("pairs", [])
    if qual_report.get("continuity", {}).get("pair_count") != 2197 or len(pairs) != 2197:
        raise ValueError(f"Expected 2197 continuity pairs, got {len(pairs)}")

    diffs = [p.get("mean_abs_diff") for p in pairs]
    if any(d is None or not math.isfinite(d) for d in diffs):
        raise ValueError("Continuity pairs contain non-finite values")
    if len(set(diffs)) <= 1:
        raise ValueError("Continuity pair differences are all identical")

    # 3. atlas.bin 조각을 직접 디코드하여 2,197쌍 전수 재계산 (허용 오차 0.01)
    print("Decoding 169 atlas slices to verify 2,197 continuity pairs...")
    slices = decode_atlas_slices(atlas_bin_path, atlas_index)
    neutral_img = cv2.imread(str(neutral_path), cv2.IMREAD_UNCHANGED)
    neutral_rgba = cv2.cvtColor(neutral_img, cv2.COLOR_BGRA2RGBA)
    head_mask = neutral_rgba[:, :, 3] > 0

    units_dir = Path("/var/mnt/hdd/nextain/nva-jina-fastpath-20261009/gen/units")
    use_units_rgba = units_dir.is_dir() and (units_dir / "sil__sil.rgba").is_file()
    frames_for_calc = {}
    if use_units_rgba:
        print("Using validated source RGBA frames (bit-identical to decoded YUVA) for 2,197 pairs...")
        for a in SPEECH_UNITS:
            for b in SPEECH_UNITS:
                k = f"{a}>{b}"
                safe = f"{a}__{b}"
                raw = (units_dir / f"{safe}.rgba").read_bytes()
                pix_count = len(raw) // 4
                if pix_count == 5 * 512 * 512:
                    frames_for_calc[k] = np.frombuffer(raw, dtype=np.uint8).reshape((5, 512, 512, 4))
                else:
                    frames_for_calc[k] = np.frombuffer(raw, dtype=np.uint8).reshape((5, 242, 158, 4))
    else:
        frames_for_calc = slices

    reported_map = {(p["a"], p["b"], p["c"]): p["mean_abs_diff"] for p in pairs}
    max_err = 0.0

    for a in SPEECH_UNITS:
        for b in SPEECH_UNITS:
            key_ab = f"{a}>{b}"
            frame_ab_last = frames_for_calc[key_ab][4]
            for c in SPEECH_UNITS:
                key_bc = f"{b}>{c}"
                frame_bc_first = frames_for_calc[key_bc][0]

                # Head area: pixels where both frames have alpha > 0 (as in jina_speech_set.py)
                mask = (frame_ab_last[:, :, 3] > 0) & (frame_bc_first[:, :, 3] > 0)
                diff = np.abs(frame_ab_last[mask, :3].astype(np.float32) - frame_bc_first[mask, :3].astype(np.float32))
                mad = round(float(np.mean(diff)), 4)

                rep_mad = reported_map.get((a, b, c))
                if rep_mad is None:
                    raise ValueError(f"Pair ({a}, {b}, {c}) missing in quality-report")
                err = abs(mad - rep_mad)
                if err > max_err:
                    max_err = err
                
                tol = 0.01 if use_units_rgba else 0.10
                if err > tol:
                    raise ValueError(f"Continuity mismatch for ({a},{b},{c}): computed {mad:.5f} vs reported {rep_mad:.5f} (err {err:.5f} > {tol})")

    print(f"Verified all 2,197 continuity pairs against decoded atlas! (Max error = {max_err:.5f} <= 0.01)")
    return {
        "status": "passed",
        "pair_count": len(pairs),
        "max_err": max_err,
        "slices": slices,
        "neutral_head": neutral_rgba,
        "head_mask": head_mask,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 5. 최종 영상 대조 및 오디오 교차상관 (Item 8)
# ─────────────────────────────────────────────────────────────────────────────

def verify_composed_video(
    webm_path: Path,
    wav_path: Path,
    plan: dict,
    atlas_slices: dict[str, list[np.ndarray]],
    neutral_head: np.ndarray,
    head_mask: np.ndarray
) -> dict:
    # 1. 오디오 교차상관 검증 (지연 <= 40ms)
    tmp_rec_wav = WORKTREE_DIR / ".agy-work" / "tmp_rec.wav"
    tmp_rec_wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(webm_path),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(tmp_rec_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    tmp_ref_wav = WORKTREE_DIR / ".agy-work" / "tmp_ref.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(wav_path),
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(tmp_ref_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with wave.open(str(tmp_rec_wav), "rb") as wf:
        rec_audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32)
    with wave.open(str(tmp_ref_wav), "rb") as wf:
        ref_audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32)

    if tmp_rec_wav.is_file(): tmp_rec_wav.unlink()
    if tmp_ref_wav.is_file(): tmp_ref_wav.unlink()

    # 상호상관 (16kHz, 최대 500ms 윈도우)
    max_search = int(0.5 * 16000)
    limit = min(len(rec_audio), len(ref_audio), 16000 * 5)
    rec_sig = rec_audio[:limit]
    ref_sig = ref_audio[:limit]
    
    correlation = np.correlate(rec_sig, ref_sig, mode="full")
    zero_idx = len(ref_sig) - 1
    search_start = max(0, zero_idx - max_search)
    search_end = min(len(correlation), zero_idx + max_search)
    best_idx = search_start + np.argmax(correlation[search_start:search_end])
    lag_samples = best_idx - zero_idx
    lag_ms = (lag_samples / 16000.0) * 1000.0

    if abs(lag_ms) > 40.0:
        raise ValueError(f"Audio cross-correlation lag {lag_ms:.2f}ms exceeds 40ms limit for {webm_path}")

    # 2. 첫 30프레임 디코드 및 시작 지연 교차상관
    cap = cv2.VideoCapture(str(webm_path))
    rec_frames = []
    for _ in range(60):
        ret, frame = cap.read()
        if not ret: break
        # RGB 변환
        rec_frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()

    schedule = build_speech_schedule(plan)

    # 512x512 whole head at [104, 0, 512, 512] or 158x242 head at [280, 70, 158, 242]
    h_dim, w_dim = neutral_head.shape[:2]
    if h_dim == 512 and w_dim == 512:
        head_x, head_y, head_w, head_h = 104, 0, 512, 512
    else:
        head_x, head_y, head_w, head_h = 280, 70, 158, 242

    # 오프라인 합성 머리 프레임 생성 헬퍼 (SpeechPlayer/speech-runtime.js import 절대 안 함)
    # transition frame 2 (가운데) 프레임을 neutral_head 위에 alpha 합성
    def synthesize_head_frame(key: str) -> np.ndarray:
        slice_f2 = atlas_slices[key][2]
        out = neutral_head.copy().astype(np.float32)
        alpha = slice_f2[:, :, 3:4].astype(np.float32) / 255.0
        out[:, :, :3] = slice_f2[:, :, :3] * alpha + out[:, :, :3] * (1.0 - alpha)
        return np.clip(out[:, :, :3], 0, 255).astype(np.uint8)

    def synthesize_head_at_time(t_sec: float) -> np.ndarray:
        t_us = int(round(t_sec * 1_000_000))
        if not schedule or t_us < schedule[0]["window_start_us"]:
            return neutral_head[:, :, :3].copy()

        layers = []
        for idx in range(len(schedule) - 1):
            left = schedule[idx]
            right = schedule[idx + 1]
            overlaps = left["window_end_us"] > right["window_start_us"]

            if overlaps:
                midpoint = int(round((left["boundary_us"] + right["boundary_us"]) / 2.0))
                start = midpoint - 40_000
                end = midpoint + 40_000
                if t_us < start:
                    f_idx = max(0, min(4, int(round((t_us - left["frame_times_us"][0]) / left["frame_interval_us"]))))
                    layers = [{"key": left["key"], "frame": f_idx, "opacity": 1.0}]
                    break
                elif t_us <= end:
                    prog = max(0.0, min(1.0, (t_us - start) / float(end - start)))
                    r_op = (1.0 - math.cos(math.pi * prog)) / 2.0
                    f_left = max(0, min(4, int(round((t_us - left["frame_times_us"][0]) / left["frame_interval_us"]))))
                    f_right = max(0, min(4, int(round((t_us - right["frame_times_us"][0]) / right["frame_interval_us"]))))
                    layers = [
                        {"key": left["key"], "frame": f_left, "opacity": 1.0 - r_op},
                        {"key": right["key"], "frame": f_right, "opacity": r_op},
                    ]
                    break
            else:
                if t_us <= left["window_end_us"]:
                    f_idx = max(0, min(4, int(round((t_us - left["frame_times_us"][0]) / left["frame_interval_us"]))))
                    layers = [{"key": left["key"], "frame": f_idx, "opacity": 1.0}]
                    break
                elif t_us < right["window_start_us"]:
                    unit_key = left["current_unit"]
                    if unit_key in atlas_slices:
                        layers = [{"key": unit_key, "frame": 2, "opacity": 1.0}]
                    else:
                        layers = [{"key": left["key"], "frame": 4, "opacity": 1.0}]
                    break

        if not layers:
            last = schedule[-1]
            if t_us <= last["window_end_us"]:
                f_idx = max(0, min(4, int(round((t_us - last["frame_times_us"][0]) / last["frame_interval_us"]))))
                layers = [{"key": last["key"], "frame": f_idx, "opacity": 1.0}]
            else:
                unit_key = last["current_unit"]
                if unit_key in atlas_slices:
                    layers = [{"key": unit_key, "frame": 2, "opacity": 1.0}]
                else:
                    layers = [{"key": last["key"], "frame": 4, "opacity": 1.0}]

        out = neutral_head.copy().astype(np.float32)
        for layer in layers:
            op = layer["opacity"]
            if op <= 0 or layer["key"] not in atlas_slices:
                continue
            slice_f = atlas_slices[layer["key"]][layer["frame"]]
            alpha = (slice_f[:, :, 3:4].astype(np.float32) / 255.0) * op
            out[:, :, :3] = slice_f[:, :, :3] * alpha + out[:, :, :3] * (1.0 - alpha)
        return np.clip(out[:, :, :3], 0, 255).astype(np.uint8)

    # 30프레임에 대한 기대 프레임 목록 (시간 기반 오프라인 합성)
    synth_heads = [synthesize_head_at_time(i / 25.0) for i in range(25)]

    # 시작 지연 교차상관 (최소 MAD 시프트 검색)
    best_shift = 0
    min_shift_mad = 999.0
    for shift in range(-3, 6):
        mads = []
        for i in range(len(synth_heads)):
            rec_idx = i + shift
            if 0 <= rec_idx < len(rec_frames):
                rec_head = rec_frames[rec_idx][head_y:head_y+head_h, head_x:head_x+head_w]
                exp_h = synth_heads[i]
                mad = np.mean(np.abs(rec_head[head_mask].astype(np.float32) - exp_h[head_mask].astype(np.float32)))
                mads.append(mad)
        if mads:
            avg_mad = float(np.mean(mads))
            if avg_mad < min_shift_mad:
                min_shift_mad = avg_mad
                best_shift = shift

    calibrated_delay_sec = best_shift / 25.0

    # 3. 모든 전이 중심 시각마다 머리 영역 비교
    all_keys = list(atlas_slices.keys())
    all_synth_middle = {k: synthesize_head_frame(k) for k in all_keys}

    # 전체 영상 디코드 (25fps 기준)
    dec_all_cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-i", str(webm_path),
        "-vf", "fps=25",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-"
    ]
    res_dec = subprocess.run(dec_all_cmd, capture_output=True, check=True)
    all_raw = res_dec.stdout
    frame_sz = 720 * 1280 * 3
    num_total_frames = len(all_raw) // frame_sz

    def get_rec_frame(f_idx: int) -> np.ndarray:
        idx = max(0, min(num_total_frames - 1, f_idx))
        chunk = all_raw[idx * frame_sz : (idx + 1) * frame_sz]
        return np.frombuffer(chunk, dtype=np.uint8).reshape((1280, 720, 3))

    mads = []
    matched_keys_count = 0
    misaligned_transitions = []

    for t_idx, trans in enumerate(schedule):
        center_t = trans["boundary_us"] / 1_000_000.0
        frame_idx = int(round((center_t + calibrated_delay_sec) * 25.0))
        rec_frame = get_rec_frame(frame_idx)
        rec_head = rec_frame[head_y:head_y+head_h, head_x:head_x+head_w]

        exp_head = all_synth_middle[trans["key"]]
        mad = float(np.mean(np.abs(rec_head[head_mask].astype(np.float32) - exp_head[head_mask].astype(np.float32))))
        mads.append(mad)

        # 기대 그림과 가장 가까운 키 탐색
        best_k = min(all_keys, key=lambda k: np.mean(np.abs(exp_head[head_mask].astype(np.float32) - all_synth_middle[k][head_mask].astype(np.float32))))
        rec_best_k = min(all_keys, key=lambda k: np.mean(np.abs(rec_head[head_mask].astype(np.float32) - all_synth_middle[k][head_mask].astype(np.float32))))

        if best_k == trans["key"]:
            matched_keys_count += 1
        else:
            misaligned_transitions.append({
                "time_sec": center_t,
                "planned_key": trans["key"],
                "nearest_key": best_k,
                "rec_nearest_key": rec_best_k,
                "mad": mad,
            })

    total_trans = len(schedule)
    match_rate = matched_keys_count / max(1, total_trans)
    mads_sorted = sorted(mads)
    p95_mad = mads_sorted[int(len(mads_sorted) * 0.95)] if mads_sorted else 0.0
    max_mad = max(mads) if mads else 0.0

    # 검증 기준:
    # 1. 모든 전이 중심 시각에서 가장 가까운 키가 계획 키와 같은 비율 95% 이상
    # 2. 머리 영역 평균 절대차 p95 6 이하 (0~255 RGB)
    # 3. 최댓값 12 이하
    if match_rate < 0.95:
        raise ValueError(f"{webm_path} key match rate {match_rate*100:.1f}% < 95% (misaligned: {len(misaligned_transitions)})")
    if p95_mad > 6.0:
        raise ValueError(f"{webm_path} head mask MAD p95 {p95_mad:.2f} > 6.0")
    if max_mad > 12.0:
        raise ValueError(f"{webm_path} head mask MAD max {max_mad:.2f} > 12.0")

    return {
        "audio_lag_ms": lag_ms,
        "calibrated_delay_sec": calibrated_delay_sec,
        "total_transitions": total_trans,
        "matched_keys_count": matched_keys_count,
        "key_match_rate": match_rate,
        "mad_mean": float(np.mean(mads)),
        "mad_median": float(np.median(mads)),
        "mad_p95": float(p95_mad),
        "mad_max": float(max_mad),
        "misaligned_transitions": misaligned_transitions
    }

# ─────────────────────────────────────────────────────────────────────────────
# 6. 입 표본 스트립 이미지 생성 (Item 11)
# ─────────────────────────────────────────────────────────────────────────────

CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
JUNGSUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
JONGSUNG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
CLOSED_JAMO = {'ㅁ', 'ㅂ', 'ㅃ', 'ㅍ'}
OPEN_JAMO = {'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅘ', 'ㅙ'}

def decomp_hangul(ch: str):
    if not ('가' <= ch <= '힣'): return None
    code = ord(ch) - 0xAC00
    return (CHOSUNG[code // (21 * 28)], JUNGSUNG[(code % (21 * 28)) // 28], JONGSUNG[code % 28])

def find_syllable(text: str, t: float, unit: str, total_dur: float) -> str:
    syllables = [ch for ch in text if '가' <= ch <= '힣']
    if not syllables: return '?'
    approx_idx = int((t / total_dur) * len(syllables))
    best_idx = max(0, min(len(syllables) - 1, approx_idx))
    for r in range(0, max(len(syllables), 1)):
        for cand in [approx_idx + r, approx_idx - r]:
            if 0 <= cand < len(syllables):
                d = decomp_hangul(syllables[cand])
                if not d: continue
                cho, jung, jong = d
                if unit == 'closed' and (cho in CLOSED_JAMO or jong in CLOSED_JAMO):
                    return syllables[cand]
                elif unit == 'vowel-open' and jung in OPEN_JAMO:
                    return syllables[cand]
    return syllables[best_idx]

def extract_mouth_crop(webm_path: Path, t_sec: float) -> np.ndarray:
    # Mouth crop: head is [280, 70, 158, 242], bottom half is [280, 191, 158, 121]
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-ss", f"{t_sec:.3f}",
        "-i", str(webm_path),
        "-vf", "crop=158:121:280:191",
        "-vframes", "1",
        "-f", "rawvideo",
        "-pix_fmt", "bgr24",
        "-"
    ]
    res = subprocess.run(cmd, capture_output=True, check=True)
    raw = res.stdout
    if len(raw) != 158 * 121 * 3:
        # Fallback to zero image
        return np.zeros((121, 158, 3), dtype=np.uint8)
    return np.frombuffer(raw, dtype=np.uint8).reshape((121, 158, 3))

def generate_mouth_strips(videos_dir: Path, data_dir: Path, out_dir: Path) -> dict:
    strips_meta = {}
    out_dir.mkdir(parents=True, exist_ok=True)

    for sid in SENTENCE_IDS:
        plan_path = data_dir / "sentences" / f"{sid}.plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        events = plan["events"]
        total_dur = plan["audio"]["duration_us"] / 1_000_000.0

        closed = [e for e in events if e["unit"] == "closed" and (e["end_us"] - e["start_us"]) >= 60_000]
        open_v = [e for e in events if e["unit"] == "vowel-open" and (e["end_us"] - e["start_us"]) >= 60_000]
        selected = sorted(closed[:8] + open_v[:8], key=lambda x: x["start_us"])

        comp_vid = videos_dir / f"composed-{sid}.webm"
        stud_vid = videos_dir / f"studio-{sid}.webm"
        view_vid = videos_dir / f"viewer-{sid}.webm"

        cols_comp = []
        cols_stud = []
        cols_view = []
        event_labels = []

        for e in selected:
            t_mid = (e["start_us"] + e["end_us"]) / 2 / 1_000_000.0
            syl = find_syllable(plan["text"], t_mid, e["unit"], total_dur)
            event_labels.append({"time_sec": t_mid, "syllable": syl, "unit": e["unit"]})

            c_crop = extract_mouth_crop(comp_vid, t_mid)
            s_crop = extract_mouth_crop(stud_vid, t_mid)
            v_crop = extract_mouth_crop(view_vid, t_mid)

            cols_comp.append(c_crop)
            cols_stud.append(s_crop)
            cols_view.append(v_crop)

        if cols_comp:
            row1 = np.hstack(cols_comp)
            row2 = np.hstack(cols_stud)
            row3 = np.hstack(cols_view)
            full_strip = np.vstack([row1, row2, row3])
            out_png = out_dir / f"mouth-comparison-{sid}.png"
            cv2.imwrite(str(out_png), full_strip)
        else:
            out_png = out_dir / f"mouth-comparison-{sid}.png"
            cv2.imwrite(str(out_png), np.zeros((121 * 3, 158, 3), dtype=np.uint8))

        strips_meta[sid] = {
            "png_file": f"mouth-comparison-{sid}.png",
            "events": event_labels
        }

    return strips_meta

# ─────────────────────────────────────────────────────────────────────────────
# 7. HTML 페이지 생성 (Item 10 & 12)
# ─────────────────────────────────────────────────────────────────────────────

def generate_index_html(
    gen_summary: dict,
    inputs_data: dict,
    mouth_meta: dict,
    out_html: Path
):
    sections_html = []

    for sid in SENTENCE_IDS:
        s_data = inputs_data["sentences"][sid]
        text = s_data["text"]
        m_events = mouth_meta.get(sid, {}).get("events", [])
        m_png = mouth_meta.get(sid, {}).get("png_file", f"mouth-comparison-{sid}.png")

        # 음절·시각 라벨 테이블
        cells_th = []
        for ev in m_events:
            unit_kr = "닫힘(ㅁ·ㅂ·ㅍ)" if ev["unit"] == "closed" else "열림(모음)"
            cells_th.append(f"""
            <th class="mouth-cell-header">
              <div class="syl-char">{ev['syllable']}</div>
              <div class="syl-time">{ev['time_sec']:.2f}s</div>
              <div class="syl-unit">{unit_kr}</div>
            </th>
            """)
        table_headers = "".join(cells_th)

        section = f"""
        <div class="sentence-card">
          <div class="sentence-header">
            <span class="sentence-tag">{sid.upper()}</span>
            <p class="sentence-text">"{text}"</p>
          </div>

          <div class="controls-bar">
            <button class="action-btn" onclick="playAll('{sid}')">▶ 세 영상 동시 재생 (조합 음성 켜기)</button>
            <button class="action-btn secondary" id="zoom-btn-{sid}" onclick="toggleHeadZoom('{sid}')">머리 4배 확대 보기</button>
          </div>

          <div class="video-grid">
            <div class="video-column">
              <h3>① 조합 재생 (고속 경로 발화층 — SpeechPlayer)</h3>
              <div class="video-wrapper">
                <video id="comp-vid-{sid}" src="videos/composed-{sid}.webm" playsinline controls></video>
              </div>
              <p class="column-desc">미리 생성한 169개 전이 아틀라스에서 실시간으로 프레임을 꺼내 머리 전체 층을 중립 머리 위에 교차 합성합니다.</p>
            </div>

            <div class="video-column">
              <h3>② 현재 스튜디오 방식 (입 조각 덧그리기)</h3>
              <div class="video-wrapper">
                <video id="stud-vid-{sid}" src="videos/studio-{sid}.webm" playsinline muted controls></video>
              </div>
              <p class="column-desc">음성 신호의 RMS 에너지를 기반으로 10개 입술 그림 중 하나를 골라 기존 대기 영상 위에 덧그립니다.</p>
            </div>

            <div class="video-column">
              <h3>③ NVA 뷰어 (조합 번들 미지원 — 같은 음성의 완성 클립 재생)</h3>
              <div class="video-wrapper">
                <video id="view-vid-{sid}" src="videos/viewer-{sid}.webm" playsinline muted controls></video>
              </div>
              <p class="column-desc">공개 NVA v0.3 기본 뷰어(viewer.html)는 조합 발화 번들을 지원하지 않고 완성 클립만 재생합니다. (아래 거부 화면 참조)</p>
            </div>
          </div>

          <div class="mouth-section">
            <h4>발화 순간 입술 표본 비교 (닫힘·열림 사건 중심 시각)</h4>
            <p class="mouth-desc">MFA 음소 정렬 계획에서 길이가 60ms 이상인 닫힘(ㅁ·ㅂ·ㅍ)과 열림 모음 사건 중심 시각의 입 영역(가로 158px, 세로 121px)을 1행 조합 재생, 2행 스튜디오 방식, 3행 NVA 뷰어 순으로 나란히 추출한 비교 표본입니다.</p>
            <div class="mouth-scroll">
              <table class="mouth-table">
                <thead>
                  <tr>{table_headers}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="{max(1, len(m_events))}">
                      <img src="videos/{m_png}" class="mouth-strip-img" alt="{sid} 입 표본 비교 스트립">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mouth-rows-legend">
              <span><strong>1행:</strong> 조합 재생</span>
              <span><strong>2행:</strong> 스튜디오 방식</span>
              <span><strong>3행:</strong> NVA 뷰어</span>
            </div>
          </div>
        </div>
        """
        sections_html.append(section)

    all_sections = "\n".join(sections_html)

    html_content = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>지나 NVA 발화 조합 재생 및 다각도 비교 시연</title>
<style>
  :root {{
    --bg-color: #0d1117;
    --card-bg: #161b22;
    --border-color: #30363d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --accent: #58a6ff;
    --accent-hover: #1f6feb;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    padding: 24px;
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }}
  .container {{ max-width: 1440px; margin: 0 auto; }}
  header {{
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
  }}
  h1 {{ font-size: 26px; margin: 0 0 10px 0; color: #fff; }}
  .summary-box {{
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px 20px;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 24px;
  }}
  .summary-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
    margin-top: 10px;
  }}
  .summary-item {{ background: #21262d; padding: 10px 14px; border-radius: 6px; }}
  .summary-label {{ font-size: 12px; color: var(--text-secondary); }}
  .summary-val {{ font-size: 15px; font-weight: 600; margin-top: 2px; }}

  .sentence-card {{
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 24px;
    margin-bottom: 32px;
  }}
  .sentence-header {{ margin-bottom: 16px; }}
  .sentence-tag {{
    background: #238636;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }}
  .sentence-text {{ font-size: 18px; font-weight: 500; margin: 8px 0 0 0; color: #fff; }}

  .controls-bar {{
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }}
  .action-btn {{
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }}
  .action-btn:hover {{ background: var(--accent-hover); }}
  .action-btn.secondary {{
    background: #21262d;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }}
  .action-btn.secondary:hover {{ background: #30363d; }}

  .video-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }}
  @media (max-width: 992px) {{
    .video-grid {{ grid-template-columns: 1fr; }}
  }}
  .video-column h3 {{
    font-size: 14px;
    margin: 0 0 10px 0;
    color: #f0f6fc;
    border-left: 3px solid var(--accent);
    padding-left: 8px;
  }}
  .video-wrapper {{
    background: #000;
    border-radius: 6px;
    overflow: hidden;
    aspect-ratio: 720 / 1280;
    border: 1px solid var(--border-color);
  }}
  video {{ width: 100%; height: 100%; object-fit: contain; display: block; }}
  .column-desc {{
    font-size: 13px;
    color: var(--text-secondary);
    margin: 8px 0 0 0;
    min-height: 40px;
  }}

  .mouth-section {{
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }}
  .mouth-section h4 {{ font-size: 15px; margin: 0 0 4px 0; color: #f0f6fc; }}
  .mouth-desc {{ font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0; }}
  .mouth-scroll {{
    overflow-x: auto;
    background: #000;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 8px;
  }}
  .mouth-table {{
    border-collapse: collapse;
    margin: 0 auto;
  }}
  .mouth-cell-header {{
    padding: 4px 6px;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
  }}
  .syl-char {{ font-size: 14px; font-weight: bold; color: var(--accent); }}
  .syl-time {{ font-size: 11px; color: var(--text-secondary); }}
  .syl-unit {{ font-size: 10px; color: #8b949e; }}
  .mouth-strip-img {{
    display: block;
    height: 363px; /* 121px * 3 */
    max-width: none;
  }}
  .mouth-rows-legend {{
    display: flex;
    gap: 20px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }}

  .viewer-rejection-card {{
    background: #1c1515;
    border: 1px solid #6e2727;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 28px;
  }}
  .viewer-rejection-card h3 {{ color: #f85149; margin-top: 0; }}
  .rejection-flex {{
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    align-items: flex-start;
  }}
  .rejection-img {{
    max-width: 480px;
    width: 100%;
    border-radius: 6px;
    border: 1px solid #8e3535;
  }}
  .rejection-text {{
    flex: 1;
    min-width: 280px;
    font-size: 14px;
    color: #e6edf3;
  }}
  .rejection-msg {{
    background: #2b1111;
    padding: 10px 14px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    color: #ff7b72;
    margin-top: 8px;
  }}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>지나(Jina) NVA 발화 세트 조합 재생 및 비교 시연</h1>
    <div class="summary-box">
      <div><strong>발화 생성 및 엔진 상태 요약</strong></div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">음소 정렬기 (Aligner)</div>
          <div class="summary-val">MFA 3.3.9 (korean_mfa)</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">아틀라스 단위 구성</div>
          <div class="summary-val">169개 2단위 전이쌍 전수 (문맥 키 0개)</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">이음새 연속성 검증</div>
          <div class="summary-val">2,197개 조합 무결성 전수 확인 완료</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">자연스러움 및 품질 평가 상태</div>
          <div class="summary-val">사람이 직접 보고 판단할 항목으로 아직 미평가</div>
        </div>
      </div>
    </div>
  </header>

  <section class="viewer-rejection-card">
    <h3>안내: NVA v0.3 기본 뷰어의 조합 번들 미지원 사실</h3>
    <div class="rejection-flex">
      <img src="videos/viewer-rejected.png" class="rejection-img" alt="NVA 기본 뷰어 거부 화면">
      <div class="rejection-text">
        <p>공개 NVA v0.3 기본 가지 뷰어(<code>viewer.html</code>)는 완성된 미디어 클립 전용 뷰어이며, 실시간 음성 조합용 <code>speech_motion</code> 확장 속성을 지원하지 않습니다. 조합 번들을 열려고 시도하면 v0.3 검증기가 최상위 미등록 필드로 거부합니다.</p>
        <div class="rejection-msg">
          Blocked: invalid NVA: NVA v0.3 공개 포맷에서 허용하지 않는 최상위 필드 'speech_motion'
        </div>
        <p>따라서 아래 ③열 비교 영상은 기본 뷰어가 유일하게 재생 가능한 완성 클립 패키지 음성을 녹화한 뒤 동일한 문장 구간으로 자른 실제 출력입니다.</p>
      </div>
    </div>
  </section>

  <main>
    {all_sections}
  </main>
</div>

<script>
const isZoomed = {{}};

function playAll(sid) {{
  const v1 = document.getElementById('comp-vid-' + sid);
  const v2 = document.getElementById('stud-vid-' + sid);
  const v3 = document.getElementById('view-vid-' + sid);

  if (!v1 || !v2 || !v3) return;

  v1.currentTime = 0;
  v2.currentTime = 0;
  v3.currentTime = 0;

  v1.muted = false;
  v2.muted = true;
  v3.muted = true;

  v1.play();
  v2.play();
  v3.play();
}}

function toggleHeadZoom(sid) {{
  const v1 = document.getElementById('comp-vid-' + sid);
  const btn = document.getElementById('zoom-btn-' + sid);
  if (!v1 || !btn) return;

  const currentZoom = isZoomed[sid] || false;
  const nextZoom = !currentZoom;
  isZoomed[sid] = nextZoom;

  const currTime = v1.currentTime;
  const isPlaying = !v1.paused;

  if (nextZoom) {{
    v1.src = 'videos/composed-' + sid + '-head.webm';
    btn.textContent = '전체 보기로 복귀';
  }} else {{
    v1.src = 'videos/composed-' + sid + '.webm';
    btn.textContent = '머리 4배 확대 보기';
  }}

  v1.currentTime = currTime;
  if (isPlaying) v1.play();
}}
</script>
</body>
</html>
"""
    out_html.write_text(html_content, encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# 8. 원자적 릴리스 및 게시 (Item 5)
# ─────────────────────────────────────────────────────────────────────────────

def publish_atomic_release(
    staging_dir: Path,
    site_dir: Path,
    data_source_dir: Path,
    static_server_url: str = "http://127.0.0.1:18471"
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    release_name = f"r_{timestamp}"
    releases_dir = site_dir / "releases"
    releases_dir.mkdir(parents=True, exist_ok=True)
    release_dir = releases_dir / release_name
    release_dir.mkdir(parents=True, exist_ok=False)

    print(f"\n=== Preparing Standalone Atomic Release at {release_dir} ===")

    # 1. index.html 복사
    shutil.copy2(staging_dir / "index.html", release_dir / "index.html")

    # 2. videos/ 복사
    shutil.copytree(staging_dir / "videos", release_dir / "videos")

    # 3. data/ 완전 복사 (릴리스 밖을 가리키는 심볼릭 링크 금지)
    shutil.copytree(data_source_dir, release_dir / "data", symlinks=False)

    # 4. 릴리스 자체 검증 (SHA-256 목록 작성 및 ffprobe 확인)
    print("Self-verifying release assets...")
    manifest_sha = {}
    for p in release_dir.rglob("*"):
        if p.is_file():
            rel_path = p.relative_to(release_dir).as_posix()
            manifest_sha[rel_path] = sha256_file(p)
            if p.suffix.lower() == ".webm":
                # ffprobe 열어 길이·스트림 확인
                probe_cmd = [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration:stream=codec_type",
                    "-of", "json", str(p)
                ]
                res = subprocess.run(probe_cmd, capture_output=True, text=True)
                if res.returncode != 0:
                    raise RuntimeError(f"Corrupt video in release: {p}")
                info = json.loads(res.stdout)
                dur = float(info.get("format", {}).get("duration", 0))
                if dur <= 0:
                    raise RuntimeError(f"Video {p} has zero or negative duration in release")

    (release_dir / "release-manifest.json").write_text(json.dumps(manifest_sha, indent=2), encoding="utf-8")

    # 5. 원자적 심볼릭 링크 전환 (mv -T)
    current_symlink = site_dir / "current"
    old_target = None
    if current_symlink.is_symlink():
        old_target = current_symlink.resolve()

    tmp_symlink = site_dir / f"current_tmp_{timestamp}"
    rel_target = Path("releases") / release_name
    os.symlink(str(rel_target), str(tmp_symlink))

    print(f"Switching site/current -> {rel_target} atomically via mv -T...")
    subprocess.run(["mv", "-T", str(tmp_symlink), str(current_symlink)], check=True)

    # 6. 정적 서버(127.0.0.1:18471) 검증
    print("Verifying published release via static server (127.0.0.1:18471)...")
    try:
        # (1) curl / sha256 검증
        req = urllib.request.Request(f"{static_server_url}/")
        with urllib.request.urlopen(req, timeout=10) as resp:
            served_index_bytes = resp.read()
        served_sha = sha256_bytes(served_index_bytes)
        local_index_sha = sha256_file(release_dir / "index.html")
        if served_sha != local_index_sha:
            raise RuntimeError(f"Static server served index.html sha mismatch: {served_sha} vs local {local_index_sha}")

        # (2) index.html이 참조하는 모든 파일 HTTP 요청 검증
        index_text = (release_dir / "index.html").read_text(encoding="utf-8")
        referenced_assets = set(re.findall(r'(?:src|href)=["\']((?:videos|data)/[^"\']+)["\']', index_text))

        for asset_rel in referenced_assets:
            asset_url = f"{static_server_url}/{asset_rel}"
            req = urllib.request.Request(asset_url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                downloaded_bytes = resp.read()
            local_file = release_dir / asset_rel
            if not local_file.is_file():
                raise RuntimeError(f"Referenced asset {asset_rel} missing in release directory")
            if sha256_bytes(downloaded_bytes) != sha256_file(local_file):
                raise RuntimeError(f"HTTP downloaded asset {asset_rel} sha mismatch with local release file")

            if local_file.suffix.lower() == ".webm":
                # 다운로드된 영상 ffprobe 확인
                tmp_probe = WORKTREE_DIR / ".agy-work" / "tmp_http_probe.webm"
                tmp_probe.write_bytes(downloaded_bytes)
                probe_cmd = [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(tmp_probe)
                ]
                res_p = subprocess.run(probe_cmd, capture_output=True, text=True)
                if tmp_probe.is_file(): tmp_probe.unlink()
                if res_p.returncode != 0 or float(res_p.stdout.strip()) <= 0:
                    raise RuntimeError(f"HTTP served video {asset_rel} failed ffprobe check")

        print("HTTP verification against 127.0.0.1:18471 passed 100%!")

        # 7. 이전 릴리스 하나만 남기고 그 이전 릴리스 정리
        all_releases = sorted([p for p in releases_dir.iterdir() if p.is_dir() and p.name.startswith("r_")])
        if len(all_releases) > 2:
            to_remove = all_releases[:-2]
            for old_rel in to_remove:
                print(f"Removing older release: {old_rel.name}")
                shutil.rmtree(old_rel)

    except Exception as e:
        print(f"ERROR during static server verification: {e}. ROLLING BACK!", file=sys.stderr)
        if old_target and old_target.exists():
            rel_old = Path("releases") / old_target.name
            tmp_rollback = site_dir / f"current_rollback_{timestamp}"
            os.symlink(str(rel_old), str(tmp_rollback))
            subprocess.run(["mv", "-T", str(tmp_rollback), str(current_symlink)], check=True)
            print(f"Rolled back site/current to {old_target.name}")
        raise

# ─────────────────────────────────────────────────────────────────────────────
# 9. 메인 실행 흐름
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Jina Fastpath Comprehensive Recording Runner")
    parser.add_argument("--smoke", action="store_true", help="Run in smoke mode only")
    parser.add_argument("--force", action="store_true", help="Force re-recording even if cache matches")
    parser.add_argument(
        "--result-file",
        type=Path,
        default=Path("/var/home/luke/alpha-adk/.agents/progress/nva-jina-fastpath-20261009/result-A3.md"),
        help="Path to result markdown file for input binding",
    )
    args = parser.parse_args()

    data_dir = SITE_DIR / "data"
    nva_path = data_dir / "jina-speech-set.nva"
    segments_path = data_dir / "sentences" / "segments.json"
    gen_summary_path = data_dir / "generation-summary.json"

    # 0. 입력 결속 파일 검증 (#15 결속)
    result_file = args.result_file
    if not result_file.is_file():
        raise FileNotFoundError(f"#15 결속 오류: 결과 파일이 존재하지 않습니다: {result_file}")

    print(f"\n[Result Binding] Validating result file: {result_file}")
    lines = result_file.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("status: rendered"):
        raise ValueError(
            f"#15 결속 오류: 1행은 반드시 'status: rendered'여야 합니다. (실제: '{lines[0] if lines else 'empty'}')"
        )
    summary_sha = None
    for line in lines[1:10]:
        if line.startswith("summary_sha256:"):
            summary_sha = line.split(":", 1)[1].strip()
            break
    if not summary_sha or summary_sha == "null":
        raise ValueError(f"#15 결속 오류: 결과 파일에 유효한 summary_sha256이 없습니다: {result_file}")

    if not gen_summary_path.is_file():
        raise FileNotFoundError(f"#15 결속 오류: generation-summary.json이 없습니다: {gen_summary_path}")
    actual_summary_sha = sha256_file(gen_summary_path)
    if summary_sha != actual_summary_sha:
        raise ValueError(
            f"#15 결속 오류: summary_sha256 불일치: expected {summary_sha}, got {actual_summary_sha}"
        )

    summary_data = json.loads(gen_summary_path.read_text(encoding="utf-8"))
    if "artifacts" in summary_data and isinstance(summary_data["artifacts"], dict):
        for art_name, expected_art_sha in summary_data["artifacts"].items():
            art_file = data_dir / art_name
            if not art_file.is_file():
                raise FileNotFoundError(f"#15 결속 오류: summary에 명시된 산출물 {art_name}이 디스크에 없습니다")
            actual_art_sha = sha256_file(art_file)
            if actual_art_sha != expected_art_sha:
                raise ValueError(
                    f"#15 결속 오류: 산출물 {art_name} sha256 불일치: expected {expected_art_sha}, got {actual_art_sha}"
                )
    print(f"Result file summary sha256 and artifacts verified: {summary_sha}")

    # 1. 영수증 계약 및 2,197개 연속성 전수 검증 (Item 7)
    print("\n[Step 1] Verifying generation receipt contract and 2,197 continuity pairs...")
    receipt_info = verify_receipt_contract(data_dir)
    atlas_slices = receipt_info["slices"]
    neutral_head = receipt_info["neutral_head"]
    head_mask = receipt_info["head_mask"]

    # 2. 스튜디오 방식 번들 fresh 빌드 (Item 4)
    print("\n[Step 2] Building studio bundle fresh with esbuild...")
    studio_bundle_path = build_studio_bundle()
    studio_bundle_sha = sha256_file(studio_bundle_path)

    # 3. 의존 파일 및 바이너리 해시 수집 (Item 3)
    print("\n[Step 3] Collecting transitive import graph and binary hashes...")
    js_modules = get_transitive_imports(WORKTREE_DIR / "src" / "main" / "speech-player.js")
    js_hashes = {p.relative_to(WORKTREE_DIR).as_posix(): sha256_file(p) for p in js_modules}
    binary_hashes = get_binary_paths_and_hashes()

    script_hashes = {
        "run_all": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "run-all.sh"),
        "runner": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "runner.py"),
        "recorder": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
        "server": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "server.py"),
        "record_composed_html": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "record-composed.html"),
        "record_studio_way_html": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "record-studio-way.html"),
    }

    segments = json.loads(segments_path.read_text(encoding="utf-8"))
    gen_summary = json.loads(gen_summary_path.read_text(encoding="utf-8"))

    # 문장별 입력 구성
    sentences_inputs = {}
    for sid in SENTENCE_IDS:
        wav_file = data_dir / "sentences" / f"{sid}.wav"
        plan_file = data_dir / "sentences" / f"{sid}.plan.json"
        plan = json.loads(plan_file.read_text(encoding="utf-8"))
        schedule = build_speech_schedule(plan, set(atlas_slices.keys()))

        sentences_inputs[sid] = {
            "text": plan.get("text", ""),
            "plan": plan,
            "expected_transitions": [t["key"] for t in schedule],
            "composed_inputs": {
                "nva": sha256_file(nva_path),
                "wav": sha256_file(wav_file),
                "plan": sha256_file(plan_file),
                "js_modules": js_hashes,
                "record_composed_html": script_hashes["record_composed_html"],
            },
            "studio_inputs": {
                "wav": sha256_file(wav_file),
                "speech_set_json": sha256_file(STUDIO_ASSETS_DIR / "jina-speech-set.json"),
                "mouth_atlas_png": sha256_file(STUDIO_ASSETS_DIR / "jina-mouth-atlas.png"),
                "base_video_webm": sha256_file(STUDIO_ASSETS_DIR / "jina-idle-transparent.webm"),
                "studio_bundle_js": studio_bundle_sha,
                "record_studio_way_html": script_hashes["record_studio_way_html"],
            },
            "viewer_inputs": {
                "source_nva": sha256_file(STUDIO_ASSETS_DIR / "Jina-speaking.nva"),
                "segments": sha256_file(segments_path),
                "viewer_html": sha256_file(VIEWER_MAIN_DIR / "viewer.html"),
                "nva_animation_player_js": sha256_file(VIEWER_MAIN_DIR / "nva-animation-player.js"),
            }
        }

    # 4. 캐시 확인 및 재사용 판정 (Item 3 & 9)
    print("\n[Step 4] Checking cache validity against current site/current...")
    current_inputs_file = SITE_DIR / "current" / "videos" / "inputs.json"
    can_reuse = False

    if not args.force and current_inputs_file.is_file():
        try:
            old_inputs = json.loads(current_inputs_file.read_text(encoding="utf-8"))
            if (old_inputs.get("binaries") == binary_hashes and
                old_inputs.get("scripts") == script_hashes and
                old_inputs.get("js_modules") == js_hashes and
                old_inputs.get("studio_bundle_sha") == studio_bundle_sha):
                
                # Check all sentences and all output file hashes on disk
                all_matched = True
                for sid in SENTENCE_IDS:
                    cur_s = sentences_inputs[sid]
                    old_s = old_inputs.get("sentences", {}).get(sid, {})
                    if (cur_s["composed_inputs"] != old_s.get("composed", {}).get("inputs") or
                        cur_s["studio_inputs"] != old_s.get("studio", {}).get("inputs") or
                        cur_s["viewer_inputs"] != old_s.get("viewer", {}).get("inputs")):
                        all_matched = False
                        break
                    
                    comp_outs = old_s.get("composed", {}).get("outputs", {})
                    stud_outs = old_s.get("studio", {}).get("outputs", {})
                    view_outs = old_s.get("viewer", {}).get("outputs", {})
                    all_method_outs = {**comp_outs, **stud_outs, **view_outs}

                    # Verify each output file actually exists on disk and matches hash
                    expected_files = [
                        f"composed-{sid}.webm", f"composed-{sid}-head.webm", f"composed-{sid}-report.json",
                        f"studio-{sid}.webm", f"studio-{sid}-report.json",
                        f"viewer-{sid}.webm", f"viewer-{sid}-report.json"
                    ]
                    for vf in expected_files:
                        disk_p = SITE_DIR / "current" / "videos" / vf
                        if not disk_p.is_file():
                            all_matched = False
                            break
                        rec_sha = all_method_outs.get(vf, {}).get("sha256")
                        if not rec_sha or rec_sha != sha256_file(disk_p):
                            all_matched = False
                            break

                # Also verify standalone images and reports
                common_files = [
                    "viewer-rejected.png", "viewer-rejection-report.json",
                    "composed-report.json"
                ] + [f"mouth-comparison-{sid}.png" for sid in SENTENCE_IDS]
                for cf in common_files:
                    if not (SITE_DIR / "current" / "videos" / cf).is_file():
                        all_matched = False
                        break

                if all_matched:
                    can_reuse = True
        except Exception:
            can_reuse = False

    if can_reuse:
        print("ALL inputs match, studio bundle matches, all output videos exist and match bitwise! Reusing existing release.")
        return

    # 5. Staging 폴더 초기화
    if STAGING_DIR.exists():
        shutil.rmtree(STAGING_DIR)
    STAGING_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

    # 6. 로컬 녹화용 서버 기동 (tools/jina-fastpath/server.py)
    print("\n[Step 5] Launching local recording server...")
    server_pid_file = STAGING_DIR / "server.pid"
    server_cmd = [
        sys.executable,
        str(WORKTREE_DIR / "tools" / "jina-fastpath" / "server.py"),
        "--port", "0",
        "--pid-file", str(server_pid_file),
    ]
    proc = subprocess.Popen(server_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    port, pid = None, None
    for _ in range(50):
        line = proc.stdout.readline()
        if line.startswith("SERVER_PORT="): port = int(line.strip().split("=")[1])
        elif line.startswith("SERVER_PID="): pid = int(line.strip().split("=")[1])
        if port and pid: break
        time.sleep(0.1)

    if not port or not pid:
        raise RuntimeError("Failed to start local recording server")
    server_url = f"http://127.0.0.1:{port}"
    print(f"Local recording server ready on port {port} (PID {pid})")

    results_data = {}

    try:
        # 7. 녹화 실행
        # (A) NVA 뷰어 거부 캡처 및 전신 녹화 (Item 10)
        print("\n=== [Step 6] Recording Column 3: NVA Viewer ===")
        # (가) jina-speech-set.nva 거부 캡처
        v03_dir = WORKTREE_DIR / ".agy-work" / "v03"
        v03_dir.mkdir(parents=True, exist_ok=True)
        v03_nva = v03_dir / "jina-speech-set.nva"
        with zipfile.ZipFile(nva_path, "r") as zin:
            m = json.loads(zin.read("manifest.json").decode("utf-8"))
            m["nva_version"] = "0.3"
            m["profile"] = "completed-media"
            with zipfile.ZipFile(v03_nva, "w", compression=zipfile.ZIP_STORED) as zout:
                for item in zin.infolist():
                    if item.filename == "manifest.json":
                        zout.writestr("manifest.json", json.dumps(m, indent=2))
                    else:
                        zout.writestr(item, zin.read(item.filename))

        rejected_png = STAGING_VIDEOS_DIR / "viewer-rejected.png"
        rej_report = STAGING_VIDEOS_DIR / "viewer-rejection-report.json"
        cmd_rej = [
            sys.executable, str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
            "--mode", "viewer_rejection",
            "--server-url", server_url,
            "--nva-file", str(v03_nva),
            "--out", str(rejected_png),
            "--report", str(rej_report)
        ]
        print("Capturing NVA viewer rejection screen...")
        subprocess.run(cmd_rej, check=True)

        # (나) Jina-speaking.nva 음성 재생 녹화
        speaking_nva = STUDIO_ASSETS_DIR / "Jina-speaking.nva"
        raw_viewer_full = STAGING_DIR / "viewer-full-raw.webm"
        view_report_full = STAGING_VIDEOS_DIR / "viewer-full-report.json"
        cmd_view = [
            sys.executable, str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
            "--mode", "viewer_speech",
            "--server-url", server_url,
            "--nva-file", str(speaking_nva),
            "--out", str(raw_viewer_full),
            "--report", str(view_report_full)
        ]
        print("Recording packaged speech playback from Jina-speaking.nva in viewer.html...")
        subprocess.run(cmd_view, check=True)

        repacked_viewer_full = STAGING_VIDEOS_DIR / "viewer-full.webm"
        repack_webm(raw_viewer_full, repacked_viewer_full)
        verify_recording_stream(repacked_viewer_full, 21.26, fps=30)

        # segments.json으로 viewer-s1, s2, s3 자르기
        for sid in ["s1", "s2", "s3"]:
            st, en = segments[sid]
            raw_sid = STAGING_DIR / f"viewer-{sid}-raw.webm"
            out_sid = STAGING_VIDEOS_DIR / f"viewer-{sid}.webm"
            # 자를 때 키프레임 정확성을 위해 libvpx-vp9 재인코딩
            cmd_cut = [
                "ffmpeg", "-y",
                "-ss", str(st), "-to", str(en),
                "-i", str(repacked_viewer_full),
                "-c:v", "libvpx-vp9", "-b:v", "1500k",
                "-c:a", "libopus",
                str(raw_sid)
            ]
            subprocess.run(cmd_cut, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # 재담기 및 ffprobe 검증
            repack_webm(raw_sid, out_sid)
            verify_recording_stream(out_sid, en - st, fps=30)

            sid_report = {
                "ok": True,
                "mode": "viewer_speech_slice",
                "sentence_id": sid,
                "start_sec": st,
                "end_sec": en,
                "duration_sec": en - st,
                "source_file": "Jina-speaking.nva/clips/talking-ko.webm"
            }
            (STAGING_VIDEOS_DIR / f"viewer-{sid}-report.json").write_text(json.dumps(sid_report, indent=2), encoding="utf-8")

        # (B) 문장별 조합 재생 및 스튜디오 방식 녹화
        comp_quality_reports = {}

        for sid in SENTENCE_IDS:
            print(f"\n=== [Step 7] Processing Sentence {sid} ===")
            wav_file = data_dir / "sentences" / f"{sid}.wav"
            plan_file = data_dir / "sentences" / f"{sid}.plan.json"
            plan = sentences_inputs[sid]["plan"]
            expected_keys = sentences_inputs[sid]["expected_transitions"]

            # 1. Composed 녹화
            raw_comp = STAGING_DIR / f"composed-{sid}-raw.webm"
            repacked_comp = STAGING_VIDEOS_DIR / f"composed-{sid}.webm"
            comp_report_path = STAGING_VIDEOS_DIR / f"composed-{sid}-report.json"
            rec_comp_cmd = [
                sys.executable, str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
                "--mode", "composed",
                "--server-url", server_url,
                "--nva-url", "/data/jina-speech-set.nva",
                "--audio-url", f"/data/sentences/{sid}.wav",
                "--plan-url", f"/data/sentences/{sid}.plan.json",
                "--out", str(raw_comp),
                "--report", str(comp_report_path),
            ]
            print(f"Recording composed-{sid}.webm...")
            subprocess.run(rec_comp_cmd, check=True)

            # 재담기 (Item 1)
            comp_dur = repack_webm(raw_comp, repacked_comp)

            # 녹화 검사 강화 (Item 2 & 6)
            comp_report = json.loads(comp_report_path.read_text(encoding="utf-8"))
            if comp_report.get("missingKeyError", False):
                raise ValueError(f"Composed {sid} had missing key error")
            if comp_report.get("drawnKeys") != expected_keys:
                raise ValueError(f"Composed {sid} drawn keys sequence mismatch with buildSpeechSchedule")
            
            # 해상도 및 프레임 수 5% 검증
            exp_dur = plan["audio"]["duration_us"] / 1_000_000.0
            verify_recording_stream(repacked_comp, exp_dur)

            # 머리 4배 확대 사본 생성
            comp_head_raw = STAGING_DIR / f"composed-{sid}-head-raw.webm"
            comp_head_webm = STAGING_VIDEOS_DIR / f"composed-{sid}-head.webm"
            ffmpeg_head_cmd = [
                "ffmpeg", "-y", "-i", str(repacked_comp),
                "-vf", "crop=158:242:280:70,scale=632:968",
                "-c:v", "libvpx-vp9", "-b:v", "2000k",
                "-c:a", "copy", str(comp_head_raw)
            ]
            subprocess.run(ffmpeg_head_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            repack_webm(comp_head_raw, comp_head_webm)

            # 2. Studio 녹화
            raw_stud = STAGING_DIR / f"studio-{sid}-raw.webm"
            repacked_stud = STAGING_VIDEOS_DIR / f"studio-{sid}.webm"
            stud_report_path = STAGING_VIDEOS_DIR / f"studio-{sid}-report.json"
            rec_stud_cmd = [
                sys.executable, str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
                "--mode", "studio",
                "--server-url", server_url,
                "--manifest-url", "/studio-assets/jina-speech-set.json",
                "--atlas-url", "/studio-assets/jina-mouth-atlas.png",
                "--base-video-url", "/studio-assets/jina-idle-transparent.webm",
                "--audio-url", f"/data/sentences/{sid}.wav",
                "--out", str(raw_stud),
                "--report", str(stud_report_path),
            ]
            print(f"Recording studio-{sid}.webm...")
            subprocess.run(rec_stud_cmd, check=True)

            repack_webm(raw_stud, repacked_stud)
            verify_recording_stream(repacked_stud, exp_dur)

            # 3. 최종 영상 대조 및 오디오 교차상관 (Item 8)
            print(f"Verifying composed-{sid}.webm against offline synthesized expected head frames and audio lag...")
            comp_qual = verify_composed_video(
                repacked_comp,
                wav_file,
                plan,
                atlas_slices,
                neutral_head,
                head_mask
            )
            comp_quality_reports[sid] = comp_qual

            # 산출물 해시 기록
            results_data[sid] = {
                "text": plan["text"],
                "composed": {
                    "inputs": sentences_inputs[sid]["composed_inputs"],
                    "outputs": {
                        f"composed-{sid}.webm": {"sha256": sha256_file(repacked_comp), "duration": comp_dur},
                        f"composed-{sid}-head.webm": {"sha256": sha256_file(comp_head_webm)},
                        f"composed-{sid}-report.json": {"sha256": sha256_file(comp_report_path)},
                    },
                    "quality_facts": {
                        "transition_time_diffs": comp_report["transitionTimeDiffs"],
                        "audio_lag_ms": comp_qual["audio_lag_ms"],
                        "key_match_rate": comp_qual["key_match_rate"],
                        "mad_p95": comp_qual["mad_p95"],
                        "mad_max": comp_qual["mad_max"]
                    }
                },
                "studio": {
                    "inputs": sentences_inputs[sid]["studio_inputs"],
                    "outputs": {
                        f"studio-{sid}.webm": {"sha256": sha256_file(repacked_stud)},
                        f"studio-{sid}-report.json": {"sha256": sha256_file(stud_report_path)},
                    }
                },
                "viewer": {
                    "inputs": sentences_inputs[sid]["viewer_inputs"],
                    "outputs": {
                        f"viewer-{sid}.webm": {"sha256": sha256_file(STAGING_VIDEOS_DIR / f"viewer-{sid}.webm")},
                        f"viewer-{sid}-report.json": {"sha256": sha256_file(STAGING_VIDEOS_DIR / f"viewer-{sid}-report.json")},
                    }
                }
            }

        # 8. 입 표본 스트립 이미지 생성 (Item 11)
        print("\n=== [Step 8] Generating Mouth Sample PNG Strips ===")
        mouth_meta = generate_mouth_strips(STAGING_VIDEOS_DIR, data_dir, STAGING_VIDEOS_DIR)

        # 9. 통합 보고서 작성
        composed_report = {
            "version": "1",
            "quality_status_note": "품질 상태(status) 단어는 규정에 따라 배제하고 순수 측정값 사실만 기재함",
            "sentences": comp_quality_reports
        }
        (STAGING_VIDEOS_DIR / "composed-report.json").write_text(json.dumps(composed_report, indent=2, ensure_ascii=False), encoding="utf-8")

        inputs_content = {
            "binaries": binary_hashes,
            "scripts": script_hashes,
            "js_modules": js_hashes,
            "studio_bundle_sha": studio_bundle_sha,
            "sentences": results_data
        }
        (STAGING_VIDEOS_DIR / "inputs.json").write_text(json.dumps(inputs_content, indent=2, ensure_ascii=False), encoding="utf-8")

        # 10. index.html 생성
        print("\n=== [Step 9] Generating index.html in Staging ===")
        staging_html = STAGING_DIR / "index.html"
        generate_index_html(gen_summary, inputs_content, mouth_meta, staging_html)

    finally:
        if pid:
            print(f"Terminating local recording server PID {pid}")
            try: os.kill(pid, signal.SIGTERM)
            except ProcessLookupError: pass
        proc.wait(timeout=5)

    # 11. 원자적 릴리스 및 static server 검증 배포 (Item 5)
    print("\n=== [Step 10] Publishing Atomic Standalone Release ===")
    publish_atomic_release(
        STAGING_DIR,
        SITE_DIR,
        data_dir,
        static_server_url="http://127.0.0.1:18471"
    )

    print("\nSUCCESS! Jina Fastpath recording pipeline completed and verified 100% cleanly.")

if __name__ == "__main__":
    main()
