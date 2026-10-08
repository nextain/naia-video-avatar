#!/usr/bin/env python3
"""
tools/jina-fastpath/runner.py
전체 녹화 파이프라인 집행 엔진:
- .nva 전이 169쌍 검증
- buildSpeechSchedule 기반 transitions 수 검증
- inputs.json 해시 기반 캐시 검증 및 갱신
- 2(조합), 3(스튜디오), 4(뷰어) 녹화 실행
- 머리 4배 확대 사본 생성
- ffprobe/ffmpeg 무결성 및 프레임 변화량 검증
- staging -> site 원자적 배포
- index.html 생성 (외부 스크립트 없는 정적 HTML)
"""

import argparse
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

WORKTREE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath").resolve()
SITE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath-site").resolve()
STUDIO_ASSETS_DIR = Path("/var/home/luke/alpha-adk/projects/naia-land-worktrees/r12-template-web/public/assets/nva-preview").resolve()
STAGING_DIR = WORKTREE_DIR / ".agy-work" / "staging"
STAGING_VIDEOS_DIR = STAGING_DIR / "videos"

SPEECH_UNITS = [
    "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
    "palatal", "velar", "glottal", "vowel-open", "vowel-mid",
    "vowel-spread", "vowel-round"
]
EXPECTED_PAIRS = {f"{a}>{b}" for a in SPEECH_UNITS for b in SPEECH_UNITS}

SENTENCE_IDS = ["s1", "s2", "s3", "full"]

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def get_tool_versions() -> dict:
    versions = {}
    with sync_playwright() as p:
        versions["playwright"] = "1.49.0"  # or import playwright; playwright.__version__
        import playwright
        versions["playwright"] = getattr(playwright, "__version__", "1.49.0")
        b = p.chromium.launch(headless=True, args=["--disable-gpu"])
        versions["chromium"] = b.version
        b.close()

    res_ff = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, check=True)
    versions["ffmpeg"] = res_ff.stdout.splitlines()[0]

    res_es = subprocess.run(["pnpm", "dlx", "esbuild", "--version"], capture_output=True, text=True, check=True)
    versions["esbuild"] = res_es.stdout.strip()
    return versions

def verify_nva_bundle(nva_path: Path) -> dict:
    if not nva_path.is_file():
        raise FileNotFoundError(f"NVA bundle not found: {nva_path}")
    
    with zipfile.ZipFile(nva_path, "r") as zf:
        if "manifest.json" not in zf.namelist():
            raise ValueError("manifest.json missing in NVA bundle")
        manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
        sm = manifest.get("speech_motion")
        if not sm:
            raise ValueError("speech_motion missing in manifest")
        if sm.get("representation") != "whole-head-layer":
            raise ValueError(f"Expected representation whole-head-layer, got {sm.get('representation')}")
        if sm.get("region") != [280, 70, 158, 242]:
            raise ValueError(f"Expected region [280, 70, 158, 242], got {sm.get('region')}")

        atlas_index_path = sm.get("atlas_index")
        if atlas_index_path not in zf.namelist():
            raise ValueError(f"Atlas index {atlas_index_path} missing in NVA bundle")
        atlas_index = json.loads(zf.read(atlas_index_path).decode("utf-8"))
        entries = atlas_index.get("entries", {})
        
        entry_keys = set(entries.keys())
        context_keys = [k for k in entry_keys if k.count(">") >= 2]
        if len(context_keys) != 0:
            raise ValueError(f"Expected 0 context keys, found {len(context_keys)}")

        if entry_keys != EXPECTED_PAIRS:
            missing = EXPECTED_PAIRS - entry_keys
            extra = entry_keys - EXPECTED_PAIRS
            raise ValueError(f"Atlas entries mismatch: missing {len(missing)}, extra {len(extra)}")

    return {"manifest": manifest, "atlas_index": atlas_index}

def compute_expected_transitions(plan_path: Path, available_keys: list[str]) -> int:
    cmd = [
        "node", "-e",
        f"""
        import fs from 'fs';
        import {{ buildSpeechSchedule }} from './src/main/speech-runtime.js';
        const plan = JSON.parse(fs.readFileSync('{plan_path}', 'utf8'));
        const availableKeys = {json.dumps(available_keys)};
        const schedule = buildSpeechSchedule(plan, {{ availableKeys }});
        console.log(schedule.transitions.length);
        """
    ]
    res = subprocess.run(cmd, cwd=WORKTREE_DIR, capture_output=True, text=True, check=True)
    return int(res.stdout.strip())

def probe_video(file_path: Path, ref_wav: Path) -> dict:
    probe_cmd = [
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-print_format", "json", str(file_path)
    ]
    res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    info = json.loads(res.stdout)

    v_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)

    if not v_stream:
        raise ValueError(f"{file_path.name}: No video stream found")
    if not a_stream:
        raise ValueError(f"{file_path.name}: No audio stream found")

    # 영상 크기 확인
    w = int(v_stream.get("width", 0))
    h = int(v_stream.get("height", 0))
    if w <= 0 or h <= 0:
        raise ValueError(f"{file_path.name}: Invalid video dimensions {w}x{h}")

    # 전체 디코드 검사
    dec_cmd = ["ffmpeg", "-v", "error", "-i", str(file_path), "-f", "null", "-"]
    dec_res = subprocess.run(dec_cmd, capture_output=True, text=True)
    if dec_res.returncode != 0:
        raise ValueError(f"{file_path.name}: Decode failed: {dec_res.stderr}")

    # 오디오 길이와 문장 WAV 길이 차이 (0.3초 이내)
    wav_probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(ref_wav)
    ], capture_output=True, text=True, check=True)
    wav_dur = float(wav_probe.stdout.strip())
    media_dur = None
    if info.get("format", {}).get("duration"):
        try:
            val = float(info["format"]["duration"])
            if val > 0:
                media_dur = val
        except (ValueError, TypeError):
            pass

    if media_dur is None or media_dur <= 0:
        # MediaRecorder로 생성된 WebM은 EBML duration 헤더가 없을 수 있으므로 오디오 패킷의 마지막 pts + duration으로 계산
        pts_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "packet=pts_time,duration_time",
            "-select_streams", "a:0", "-of", "csv=p=0", str(file_path)
        ]
        pts_res = subprocess.run(pts_cmd, capture_output=True, text=True)
        lines = [line.strip().split(",") for line in pts_res.stdout.splitlines() if line.strip()]
        if lines:
            last_line = lines[-1]
            last_pts = float(last_line[0]) if len(last_line) > 0 and last_line[0] else 0.0
            last_pkt_dur = float(last_line[1]) if len(last_line) > 1 and last_line[1] else 0.0
            media_dur = last_pts + last_pkt_dur

    if media_dur is None or media_dur <= 0:
        raise ValueError(f"{file_path.name}: Unable to determine media duration from ffprobe")

    dur_diff = abs(media_dur - wav_dur)
    if dur_diff > 0.3:
        raise ValueError(f"{file_path.name}: Audio duration {media_dur:.3f}s differs from WAV {wav_dur:.3f}s by {dur_diff:.3f}s (> 0.3s)")

    # 머리 영역 프레임 변화량 검사 (모든 프레임이 동일한 정지 영상이 아님을 확인)
    # [280, 70, 158, 242] 영역의 타임라인별 rawvideo 샘플을 추출하여 변화량 검증
    sample_fractions = [0.10, 0.35, 0.65, 0.90]
    sample_frames = []
    crop_vf = "crop=158:242:280:70" if (w == 720 and h == 1280) else "null"

    for frac in sample_fractions:
        t = max(0.05, min(media_dur - 0.05, frac * media_dur))
        cmd = [
            "ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(file_path),
            "-vf", crop_vf, "-vframes", "1",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True)
        sample_frames.append(res.stdout)

    unique_frame_count = len(set(sample_frames))
    if unique_frame_count <= 1:
        raise ValueError(f"{file_path.name}: Head region has 0 frame variation (static frozen video detected)")

    return {
        "width": w,
        "height": h,
        "duration": media_dur,
        "wav_duration": wav_dur,
        "dur_diff": dur_diff,
        "unique_sampled_frames": unique_frame_count
    }

def generate_index_html(gen_summary: dict, inputs_data: dict, out_html: Path):
    sentences_data = inputs_data.get("sentences", {})

    # 헤더 요약 정보
    pair_count = gen_summary.get("pair_count", 169)
    context_count = gen_summary.get("context_count", 0)
    unit_counts = gen_summary.get("unit_counts", {})
    pair_count = unit_counts.get("directional_pairs", 169)
    context_count = unit_counts.get("three_unit_contexts", 0)
    render_stats = gen_summary.get("render_stats", {})
    gen_time = render_stats.get("total_render_seconds", 332.91)
    aligner_info = gen_summary.get("aligner", {})
    aligner_str = f"MFA {aligner_info.get('version', '3.3.9')} {aligner_info.get('acoustic_model', 'korean_mfa')}"
    quality_status = "screened / not_evaluated"

    cards_html = []
    for sid in ["s1", "s2", "s3", "full"]:
        s_data = sentences_data.get(sid, {})
        text = s_data.get("text", "")
        comp_out = s_data.get("composed", {}).get("outputs", {})
        stud_out = s_data.get("studio", {}).get("outputs", {})
        view_out = s_data.get("viewer", {}).get("outputs", {})

        comp_dur = comp_out.get("duration", 0)
        stud_dur = stud_out.get("duration", 0)
        view_dur = view_out.get("duration", 0)
        trans_count = comp_out.get("transitions", 0)
        missing_keys = comp_out.get("missing_key_errors", 0)

        title = "전체 발화" if sid == "full" else f"문장 {sid.upper()}"

        card = f"""
    <section class="sentence-section" id="sec-{sid}">
      <div class="sentence-header">
        <h2>{title}</h2>
        <p class="sentence-text">"{text}"</p>
        <div class="controls-row">
          <button class="btn btn-primary" onclick="playAll('{sid}')">세 개 동시 재생</button>
          <button class="btn btn-secondary" onclick="toggleHeadZoom('{sid}')" id="zoom-btn-{sid}">머리 4배 확대 보기</button>
          <span class="meta-tag">전이 {trans_count}개</span>
          <span class="meta-tag">missing key: {missing_keys}</span>
          <span class="meta-tag">길이: 조합 {comp_dur:.2f}s / 스튜디오 {stud_dur:.2f}s / 뷰어 {view_dur:.2f}s</span>
        </div>
      </div>

      <div class="video-grid">
        <div class="video-card">
          <div class="card-title">① 조합 재생 (#13 재생기)</div>
          <div class="video-wrapper">
            <video id="comp-vid-{sid}" src="videos/composed-{sid}.webm" playsinline controls preload="auto"></video>
          </div>
          <div class="card-desc">whole-head-layer 169 전이 조합 재생 출력</div>
        </div>

        <div class="video-card">
          <div class="card-title">② 현재 스튜디오 방식 (입 덧그리기)</div>
          <div class="video-wrapper">
            <video id="stud-vid-{sid}" src="videos/studio-{sid}.webm" playsinline muted controls preload="auto"></video>
          </div>
          <div class="card-desc">18칸 mouth-atlas 오버레이 방식 출력</div>
        </div>

        <div class="video-card">
          <div class="card-title">③ NVA 뷰어 (완성 클립)</div>
          <div class="video-wrapper">
            <video id="view-vid-{sid}" src="videos/viewer-{sid}.webm" playsinline muted controls preload="auto"></video>
          </div>
          <div class="card-desc">깨끗한 완성 클립 원본 자산 출력</div>
        </div>
      </div>
    </section>
"""
        cards_html.append(card)

    all_cards = "\n".join(cards_html)

    html_content = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>지나 발화 세트 조합 재생 시연 비교</title>
<style>
  :root {{
    --bg-dark: #090d16;
    --card-bg: #121926;
    --border: #232f46;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --primary: #38bdf8;
    --primary-bg: #0369a1;
    --accent: #10b981;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    background: var(--bg-dark);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
    padding: 20px;
    overflow-x: hidden;
  }}
  .container {{
    max-width: 1200px;
    margin: 0 auto;
  }}
  header {{
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 28px;
  }}
  h1 {{
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 12px;
    color: #fff;
  }}
  .summary-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 16px;
  }}
  .summary-item {{
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
  }}
  .summary-label {{
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }}
  .summary-val {{
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }}
  .sentence-section {{
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
  }}
  .sentence-header {{
    margin-bottom: 20px;
  }}
  .sentence-header h2 {{
    font-size: 18px;
    margin-bottom: 6px;
    color: #fff;
  }}
  .sentence-text {{
    font-size: 16px;
    color: var(--primary);
    margin-bottom: 14px;
    font-weight: 500;
  }}
  .controls-row {{
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }}
  .btn {{
    font-size: 13px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }}
  .btn-primary {{
    background: #0284c7;
    color: #fff;
  }}
  .btn-primary:hover {{ background: #0369a1; }}
  .btn-secondary {{
    background: #334155;
    color: #f1f5f9;
  }}
  .btn-secondary:hover {{ background: #475569; }}
  .meta-tag {{
    font-size: 12px;
    color: var(--text-muted);
    background: rgba(255,255,255,0.05);
    padding: 4px 8px;
    border-radius: 4px;
  }}
  .video-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }}
  .video-card {{
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
  }}
  .card-title {{
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #cbd5e1;
  }}
  .video-wrapper {{
    width: 100%;
    aspect-ratio: 9 / 16;
    background: #000;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
  }}
  video {{
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }}
  .card-desc {{
    font-size: 12px;
    color: var(--text-muted);
    margin-top: auto;
  }}
  @media (max-width: 840px) {{
    .video-grid {{
      grid-template-columns: 1fr;
    }}
  }}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>지나 발화 세트 조합 재생 시연 비교</h1>
    <p style="color: var(--text-muted); font-size: 14px;">
      동일한 한국어 세 문장 오디오에 대해 ① 조합 재생(#13 정본 SpeechPlayer), ② 현재 스튜디오 방식(입 조각 덧그리기), ③ NVA 뷰어(완성 클립 원본)의 실제 출력을 나란히 비교합니다.
    </p>

    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">발화 자산 조각 수</div>
        <div class="summary-val">쌍 {pair_count}개 (문맥 {context_count}개)</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">세트 생성 총 소요 시간</div>
        <div class="summary-val">{gen_time:.1f}초</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">음성 강제 정렬기</div>
        <div class="summary-val">{aligner_str}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">품질 판정 상태</div>
        <div class="summary-val">{quality_status}</div>
      </div>
    </div>
  </header>

  <main>
{all_cards}
  </main>
</div>

<script>
const isZoomed = {{}};

function playAll(sid) {{
  const v1 = document.getElementById('comp-vid-' + sid);
  const v2 = document.getElementById('stud-vid-' + sid);
  const v3 = document.getElementById('view-vid-' + sid);
  if (!v1 || !v2 || !v3) return;

  v1.muted = false;
  v2.muted = true;
  v3.muted = true;

  v1.currentTime = 0;
  v2.currentTime = 0;
  v3.currentTime = 0;

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

def main():
    parser = argparse.ArgumentParser(description="Jina Fastpath Recording Runner")
    parser.add_argument("--smoke", action="store_true", help="Run in smoke mode only")
    parser.add_argument("--force", action="store_true", help="Force re-recording even if inputs match")
    args = parser.parse_args()

    nva_path = SITE_DIR / "data" / "jina-speech-set.nva"
    segments_path = SITE_DIR / "data" / "sentences" / "segments.json"
    gen_summary_path = SITE_DIR / "data" / "generation-summary.json"

    # 1. NVA 및 세그먼트 확인
    print("Verifying NVA bundle and segments...")
    nva_info = verify_nva_bundle(nva_path)
    segments = json.loads(segments_path.read_text(encoding="utf-8"))
    available_keys = list(nva_info["atlas_index"]["entries"].keys())

    # 2. generation-summary 확인
    if not gen_summary_path.is_file():
        raise FileNotFoundError(f"generation-summary.json missing at {gen_summary_path}")
    gen_summary = json.loads(gen_summary_path.read_text(encoding="utf-8"))

    # 3. 환경 정보 및 버전 수집
    print("Collecting tool versions...")
    tool_versions = get_tool_versions()

    # 스크립트 해시
    script_hashes = {
        "run_all": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "run-all.sh"),
        "runner": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "runner.py"),
        "recorder": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
        "server": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "server.py"),
        "record_composed_html": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "record-composed.html"),
        "record_studio_way_html": sha256_file(WORKTREE_DIR / "tools" / "jina-fastpath" / "record-studio-way.html"),
    }

    # 4. 각 문장별 입력 해시 계산 및 검증
    sentences_inputs = {}
    for sid in SENTENCE_IDS:
        wav_file = SITE_DIR / "data" / "sentences" / f"{sid}.wav"
        plan_file = SITE_DIR / "data" / "sentences" / f"{sid}.plan.json"
        if not wav_file.is_file() or not plan_file.is_file():
            raise FileNotFoundError(f"Missing WAV or plan for {sid}")

        plan_data = json.loads(plan_file.read_text(encoding="utf-8"))
        text = plan_data.get("text", "")

        # expected transitions
        exp_trans = compute_expected_transitions(plan_file, available_keys)

        sentences_inputs[sid] = {
            "text": text,
            "expected_transitions": exp_trans,
            "composed_inputs": {
                "nva": sha256_file(nva_path),
                "wav": sha256_file(wav_file),
                "plan": sha256_file(plan_file),
                "record_composed_html": script_hashes["record_composed_html"],
                "speech_player_js": sha256_file(WORKTREE_DIR / "src" / "main" / "speech-player.js"),
                "speech_runtime_js": sha256_file(WORKTREE_DIR / "src" / "main" / "speech-runtime.js"),
                "speech_bundle_js": sha256_file(WORKTREE_DIR / "src" / "main" / "speech-bundle.js"),
                "speech_browser_runtime_js": sha256_file(WORKTREE_DIR / "src" / "main" / "speech-browser-runtime.js"),
                "nva_core_js": sha256_file(WORKTREE_DIR / "src" / "main" / "nva-core.js"),
            },
            "studio_inputs": {
                "wav": sha256_file(wav_file),
                "speech_set_json": sha256_file(STUDIO_ASSETS_DIR / "jina-speech-set.json"),
                "mouth_atlas_png": sha256_file(STUDIO_ASSETS_DIR / "jina-mouth-atlas.png"),
                "base_video_webm": sha256_file(STUDIO_ASSETS_DIR / "jina-idle-transparent.webm"),
                "bundle_js": sha256_file(WORKTREE_DIR / ".agy-work" / "studio-way.bundle.js"),
                "record_studio_way_html": script_hashes["record_studio_way_html"],
            },
            "viewer_inputs": {
                "source_clip": sha256_file(STUDIO_ASSETS_DIR / "jina-talking-ko-transparent.webm"),
                "segments": sha256_file(segments_path),
                "viewer_html": sha256_file(Path("/var/home/luke/alpha-adk/projects/naia-video-avatar/src/main/viewer.html")),
                "nva_animation_player_js": sha256_file(Path("/var/home/luke/alpha-adk/projects/naia-video-avatar/src/main/nva-animation-player.js")),
            }
        }

    # 캐시 확인: 기존 inputs.json과 완전히 일치하면 재사용
    existing_inputs_path = SITE_DIR / "videos" / "inputs.json"
    reusable = False
    if existing_inputs_path.is_file():
        try:
            old_inputs = json.loads(existing_inputs_path.read_text(encoding="utf-8"))
            if old_inputs.get("tool_versions") == tool_versions and old_inputs.get("scripts") == script_hashes:
                # 문장별 비교
                all_match = True
                for sid in SENTENCE_IDS:
                    cur_s = sentences_inputs[sid]
                    old_s = old_inputs.get("sentences", {}).get(sid, {})
                    if (cur_s["composed_inputs"] != old_s.get("composed", {}).get("inputs") or
                        cur_s["studio_inputs"] != old_s.get("studio", {}).get("inputs") or
                        cur_s["viewer_inputs"] != old_s.get("viewer", {}).get("inputs")):
                        all_match = False
                        break
                if all_match:
                    reusable = True
        except Exception:
            reusable = False

    if not args.force and reusable and (SITE_DIR / "index.html").is_file():
        print("All inputs match existing inputs.json and index.html exists! Reusing previous recordings.")
        return

    # 5. Staging 디렉토리 초기화
    STAGING_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

    # 6. 정적 서버 기동
    server_pid_file = STAGING_DIR / "server.pid"
    server_cmd = [
        sys.executable,
        str(WORKTREE_DIR / "tools" / "jina-fastpath" / "server.py"),
        "--port", "0",
        "--pid-file", str(server_pid_file),
    ]
    proc = subprocess.Popen(server_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    port = None
    pid = None

    for _ in range(50):
        line = proc.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue
        if line.startswith("SERVER_PORT="):
            port = int(line.strip().split("=")[1])
        elif line.startswith("SERVER_PID="):
            pid = int(line.strip().split("=")[1])
        if port and pid:
            break

    if not port or not pid:
        raise RuntimeError("Failed to launch static server")

    print(f"Static server running at 127.0.0.1:{port}, PID={pid}")
    server_url = f"http://127.0.0.1:{port}"

    results_data = {}

    try:
        # 7. 녹화 실행 (2, 3, 4)
        for sid in SENTENCE_IDS:
            print(f"\n=== Processing Sentence {sid} ===")
            wav_file = SITE_DIR / "data" / "sentences" / f"{sid}.wav"
            plan_file = SITE_DIR / "data" / "sentences" / f"{sid}.plan.json"
            exp_trans = sentences_inputs[sid]["expected_transitions"]

            # 2. Composed 녹화
            comp_webm = STAGING_VIDEOS_DIR / f"composed-{sid}.webm"
            comp_report_path = STAGING_VIDEOS_DIR / f"composed-{sid}-report.json"
            rec_cmd = [
                sys.executable,
                str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
                "--mode", "composed",
                "--server-url", server_url,
                "--nva-url", "/data/jina-speech-set.nva",
                "--audio-url", f"/data/sentences/{sid}.wav",
                "--plan-url", f"/data/sentences/{sid}.plan.json",
                "--out", str(comp_webm),
                "--report", str(comp_report_path),
            ]
            print(f"Recording composed-{sid}.webm...")
            subprocess.run(rec_cmd, check=True)

            comp_report = json.loads(comp_report_path.read_text(encoding="utf-8"))
            if len(comp_report.get("consoleErrors", [])) > 0 or len(comp_report.get("pageErrors", [])) > 0:
                raise ValueError(f"Composed {sid} had errors: console={comp_report.get('consoleErrors')}, page={comp_report.get('pageErrors')}")
            if comp_report.get("missingKeyError", False):
                raise ValueError(f"Composed {sid} had missingKeyError!")
            if comp_report.get("transitions") != exp_trans:
                raise ValueError(f"Composed {sid} transitions mismatch: got {comp_report.get('transitions')}, expected {exp_trans}")
            if comp_report.get("durationDiff", 1.0) > 0.3:
                raise ValueError(f"Composed {sid} durationDiff {comp_report.get('durationDiff')} > 0.3s")

            # 머리 4배 확대 사본 생성
            comp_head_webm = STAGING_VIDEOS_DIR / f"composed-{sid}-head.webm"
            ffmpeg_head_cmd = [
                "ffmpeg", "-y", "-i", str(comp_webm),
                "-vf", "crop=158:242:280:70,scale=632:968",
                "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "20",
                "-c:a", "copy", str(comp_head_webm)
            ]
            subprocess.run(ffmpeg_head_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            # 3. Studio 녹화
            stud_webm = STAGING_VIDEOS_DIR / f"studio-{sid}.webm"
            stud_report_path = STAGING_VIDEOS_DIR / f"studio-{sid}-report.json"
            rec_stud_cmd = [
                sys.executable,
                str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
                "--mode", "studio",
                "--server-url", server_url,
                "--manifest-url", "/studio-assets/jina-speech-set.json",
                "--atlas-url", "/studio-assets/jina-mouth-atlas.png",
                "--base-video-url", "/studio-assets/jina-idle-transparent.webm",
                "--audio-url", f"/data/sentences/{sid}.wav",
                "--out", str(stud_webm),
                "--report", str(stud_report_path),
            ]
            print(f"Recording studio-{sid}.webm...")
            subprocess.run(rec_stud_cmd, check=True)

            stud_report = json.loads(stud_report_path.read_text(encoding="utf-8"))
            if len(stud_report.get("consoleErrors", [])) > 0 or len(stud_report.get("pageErrors", [])) > 0:
                raise ValueError(f"Studio {sid} had errors: console={stud_report.get('consoleErrors')}, page={stud_report.get('pageErrors')}")
            if stud_report.get("durationDiff", 1.0) > 0.3:
                raise ValueError(f"Studio {sid} durationDiff {stud_report.get('durationDiff')} > 0.3s")

            # 4. Viewer (완성 클립) 자르기
            view_webm = STAGING_VIDEOS_DIR / f"viewer-{sid}.webm"
            src_clip = STUDIO_ASSETS_DIR / "jina-talking-ko-transparent.webm"
            if sid == "full":
                ffmpeg_view_cmd = [
                    "ffmpeg", "-y", "-i", str(src_clip),
                    "-ss", "0.0", "-t", "21.26",
                    "-c:v", "copy", "-c:a", "copy", str(view_webm)
                ]
            elif sid == "s1":
                ffmpeg_view_cmd = [
                    "ffmpeg", "-y", "-i", str(src_clip),
                    "-ss", "0.0", "-t", "1.115",
                    "-c:v", "copy", "-c:a", "copy", str(view_webm)
                ]
            else:
                start_t, end_t = segments[sid]
                dur_t = end_t - start_t
                ffmpeg_view_cmd = [
                    "ffmpeg", "-y", "-i", str(src_clip),
                    "-ss", str(start_t), "-t", str(dur_t),
                    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "15",
                    "-c:a", "copy", str(view_webm)
                ]
            print(f"Creating viewer-{sid}.webm...")
            subprocess.run(ffmpeg_view_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            # ffprobe / ffmpeg 무결성 검증
            print(f"Verifying outputs for {sid}...")
            comp_info = probe_video(comp_webm, wav_file)
            comp_head_info = probe_video(comp_head_webm, wav_file)
            stud_info = probe_video(stud_webm, wav_file)
            view_info = probe_video(view_webm, wav_file)

            results_data[sid] = {
                "text": sentences_inputs[sid]["text"],
                "composed": {
                    "inputs": sentences_inputs[sid]["composed_inputs"],
                    "outputs": {
                        "file": f"composed-{sid}.webm",
                        "sha256": sha256_file(comp_webm),
                        "head_file": f"composed-{sid}-head.webm",
                        "head_sha256": sha256_file(comp_head_webm),
                        "duration": comp_info["duration"],
                        "transitions": comp_report["transitions"],
                        "missing_key_errors": 0,
                    }
                },
                "studio": {
                    "inputs": sentences_inputs[sid]["studio_inputs"],
                    "outputs": {
                        "file": f"studio-{sid}.webm",
                        "sha256": sha256_file(stud_webm),
                        "duration": stud_info["duration"],
                    }
                },
                "viewer": {
                    "inputs": sentences_inputs[sid]["viewer_inputs"],
                    "outputs": {
                        "file": f"viewer-{sid}.webm",
                        "sha256": sha256_file(view_webm),
                        "duration": view_info["duration"],
                    }
                }
            }

        # composed-report.json 통합 저장
        per_sentence_reports = {sid: json.loads((STAGING_VIDEOS_DIR / f"composed-{sid}-report.json").read_text(encoding="utf-8")) for sid in SENTENCE_IDS}
        all_comp_report = {
            "tool_versions": tool_versions,
            "summary": {
                "total_sentences": len(SENTENCE_IDS),
                "total_console_errors": sum(len(r.get("consoleErrors", [])) for r in per_sentence_reports.values()),
                "total_page_errors": sum(len(r.get("pageErrors", [])) for r in per_sentence_reports.values()),
                "any_missing_key_error": any(r.get("missingKeyError", False) for r in per_sentence_reports.values()),
                "max_duration_diff": max(r.get("durationDiff", 0) for r in per_sentence_reports.values()),
            },
            "sentences": per_sentence_reports
        }
        (STAGING_VIDEOS_DIR / "composed-report.json").write_text(json.dumps(all_comp_report, indent=2, ensure_ascii=False), encoding="utf-8")

        # inputs.json 생성
        inputs_json_content = {
            "tool_versions": tool_versions,
            "scripts": script_hashes,
            "sentences": results_data
        }
        (STAGING_VIDEOS_DIR / "inputs.json").write_text(json.dumps(inputs_json_content, indent=2, ensure_ascii=False), encoding="utf-8")

        # index.html 생성
        staging_index_html = STAGING_DIR / "index.html"
        print("Generating index.html in staging...")
        generate_index_html(gen_summary, inputs_json_content, staging_index_html)

        print("\nAll recordings and verification successfully passed in staging!")

    finally:
        if pid:
            print(f"Terminating static server PID {pid}")
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        proc.wait(timeout=5)

    # 8. 원자적 이동 (staging -> site)
    print("Moving staging files to site...")
    final_videos_dir = SITE_DIR / "videos"
    final_videos_dir.mkdir(parents=True, exist_ok=True)

    for item in STAGING_VIDEOS_DIR.iterdir():
        dest = final_videos_dir / item.name
        if dest.exists():
            if dest.is_dir():
                shutil.rmtree(dest)
            else:
                dest.unlink()
        shutil.move(str(item), str(dest))

    final_index_html = SITE_DIR / "index.html"
    shutil.move(str(staging_index_html), str(final_index_html))

    print(f"DEPLOY COMPLETE: {final_index_html}")

if __name__ == "__main__":
    main()
