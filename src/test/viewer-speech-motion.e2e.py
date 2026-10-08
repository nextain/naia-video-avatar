"""Browser integration test for NVA viewer speech motion playback.

Validates normal completion, explicit stop, invalid unit, asset hash error,
and interruptions at 120ms, 240ms, 480ms, 720ms, 960ms.
Verifies #animation visibility, internal state, clip, playback, and background restoration,
and verifies transition to idle when restored clips finish playback.
"""

from __future__ import annotations

import functools
import http.server
import json
import os
import socket
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE_DATA = Path(os.environ.get("NVA_SITE_DATA", "/var/home/luke/alpha-adk/.agents/work/nva-jina-fastpath-site/data"))
NVA_PATH = SITE_DATA / "jina-speech-set.nva"
AUDIO_PATH = SITE_DATA / "sentences/s1.wav"
PLAN_PATH = SITE_DATA / "sentences/s1.plan.json"

if not NVA_PATH.exists():
    raise SystemExit(f"Missing bundle: {NVA_PATH}")
if not AUDIO_PATH.exists():
    raise SystemExit(f"Missing audio: {AUDIO_PATH}")
if not PLAN_PATH.exists():
    raise SystemExit(f"Missing plan: {PLAN_PATH}")


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        if port == 18471:
            return find_free_port()
        return port


def start_server(port: int) -> http.server.HTTPServer:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.HTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def run_e2e() -> None:
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"

    console_errors: list[str] = []
    page_errors: list[str] = []
    external_requests: list[str] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--disable-gpu"])
            page = browser.new_page(viewport={"width": 1280, "height": 900})

            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))
            page.on("request", lambda req: external_requests.append(req.url)
                    if not req.url.startswith((f"{base_url}/", "blob:")) else None)

            page.goto(f"{base_url}/src/main/viewer.html")
            page.wait_for_load_state("networkidle")

            # Setup stage background
            page.locator("#backgroundColor").evaluate(
                "el => { el.value = '#203040'; el.dispatchEvent(new Event('input', { bubbles: true })); }"
            )
            assert page.locator("#stage").evaluate("el => el.style.backgroundColor") == "rgb(32, 48, 64)"

            # Load NVA bundle
            page.locator("#nvaFile").set_input_files(str(NVA_PATH))
            page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
            assert page.locator("#speechMotionSection").is_visible()

            # Load audio and SpeechPlan
            page.locator("#audioFile").set_input_files(str(AUDIO_PATH))
            page.locator("#planFile").set_input_files(str(PLAN_PATH))
            page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
            assert page.locator("#playComposed").is_enabled()
            assert page.locator("#stopComposed").is_enabled()

            # --- Case 1: Normal completion ---
            print("Testing Case 1: Normal completion...")
            page.locator("#action").select_option(value="motion")
            page.locator("#playAction").click()
            page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
            page.wait_for_timeout(200)

            snap1 = page.evaluate("() => window.__takeSnapshot()")
            assert snap1["state"] == "action"
            assert snap1["paused"] is False

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")

            # Wait for speechAudio to complete naturally
            page.wait_for_function("() => document.querySelector('#speechAudio')?.ended === true", timeout=15_000)
            page.locator("#status").filter(has_text="Playback complete; idle restored.").wait_for(timeout=5_000)

            # Assert canvas hidden, animation visible
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            # Assert restored state matches snapshot
            post1 = page.evaluate("() => ({ state: window.__animationPlayer().state, src: document.querySelector('#animation').src, paused: document.querySelector('#animation').paused, bg: document.querySelector('#stage').style.backgroundColor })")
            assert post1["state"] == snap1["state"], f"state mismatch: {post1['state']} vs {snap1['state']}"
            assert post1["src"] == snap1["src"]
            assert post1["paused"] == snap1["paused"]
            assert post1["bg"] == snap1["stageBgColor"]

            # Verify end-of-clip transition: when action clip ends, idle is restored
            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)
            assert page.locator("#animation").evaluate("v => v.loop === true")

            # --- Case 2: Explicit stop ---
            print("Testing Case 2: Explicit stop...")
            page.locator("#playAction").click()
            page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
            page.wait_for_timeout(200)

            snap2 = page.evaluate("() => window.__takeSnapshot()")
            assert snap2["state"] == "action"

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")
            page.wait_for_timeout(300)

            page.locator("#stopComposed").click()
            page.locator("#status").filter(has_text="Stopped; original ready state restored.").wait_for(timeout=5_000)

            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            post2 = page.evaluate("() => ({ state: window.__animationPlayer().state, src: document.querySelector('#animation').src, paused: document.querySelector('#animation').paused, bg: document.querySelector('#stage').style.backgroundColor })")
            assert post2["state"] == snap2["state"]
            assert post2["src"] == snap2["src"]
            assert post2["paused"] == snap2["paused"]

            # Finish action and verify idle
            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # --- Case 3: Invalid unit ---
            print("Testing Case 3: Invalid unit...")
            with tempfile.TemporaryDirectory(prefix="nva-invalid-unit-") as tmpdir:
                bad_plan_data = json.loads(PLAN_PATH.read_text())
                bad_plan_data["events"].append({"unit": "unknown-nonexistent-unit", "start_us": 1115000, "end_us": 1200000})
                bad_plan_path = Path(tmpdir) / "bad_unit.plan.json"
                bad_plan_path.write_text(json.dumps(bad_plan_data))

                snap3 = page.evaluate("() => window.__takeSnapshot()")
                page.locator("#planFile").set_input_files(str(bad_plan_path))
                page.wait_for_function("() => (document.getElementById('status')?.textContent || '').startsWith('Blocked:')", timeout=5_000)
                status_text = page.locator("#status").inner_text()
                assert "invalid SpeechPlan" in status_text, f"unexpected status: {status_text}"
                assert page.locator("#playComposed").is_disabled()
                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post3 = page.evaluate("() => ({ state: window.__animationPlayer()?.state, bg: document.querySelector('#stage').style.backgroundColor })")
                assert post3["state"] == snap3["state"]
                assert post3["bg"] == snap3["stageBgColor"]

                # Recover with good plan
                page.locator("#planFile").set_input_files(str(PLAN_PATH))
                page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
                assert page.locator("#playComposed").is_enabled()

            # --- Case 4: Asset hash error ---
            print("Testing Case 4: Asset hash error...")
            with tempfile.TemporaryDirectory(prefix="nva-bad-hash-") as tmpdir:
                bad_hash_data = json.loads(PLAN_PATH.read_text())
                bad_hash_data["audio"]["sha256"] = "0" * 64
                bad_hash_path = Path(tmpdir) / "bad_hash.plan.json"
                bad_hash_path.write_text(json.dumps(bad_hash_data))

                snap4 = page.evaluate("() => window.__takeSnapshot()")
                page.locator("#planFile").set_input_files(str(bad_hash_path))
                page.wait_for_function("() => (document.getElementById('status')?.textContent || '').startsWith('Blocked:')", timeout=5_000)
                status_text = page.locator("#status").inner_text()
                assert "audio hash mismatch" in status_text, f"unexpected status: {status_text}"
                assert page.locator("#playComposed").is_disabled()
                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post4 = page.evaluate("() => ({ state: window.__animationPlayer()?.state, bg: document.querySelector('#stage').style.backgroundColor })")
                assert post4["state"] == snap4["state"]
                assert post4["bg"] == snap4["stageBgColor"]

                # Recover with good plan
                page.locator("#planFile").set_input_files(str(PLAN_PATH))
                page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
                assert page.locator("#playComposed").is_enabled()

            # --- Case 5: Interruptions at 120ms, 240ms, 480ms, 720ms, 960ms ---
            offsets_ms = [120, 240, 480, 720, 960]
            for offset in offsets_ms:
                print(f"Testing Case 5: Interruption at {offset}ms...")
                page.locator("#playAction").click()
                page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
                page.wait_for_timeout(150)

                snap5 = page.evaluate("() => window.__takeSnapshot()")
                assert snap5["state"] == "action"

                page.locator("#playComposed").click()
                page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display === 'none'")

                target_sec = offset / 1000.0
                page.wait_for_function(f"() => (document.querySelector('#speechAudio')?.currentTime || 0) >= {target_sec}", timeout=5_000)

                # Interruption via re-request (#playComposed click)
                page.locator("#playComposed").click()
                page.locator("#status").filter(has_text="Interrupted; original ready state restored.").wait_for(timeout=5_000)

                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post5 = page.evaluate("() => ({ state: window.__animationPlayer().state, src: document.querySelector('#animation').src, paused: document.querySelector('#animation').paused, bg: document.querySelector('#stage').style.backgroundColor })")
                assert post5["state"] == snap5["state"], f"At {offset}ms: state mismatch {post5['state']} vs {snap5['state']}"
                assert post5["src"] == snap5["src"], f"At {offset}ms: src mismatch"
                assert post5["paused"] == snap5["paused"], f"At {offset}ms: paused mismatch"
                assert post5["bg"] == snap5["stageBgColor"], f"At {offset}ms: bg mismatch"

                # Verify idle restoration when action finishes
                page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
                page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # Assert clean network and browser runtime
            assert external_requests == [], f"external requests detected: {external_requests}"
            assert console_errors == [], f"console errors detected: {console_errors}"
            assert page_errors == [], f"page errors detected: {page_errors}"

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    print("PASS: viewer speech motion e2e: normal completion, explicit stop, invalid unit, asset hash mismatch, interruptions (120/240/480/720/960ms), idle restoration, external requests=0, browser errors=0")


if __name__ == "__main__":
    run_e2e()
