"""Open every ignored localhost NVA sample in a real Chromium browser."""

from __future__ import annotations

import os
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = os.environ.get("NVA_PLAYER_BASE_URL", "http://127.0.0.1:8099")
CATALOG = ROOT / "examples/.local/catalog.json"

if not CATALOG.exists():
    raise SystemExit("Run scripts/prepare-local-samples.py before this test")

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

    url = f"{BASE_URL}/src/main/viewer.html?catalog=../../examples/.local/catalog.json"
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_function("document.querySelectorAll('#sample option').length === 4", timeout=10_000)
    labels = page.locator("#sample option").all_inner_texts()
    assert [label.split(" — ")[0] for label in labels] == ["Jina", "Minho", "Naia", "Alpha"], labels

    statuses: list[str] = []
    for index, label in enumerate(labels):
        character = label.split(" — ")[0]
        page.locator("#sample").select_option(index=index)
        page.locator("#loadSample").click()
        page.locator("#status").filter(has_text="Ready ·").wait_for(timeout=30_000)
        status = page.locator("#status").inner_text()
        assert character.lower() in status.lower(), (label, status)
        assert page.locator("#animation").is_visible()
        assert page.locator("#animation").evaluate("video => video.videoWidth > 0 && video.videoHeight > 0")
        assert "1 packaged speech videos" in status
        assert not page.locator("#playSpeech").is_disabled()
        page.locator("#playSpeech").click()
        page.locator("#status").filter(has_text="Playing packaged speech").wait_for(timeout=10_000)
        assert page.locator("#animation").evaluate("video => video.muted === false && video.loop === false")
        page.locator("#stop").click()
        page.locator("#status").filter(has_text="Stopped; idle restored.").wait_for(timeout=10_000)
        assert page.locator("#animation").evaluate("video => video.muted === true && video.loop === true")
        statuses.append(status)

    assert not page.locator("#nvaFile").is_disabled()
    assert external_requests == [], external_requests
    assert console_errors == [], console_errors
    assert page_errors == [], page_errors
    page.screenshot(path="/var/tmp/nva-player-local-samples.png", full_page=True)
    browser.close()

print("PASS: opened and played completed speech for Jina, Minho, Naia and Alpha")
for value in statuses:
    print(value)
