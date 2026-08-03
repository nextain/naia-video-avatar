"""Chromium integration check for the static NVA Avatar Player.

Run through the workspace webapp-testing server helper, or serve the repository
at NVA_PLAYER_BASE_URL. The generated NVA is a wiring fixture; it is not a
naturalness sample and is removed with the temporary directory.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = os.environ.get("NVA_PLAYER_BASE_URL", "http://127.0.0.1:8099")
UNITS = (
    "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
    "palatal", "velar", "glottal", "vowel-open", "vowel-mid",
    "vowel-spread", "vowel-round",
)


def encoded(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def build_fixture(path: Path) -> None:
    manifest = json.loads((ROOT / "examples/naia.nva/manifest.json").read_text())
    transition = (ROOT / "examples/demo.nva/clips/nod.webm").read_bytes()
    neutral = (ROOT / "examples/naia.nva/clips/speak_head.png").read_bytes()
    entries: dict[str, dict[str, object]] = {}
    atlas = bytearray()
    for previous in UNITS:
        for current in UNITS:
            key = f"{previous}>{current}"
            entries[key] = {
                "offset": len(atlas), "length": len(transition),
                "sha256": digest(transition), "frames": 5, "fps": 25,
                "codec": "vp09.00.10.08", "lossless": True,
            }
            atlas.extend(transition)

    files = {
        "clips/sijak.webm": (ROOT / "examples/naia.nva/clips/sijak.webm").read_bytes(),
        "clips/speak_body.webm": (ROOT / "examples/naia.nva/clips/speak_body.webm").read_bytes(),
        "clips/heart.webm": (ROOT / "examples/naia.nva/clips/heart.webm").read_bytes(),
        "speech/neutral-head.png": neutral,
        "speech/atlas.bin": bytes(atlas),
        "speech/atlas-index.json": encoded({"version": "1", "entries": entries}),
        "speech/validation-report.json": encoded({"status": "passed", "fixture": "browser-player-e2e"}),
        "speech/quality-report.json": encoded({"status": "passed", "scope": "wiring-only-not-naturalness"}),
    }
    roles = (
        ("neutral_head", "speech/neutral-head.png"),
        ("speech_atlas", "speech/atlas.bin"),
        ("speech_atlas_index", "speech/atlas-index.json"),
        ("validation_report", "speech/validation-report.json"),
        ("quality_report", "speech/quality-report.json"),
    )
    receipt = {
        "version": "1", "job_id": "job_01ISSUE14PLAYERDEMO",
        "assets": [
            {"role": role, "path": name, "sha256": digest(files[name]), "bytes": len(files[name])}
            for role, name in roles
        ],
        "provenance": {
            "generator": {"kind": "synthetic-test-fixture", "version": "1"},
            "input_sha256": digest(neutral), "settings_sha256": digest(b"issue14"),
            "inventory_version": "1.0.0", "inventory": list(UNITS),
            "validation": {
                "status": "passed",
                "report_sha256": digest(files["speech/validation-report.json"]),
            },
        },
        "quality": {
            "report_sha256": digest(files["speech/quality-report.json"]),
            **{section: {"status": "passed"} for section in (
                "sync", "continuity", "naturalness", "performance", "bundle"
            )},
        },
        "source_deleted_at": "2026-08-03T00:00:00.000Z",
    }
    files["speech/generation-result.json"] = encoded(receipt)
    manifest["speech_motion"] = {
        "version": "1", "representation": "factorized-difference-layer",
        "inventory_version": "1.0.0", "inventory": list(UNITS),
        "neutral_head": "speech/neutral-head.png", "atlas": "speech/atlas.bin",
        "atlas_index": "speech/atlas-index.json",
        "validation_report": "speech/validation-report.json",
        "quality_report": "speech/quality-report.json",
        "provenance": "speech/generation-result.json",
    }
    files["manifest.json"] = encoded(manifest)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in files.items():
            archive.writestr(name, value)


with tempfile.TemporaryDirectory(prefix="nva-player-e2e-") as temporary:
    fixture = Path(temporary) / "browser-player.nva"
    build_fixture(fixture)
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
        page.add_init_script("""
          class MockSpeechSynthesisUtterance {
            constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; }
          }
          const voices = [
            { voiceURI: "mock-ko", name: "Mock Korean", lang: "ko-KR", localService: true },
            { voiceURI: "mock-en", name: "Mock English", lang: "en-US", localService: true },
          ];
          let current = null;
          const synthesis = {
            getVoices: () => voices,
            addEventListener: () => {},
            speak: (utterance) => {
              current = utterance;
              setTimeout(() => utterance.onstart?.(), 20);
              setTimeout(() => { if (current === utterance) utterance.onend?.(); }, 1200);
            },
            cancel: () => { current = null; },
          };
          Object.defineProperty(window, "SpeechSynthesisUtterance", { value: MockSpeechSynthesisUtterance });
          Object.defineProperty(window, "speechSynthesis", { value: synthesis });
        """)
        page.goto(f"{BASE_URL}/src/main/viewer.html")
        page.wait_for_load_state("networkidle")
        page.locator("#nvaFile").set_input_files(str(fixture))
        page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
        assert "approximate" in page.locator("#quality").inner_text()
        assert page.locator("#voice option").count() == 2
        assert page.locator("#action option").count() == 1

        page.locator("#speechText").fill("안녕하세요. 브라우저 무료 음성으로 말하고 있습니다.")
        page.locator("#voice").select_option("mock-ko")
        page.locator("#speak").click()
        page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)
        assert page.locator("#stage").is_visible()
        page.locator("#status").filter(has_text="Speech complete; idle restored.").wait_for(timeout=5_000)
        assert page.locator("#animation").is_visible()

        page.locator("#playAction").click()
        page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
        page.wait_for_function("document.querySelector('#animation').loop === true", timeout=15_000)

        page.locator("#speak").click()
        page.locator("#status").filter(has_text="Speaking with browser TTS").wait_for(timeout=5_000)
        page.locator("#stop").click()
        page.locator("#status").filter(has_text="Stopped; idle restored.").wait_for(timeout=5_000)
        assert page.locator("#animation").is_visible()
        assert external_requests == [], external_requests
        assert console_errors == [], console_errors
        assert page_errors == [], page_errors
        browser.close()

print("PASS: browser TTS, action, idle restoration, external requests=0, browser errors=0")
