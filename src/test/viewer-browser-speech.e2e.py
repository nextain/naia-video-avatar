"""Chromium E2E test for NVA Player browser-speech and baseline alignment."""
from __future__ import annotations

import functools
import http.server
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import time
import zipfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE_URL = os.environ.get("NVA_PLAYER_BASE_URL", "http://127.0.0.1:8099")

contract_env = os.environ.get("NVA_CONTRACT_BUNDLES")
reject_env = os.environ.get("NVA_REJECT_BUNDLES")
site_data_env = os.environ.get("NVA_SITE_DATA")

if not contract_env or not reject_env:
    print("NVA_CONTRACT_BUNDLES or NVA_REJECT_BUNDLES not set — skipping.")
    sys.exit(0)

contract_bundles = [Path(p.strip()) for p in contract_env.split(",") if p.strip()]
reject_bundles = [Path(p.strip()) for p in reject_env.split(",") if p.strip()]

for p in contract_bundles:
    if not p.exists():
        print(f"Contract bundle not found: {p} — skipping.")
        sys.exit(0)

for p in reject_bundles:
    if not p.exists():
        print(f"Reject bundle not found: {p} — skipping.")
        sys.exit(0)

site_data_dir = Path(site_data_env) if site_data_env else None

FAKE_TTS_INIT_SCRIPT = """
window.__blobSizes = {};
window.__fakeTtsDurationMs = 1800;

class FakeSpeechSynthesisUtterance extends EventTarget {
  constructor(text) {
    super();
    this.text = text || '';
    this.lang = '';
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onboundary = null;
  }
}

let speakTimer = null;
let boundaryInterval = null;

const fakeVoices = [
  { voiceURI: 'fake-local-ko', name: 'Fake Voice (ko-KR)', lang: 'ko-KR', localService: true, default: true },
  { voiceURI: 'fake-online-ko', name: 'Fake Online Voice (ko-KR)', lang: 'ko-KR', localService: false, default: false }
];

const fakeSynthesis = {
  speaking: false,
  getVoices() {
    return fakeVoices;
  },
  speak(u) {
    this.cancel();
    this.speaking = true;
    setTimeout(() => {
      if (!this.speaking) return;
      u.onstart?.({ type: 'start' });
      let charIdx = 0;
      boundaryInterval = setInterval(() => {
        if (!this.speaking) {
          clearInterval(boundaryInterval);
          boundaryInterval = null;
          return;
        }
        charIdx = Math.min(charIdx + 4, (u.text?.length || 10));
        u.onboundary?.({ type: 'boundary', charIndex: charIdx });
      }, 160);
      speakTimer = setTimeout(() => {
        if (!this.speaking) return;
        clearInterval(boundaryInterval);
        boundaryInterval = null;
        this.speaking = false;
        u.onend?.({ type: 'end' });
      }, window.__fakeTtsDurationMs || 1800);
    }, 20);
  },
  cancel() {
    this.speaking = false;
    if (boundaryInterval) {
      clearInterval(boundaryInterval);
      boundaryInterval = null;
    }
    if (speakTimer) {
      clearTimeout(speakTimer);
      speakTimer = null;
    }
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; }
};

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  enumerable: true,
  get: () => fakeSynthesis
});
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  configurable: true,
  enumerable: true,
  get: () => FakeSpeechSynthesisUtterance
});
"""


def is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_canvas_pixels(page) -> str:
    return page.evaluate("""() => {
        const canvas = document.querySelector('#stageCanvas');
        if (!canvas) return '';
        const ctx = canvas.getContext('2d');
        const w = canvas.width || 720;
        const h = canvas.height || 1280;
        const cx = Math.floor(w / 4);
        const cy = Math.floor(h / 4);
        const cw = Math.floor(w / 2);
        const ch = Math.floor(h / 2);
        try {
            const data = ctx.getImageData(cx, cy, cw, ch).data;
            let sum = 0;
            let nz = 0;
            for (let i = 0; i < data.length; i += 16) {
                sum = ((sum << 5) - sum + data[i] + data[i+1] + data[i+2]) | 0;
                if (data[i] !== 0) nz++;
            }
            return `${sum}_${nz}`;
        } catch (e) {
            return canvas.toDataURL().slice(0, 100);
        }
    }""")


def main() -> None:
    server = None
    if not is_port_open(8099):
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        server = http.server.HTTPServer(("127.0.0.1", 8099), handler)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        time.sleep(0.3)

    fixture_b = ROOT / "examples/.local/p1-work/fixture-b-speech-set.nva"
    fixture_c = ROOT / "examples/.local/p1-work/fixture-c-demo.nva"
    fixture_no_talking = ROOT / "examples/.local/p1-work/fixture-c-no-talking.nva"
    fixture_broken_atlas = ROOT / "examples/.local/p1-work/fixture-broken-atlas.nva"

    base_viewer_28913c2 = ROOT / "examples/.local/p1-work/base28913c2/src/main/viewer.html"
    if not base_viewer_28913c2.exists():
        base_viewer_28913c2 = ROOT / "examples/.local/p1-work/base/src/main/viewer.html"

    base_viewer_ad48be3 = ROOT / "examples/.local/p1-work/basead48be3/src/main/viewer.html"

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=["--disable-gpu", "--autoplay-policy=no-user-gesture-required"]
            )

            # ---------------------------------------------------------------
            # 1. Baseline 28913c2: speak button absent, talking loop working
            # ---------------------------------------------------------------
            if base_viewer_28913c2.exists() and fixture_b.exists():
                print("Checking baseline 28913c2 viewer...")
                p_rel = base_viewer_28913c2.relative_to(ROOT)
                page = browser.new_page(viewport={"width": 1280, "height": 900})
                page.goto(f"{BASE_URL}/{p_rel}")
                page.wait_for_load_state("networkidle")

                assert page.locator("#speak").count() == 0, "Baseline 28913c2 must not have #speak"
                page.locator("#nvaFile").set_input_files(str(fixture_b))
                page.wait_for_function(
                    "() => /Ready|ready/.test(document.getElementById('status')?.textContent || '') || !document.getElementById('playTalking')?.disabled",
                    timeout=20_000
                )
                assert not page.locator("#playTalking").is_disabled()
                page.locator("#playTalking").click()
                page.locator("#status").filter(has_text="Playing talking loop.").wait_for(timeout=5_000)
                page.locator("#stop").click()
                page.locator("#status").filter(has_text="idle restored").wait_for(timeout=5_000)
                page.close()
                print("Baseline 28913c2 checks passed.")

            # ---------------------------------------------------------------
            # 2. Baseline ad48be3: speak disabled before open / without synthesis / on no-talking
            # ---------------------------------------------------------------
            if base_viewer_ad48be3.exists():
                print("Checking baseline ad48be3 viewer...")
                p_rel = base_viewer_ad48be3.relative_to(ROOT)
                # 2A: with synthesis fake
                page = browser.new_page(viewport={"width": 1280, "height": 900})
                page.add_init_script(FAKE_TTS_INIT_SCRIPT)
                page.goto(f"{BASE_URL}/{p_rel}")
                page.wait_for_load_state("networkidle")
                assert page.locator("#speak").is_disabled(), "ad48be3 #speak must be disabled before open"

                if fixture_no_talking.exists():
                    page.locator("#nvaFile").set_input_files(str(fixture_no_talking))
                    page.wait_for_function(
                        "() => /Ready|ready/.test(document.getElementById('status')?.textContent || '')",
                        timeout=20_000
                    )
                    assert page.locator("#speak").is_disabled(), "ad48be3 #speak must be disabled when bundle lacks speech_motion"
                page.close()

                page_nosynth = browser.new_page(viewport={"width": 1280, "height": 900})
                page_nosynth.add_init_script("""
                    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => undefined });
                    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, get: () => undefined });
                """)
                page_nosynth.goto(f"{BASE_URL}/{p_rel}")
                page_nosynth.wait_for_load_state("networkidle")
                assert page_nosynth.locator("#speak").is_disabled(), "ad48be3 #speak must be disabled without synthesis"
                page_nosynth.close()
                print("Baseline ad48be3 checks passed.")

            # ---------------------------------------------------------------
            # 3. Current work viewer: src/main/viewer.html
            # ---------------------------------------------------------------
            print("Checking current src/main/viewer.html...")
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()
            page.add_init_script(FAKE_TTS_INIT_SCRIPT)

            page_errors = []
            page.on("pageerror", lambda err: page_errors.append(str(err)))
            page.on("console", lambda msg: print(f"PAGE CONSOLE: {msg.type}: {msg.text}"))

            page.goto(f"{BASE_URL}/src/main/viewer.html")
            page.wait_for_load_state("networkidle")

            # Part 3A: Contract bundles
            for bundle_path in contract_bundles:
                print(f"Testing contract bundle: {bundle_path.name}")
                with zipfile.ZipFile(bundle_path, "r") as zf:
                    manifest = json.loads(zf.read("manifest.json").decode("utf-8"))

                page.locator("#nvaFile").set_input_files(str(bundle_path))
                page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)

                # Check actions match manifest (excluding prop enter/exit)
                expected_actions = []
                for anim_name, anim in manifest.get("animations", {}).items():
                    role = anim.get("role", "")
                    if role in ("prop_enter", "prop_exit"):
                        continue
                    if anim.get("loop") is False or role == "action":
                        expected_actions.append(anim.get("label") or anim_name)

                actual_actions = page.locator("#action option").all_text_contents()
                if expected_actions:
                    for ea in expected_actions:
                        assert any(ea in act for act in actual_actions), f"Action {ea} missing from {actual_actions}"

                    # Play first action and wait for idle return
                    page.locator("#playAction").click()
                    page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
                    page.locator("#status").filter(has_text="Playback complete; idle restored.").wait_for(timeout=10_000)
                    assert page.locator("#animation").evaluate("v => v.loop === true && v.muted === true")

                # Check talking loop button
                assert not page.locator("#playTalking").is_disabled()

                # Check canvas dimensions
                canvas_w = manifest.get("canvas", {}).get("width")
                canvas_h = manifest.get("canvas", {}).get("height")
                if canvas_w and canvas_h:
                    actual_w = page.locator("#stageCanvas").evaluate("c => c.width")
                    actual_h = page.locator("#stageCanvas").evaluate("c => c.height")
                    assert actual_w == canvas_w and actual_h == canvas_h

                # Check background
                bg = manifest.get("background")
                if bg and bg.get("type") == "color" and bg.get("color"):
                    bg_val = page.locator("#backgroundColor").input_value()
                    assert bg_val.lower() == bg["color"].lower()

                # Check speak button & quality badge
                assert not page.locator("#speak").is_disabled()
                quality_text = page.locator("#ttsQuality").text_content()
                assert "approximate" in quality_text
                assert "lip sync" in quality_text

                # Check browser speech playback and mouth motion smoke
                page.locator("#speak").click()
                page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
                assert page.locator("#animation").evaluate("v => v.style.display === 'none'")
                page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)

                # Sample 1 at 300ms
                time.sleep(0.3)
                sample1 = get_canvas_pixels(page)

                # Wait >0.5s (0.6s)
                time.sleep(0.6)
                sample2 = get_canvas_pixels(page)

                assert sample1 != sample2, f"Canvas pixels did not change ({sample1} vs {sample2})"

                # Wait for speech to complete
                page.locator("#status").filter(has_text="Speech complete; idle restored.").wait_for(timeout=10_000)
                assert page.locator("#stageCanvas").evaluate("c => c.style.display === 'none'")
                assert page.locator("#animation").evaluate("v => v.style.display !== 'none'")
                assert page.locator("#animation").evaluate("v => v.loop === true")
                print(f"Contract bundle {bundle_path.name} passed.")

            # Part 3B: Reject bundles
            for bundle_path in reject_bundles:
                print(f"Testing reject bundle: {bundle_path.name}")
                page.locator("#nvaFile").set_input_files(str(bundle_path))
                page.locator("#status").filter(has_text="provenance.generator_commit is not allowed").wait_for(timeout=15_000)
                assert page.locator("#speak").is_disabled(), f"Speak button must be disabled for reject bundle {bundle_path.name}"
                print(f"Reject bundle {bundle_path.name} failed closed as expected.")

            # Part 3C: Talking loop bundles ((나) and (다))
            for fixture_path, label in [(fixture_b, "(나) speech_set"), (fixture_c, "(다) demo")]:
                if not fixture_path.exists():
                    continue
                print(f"Testing talking-loop bundle {label}: {fixture_path.name}")
                page.locator("#nvaFile").set_input_files(str(fixture_path))
                page.locator("#status").filter(has_text="Ready").wait_for(timeout=20_000)

                assert page.locator("#speechMotionSection").is_hidden()
                badge_text = page.locator("#ttsQuality").text_content()
                assert "not lip-synced" in badge_text
                assert not page.locator("#speak").is_disabled()

                page.locator("#speak").click()
                page.locator("#status").filter(has_text="not lip-synced").wait_for(timeout=5_000)
                assert page.locator("#animation").evaluate("v => !v.paused && v.style.display !== 'none'")

                page.locator("#status").filter(has_text="Speech complete; idle restored.").wait_for(timeout=10_000)
                assert page.locator("#animation").evaluate("v => v.loop === true")
                print(f"Talking-loop bundle {label} passed.")

            # Part 3D: Talking absent fixture
            if fixture_no_talking.exists():
                print(f"Testing talking-absent fixture: {fixture_no_talking.name}")
                page.locator("#nvaFile").set_input_files(str(fixture_no_talking))
                page.locator("#status").filter(has_text="Ready").wait_for(timeout=20_000)
                assert page.locator("#speak").is_disabled(), "Speak button must be disabled when talking is absent"
                print("Talking-absent fixture check passed.")

            # Part 3E: Empty text check
            print("Testing empty text check...")
            page.locator("#nvaFile").set_input_files(str(contract_bundles[0]))
            page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
            page.locator("#text").fill("")
            page.locator("#speak").click()
            page.locator("#status").filter(has_text="text is required").wait_for(timeout=5_000)
            print("Empty text check passed.")

            # Part 3F: Broken atlas fixture
            if fixture_broken_atlas.exists():
                print(f"Testing broken atlas fixture: {fixture_broken_atlas.name}")
                page.locator("#nvaFile").set_input_files(str(fixture_broken_atlas))
                page.locator("#status").filter(has_text="Blocked:").wait_for(timeout=15_000)
                assert page.locator("#speak").is_disabled()
                page.locator("#speak").click(force=True)
                assert page.evaluate("() => window.__animationPlayer()?.state") != "talking"
                print("Broken atlas check passed.")

            # Part 3G: Overlap and Cancellation
            print("Testing overlap rule: Browser speech cancelled by action...")
            page.locator("#nvaFile").set_input_files(str(contract_bundles[0]))
            page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
            page.locator("#text").fill("Testing interruption with action.")
            page.locator("#speak").click()
            page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)
            page.locator("#playAction").click()
            assert page.evaluate("() => window.__tts()?.speaking") is False
            page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
            page.locator("#status").filter(has_text="Playback complete; idle restored.").wait_for(timeout=10_000)
            print("Browser speech cancelled by action passed.")

            if site_data_dir:
                s1_wav = site_data_dir / "sentences/s1.wav"
                s1_plan = site_data_dir / "sentences/s1.plan.json"
                if s1_wav.exists() and s1_plan.exists():
                    print("Testing overlap rule: Composed speech <-> Browser speech...")
                    page.locator("#audioFile").set_input_files(str(s1_wav))
                    page.locator("#planFile").set_input_files(str(s1_plan))
                    page.locator("#playComposed").wait_for(state="attached", timeout=10_000)
                    page.wait_for_function("() => !document.getElementById('playComposed')?.disabled", timeout=10_000)

                    # Composed interrupted by speak
                    page.locator("#playComposed").click()
                    page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=5_000)
                    page.locator("#speak").click()
                    page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)
                    page.locator("#status").filter(has_text="Speech complete; idle restored.").wait_for(timeout=10_000)

                    # Speak interrupted by composed
                    page.locator("#speak").click()
                    page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)
                    page.locator("#playComposed").click()
                    page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=5_000)
                    page.locator("#stopComposed").click()
                    page.locator("#status").filter(has_text="original ready state restored.").wait_for(timeout=5_000)
                    print("Composed speech <-> Browser speech overlap passed.")

            page.close()
            context.close()
            browser.close()

            assert len(page_errors) == 0, f"Encountered page errors: {page_errors}"
            print("ALL VIEWER BROWSER SPEECH E2E TESTS PASSED!")

    finally:
        if server:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
