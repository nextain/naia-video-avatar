"""Chromium integration check for the completed-media NVA Player."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = os.environ.get("NVA_PLAYER_BASE_URL", "http://127.0.0.1:8099")


def encoded(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def build_fixture(path: Path, temporary: Path) -> None:
    speech = temporary / "greeting.mp4"
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", "color=c=0x203040:s=720x1280:r=25:d=1.2",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1.2",
        "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(speech),
    ], check=True)
    files = {
        "clips/idle.webm": (ROOT / "examples/naia.nva/clips/sijak.webm").read_bytes(),
        "clips/action.webm": (ROOT / "examples/demo.nva/clips/nod.webm").read_bytes(),
        "speech/greeting.mp4": speech.read_bytes(),
    }
    manifest = {
        "nva_version": "0.3",
        "profile": "completed-media",
        "meta": {"name": "Completed fixture", "delivery": {"kind": "completed-media", "realtime": False}},
        "canvas": {"width": 720, "height": 1280, "fps": 25},
        "background": {"type": "transparent"},
        "animations": {
            "idle": {"clip": "clips/idle.webm", "loop": True, "label": "Idle"},
            "action": {"clip": "clips/action.webm", "loop": False, "label": "Nod"},
        },
        "speech_clips": {
            "greeting": {
                "clip": "speech/greeting.mp4", "audio": "embedded",
                "language": "ko-KR", "label": "한국어 인사", "duration_ms": 1200,
            }
        },
        "scenario": {
            "nodes": {"start": {"type": "start"}, "idle": {"type": "scene", "animation": "idle"}},
            "edges": [{"from": "start", "to": "idle"}],
        },
    }
    files["manifest.json"] = encoded(manifest)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in files.items():
            archive.writestr(name, value)


with tempfile.TemporaryDirectory(prefix="nva-player-e2e-") as temporary_name:
    temporary = Path(temporary_name)
    fixture = temporary / "completed-player.nva"
    build_fixture(fixture, temporary)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        console_errors: list[str] = []
        page_errors: list[str] = []
        external_requests: list[str] = []
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("request", lambda request: external_requests.append(request.url)
                if not request.url.startswith((f"{BASE_URL}/", "blob:")) else None)
        page.goto(f"{BASE_URL}/src/main/viewer.html")
        page.wait_for_load_state("networkidle")
        page.locator("#nvaFile").set_input_files(str(fixture))
        page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
        assert page.locator("#speechClip option").count() == 1
        assert page.locator("#action option").count() == 1

        page.locator("#playSpeech").click()
        page.locator("#status").filter(has_text="Playing packaged speech").wait_for(timeout=5_000)
        assert page.locator("#animation").evaluate("video => video.muted === false && video.loop === false")
        page.locator("#status").filter(has_text="Playback complete; idle restored.").wait_for(timeout=10_000)
        assert page.locator("#animation").evaluate("video => video.muted === true && video.loop === true")

        page.locator("#playAction").click()
        page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
        page.locator("#stop").click()
        page.locator("#status").filter(has_text="Stopped; idle restored.").wait_for(timeout=5_000)
        assert page.locator("#animation").evaluate("video => video.muted === true && video.loop === true")
        assert external_requests == [], external_requests
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        browser.close()

print("PASS: completed speech, action, idle restoration, external requests=0, browser errors=0")
