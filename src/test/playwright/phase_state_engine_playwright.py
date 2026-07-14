"""Browser acceptance test for the portable NVA v0.3 editor."""

import json
import os
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("NVA_EDITOR_URL", "http://127.0.0.1:8785/src/main/editor.html")
SCREENSHOT = Path("/var/home/luke/alpha-adk/.agents/work/nva-editor-v03.png")


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(accept_downloads=True)
        errors: list[str] = []
        requests: list[dict] = []
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(str(error)))

        def cascade(route):
            request = route.request
            path = request.url.split("mock-cascade.invalid", 1)[-1]
            raw = request.post_data_buffer or b""
            body = raw.decode("utf-8") if request.headers.get("content-type", "").startswith("application/json") else f"<bytes:{len(raw)}>"
            requests.append({"path": path, "method": request.method, "body": body})
            if path.startswith("/health"):
                route.fulfill(status=200, content_type="application/json", body='{"ok":true,"avatar":true}')
            elif path.startswith("/upload_nva"):
                route.fulfill(status=200, content_type="application/json", body='{"ok":true,"bundle_id":"demo"}')
            elif path.startswith("/stream_text") or path.startswith("/idle"):
                route.fulfill(status=200, content_type="video/mp4", body=b"portable-nva-test-video")
            else:
                route.fulfill(status=404, content_type="application/json", body='{"error":"not-found"}')

        page.route("http://mock-cascade.invalid/**", cascade)
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_function("window.__nvaEditorTest && window.__nvaEditorTest.getManifest()")

        manifest = page.evaluate("window.__nvaEditorTest.getManifest()")
        assert manifest["nva_version"] == "0.3"
        assert sorted(manifest["character_states"]) == ["neutral", "seated"]
        assert page.locator("#validation").inner_text().startswith("VALID")
        assert page.locator("#stateList .item").count() == 2

        neutral_before = manifest["character_states"]["neutral"]
        page.evaluate("window.__nvaEditorTest.selectState('seated')")
        assert page.locator('[data-head-field="profile_ref"]').input_value() == "demo-windows-default"
        page.locator('[data-state-field="label"]').fill("Seated reviewed")
        page.locator('[data-state-field="label"]').dispatch_event("change")
        page.locator('[data-head-field="profile_ref"]').fill("windows-profile-reviewed")
        page.locator('[data-head-field="profile_ref"]').dispatch_event("change")
        edited = page.evaluate("window.__nvaEditorTest.getManifest()")
        assert edited["character_states"]["neutral"] == neutral_before
        assert edited["character_states"]["seated"]["label"] == "Seated reviewed"
        assert edited["character_states"]["seated"]["talking_head"]["descriptor"]["profile_ref"] == "windows-profile-reviewed"

        page.evaluate("window.__nvaEditorTest.endpoint('http://mock-cascade.invalid')")
        page.locator("#cascadeHealth").click()
        page.wait_for_function("document.querySelector('#cascadeStatus').textContent.includes('연결됨')")
        page.locator("#cascadeUpload").click()
        page.wait_for_function("document.querySelector('#cascadeStatus').textContent.includes('업로드됨')")
        page.locator("#remoteSpeak").click()
        page.wait_for_function("document.querySelector('#speakStatus').textContent.includes('원격 렌더 완료')")

        stream = next(item for item in requests if item["path"].startswith("/stream_text"))
        payload = json.loads(stream["body"])
        assert payload["character_state_id"] == "seated"
        assert any(item["path"].startswith("/upload_nva") and item["method"] == "POST" for item in requests)

        before_export = page.evaluate("window.__nvaEditorTest.getManifest()")
        with page.expect_download() as download_info:
            page.locator("#exportBtn").click()
        download = download_info.value
        with zipfile.ZipFile(download.path()) as archive:
            reopened = json.loads(archive.read("manifest.json"))
            assert reopened == before_export
            assert "clips/sit_idle.webm" in archive.namelist()
            assert "expressions/neutral.png" in archive.namelist()
            assert "clips/dance.webm" in archive.namelist()
            assert "clips/sit_down.webm" in archive.namelist()

        traversal_error = page.evaluate("""async () => {
          const value = window.__nvaEditorTest.getManifest();
          value.character_states.neutral.idle.path = '../secret.webm';
          try { await window.__nvaEditorTest.loadManifest(value); return ''; }
          catch (error) { return String(error.message || error); }
        }""")
        assert "portable relative asset path" in traversal_error

        future_error = page.evaluate("""async () => {
          const value = window.__nvaEditorTest.getManifest(); value.nva_version = '0.4';
          try { await window.__nvaEditorTest.loadManifest(value); return ''; }
          catch (error) { return String(error.message || error); }
        }""")
        assert "지원하지 않는 NVA 버전" in future_error

        SCREENSHOT.parent.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SCREENSHOT), full_page=True)
        assert not errors, f"browser errors: {errors}"
        browser.close()

    print(json.dumps({"ok": True, "states": ["neutral", "seated"], "cascade_requests": len(requests), "screenshot": str(SCREENSHOT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
