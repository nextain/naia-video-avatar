#!/usr/bin/env python3
"""
tools/jina-fastpath/test_smoke_recording.py
가짜 번들을 사용하여 정적 서버 기동 -> recorder.py 실행 -> ffmpeg 검증 -> 서버 종료를 테스트.
결과는 .agy-work/smoke/ 아래에만 둔다.
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

WORKTREE_DIR = Path("/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath").resolve()
SMOKE_DIR = WORKTREE_DIR / ".agy-work" / "smoke"
PID_FILE = SMOKE_DIR / "server.pid"

def main():
    # 1. 서버 실행
    server_cmd = [
        sys.executable,
        str(WORKTREE_DIR / "tools" / "jina-fastpath" / "server.py"),
        "--port", "0",
        "--pid-file", str(PID_FILE),
    ]
    proc = subprocess.Popen(server_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    port = None
    pid = None

    try:
        # 서버 출력에서 PORT와 PID 읽기
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
            raise RuntimeError("Failed to get server port or PID")

        print(f"Static server running at 127.0.0.1:{port}, PID={pid}")
        server_url = f"http://127.0.0.1:{port}"

        # 2. Composed 녹화 테스트
        out_webm = SMOKE_DIR / "smoke-composed.webm"
        out_report = SMOKE_DIR / "smoke-composed-report.json"

        rec_cmd = [
            sys.executable,
            str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
            "--mode", "composed",
            "--server-url", server_url,
            "--nva-url", "/.agy-work/smoke/smoke.nva",
            "--audio-url", "/.agy-work/smoke/smoke.wav",
            "--plan-url", "/.agy-work/smoke/smoke.plan.json",
            "--out", str(out_webm),
            "--report", str(out_report),
        ]
        print("Running composed smoke recording...")
        res = subprocess.run(rec_cmd, capture_output=True, text=True)
        print("Recorder stdout:", res.stdout)
        print("Recorder stderr:", res.stderr)
        if res.returncode != 0:
            raise RuntimeError("Composed smoke recording failed")

        # 3. Studio 녹화 테스트
        studio_webm = SMOKE_DIR / "smoke-studio.webm"
        studio_report = SMOKE_DIR / "smoke-studio-report.json"

        rec_studio_cmd = [
            sys.executable,
            str(WORKTREE_DIR / "tools" / "jina-fastpath" / "recorder.py"),
            "--mode", "studio",
            "--server-url", server_url,
            "--manifest-url", "/studio-assets/jina-speech-set.json",
            "--atlas-url", "/studio-assets/jina-mouth-atlas.png",
            "--base-video-url", "/studio-assets/jina-idle-transparent.webm",
            "--audio-url", "/.agy-work/smoke/smoke.wav",
            "--out", str(studio_webm),
            "--report", str(studio_report),
        ]
        print("Running studio smoke recording...")
        res_studio = subprocess.run(rec_studio_cmd, capture_output=True, text=True)
        print("Studio recorder stdout:", res_studio.stdout)
        print("Studio recorder stderr:", res_studio.stderr)
        if res_studio.returncode != 0:
            raise RuntimeError("Studio smoke recording failed")

        # 4. ffmpeg 확대 사본 테스트
        head_webm = SMOKE_DIR / "smoke-composed-head.webm"
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", str(out_webm),
            "-vf", "crop=158:242:280:70,scale=632:968",
            "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "20",
            "-c:a", "copy", str(head_webm)
        ]
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Head zoom test succeeded.")

        print("ALL SMOKE RECORDING TESTS PASSED!")

    finally:
        # 정확한 PID로 서버 종료
        if pid:
            print(f"Terminating server PID {pid}")
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        proc.wait(timeout=5)

if __name__ == "__main__":
    main()
