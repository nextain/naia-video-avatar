"""Browser integration test for NVA viewer speech motion playback.

Validates normal completion, explicit stop, invalid unit, asset hash error,
interruptions at 120ms, 240ms, 480ms, 720ms, 960ms,
and mid-playback audio & chunk decode errors.
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
import time
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
site_data_env = os.environ.get("NVA_SITE_DATA")
if not site_data_env:
    print("NVA_SITE_DATA 환경변수 없음 — 건너뜀")
    raise SystemExit(0)

SITE_DATA = Path(site_data_env)
NVA_PATH = SITE_DATA / "jina-speech-set.nva"
AUDIO_PATH = SITE_DATA / "sentences/s1.wav"
PLAN_PATH = SITE_DATA / "sentences/s1.plan.json"

if not NVA_PATH.exists():
    print(f"Missing bundle: {NVA_PATH} — 건너뜀")
    raise SystemExit(0)
if not AUDIO_PATH.exists():
    print(f"Missing audio: {AUDIO_PATH} — 건너뜀")
    raise SystemExit(0)
if not PLAN_PATH.exists():
    print(f"Missing plan: {PLAN_PATH} — 건너뜀")
    raise SystemExit(0)

# Minimal valid 1x1 transparent PNG
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


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


def make_corrupted_atlas_bundle(src_nva: Path, dst_nva: Path) -> None:
    """Create a copy of the NVA bundle with a single modified byte in speech/atlas.bin.

    Preserves STORE ZIP compression and uncompressed/compressed sizes so that size
    and decompression checks pass, but receipt asset SHA-256 verification fails.
    """
    with zipfile.ZipFile(src_nva, "r") as in_zf, zipfile.ZipFile(dst_nva, "w") as out_zf:
        for info in in_zf.infolist():
            data = in_zf.read(info.filename)
            if info.filename == "speech/atlas.bin":
                b = bytearray(data)
                b[100] ^= 0xff
                data = bytes(b)
            out_zf.writestr(info, data)


def get_current_player_state(page) -> dict:
    return page.evaluate("""() => {
        const v = document.querySelector('#animation');
        const s = document.querySelector('#stage');
        return {
            state: window.__animationPlayer()?.state,
            src: v ? v.src : "",
            currentTime: v ? v.currentTime : 0,
            paused: v ? v.paused : true,
            loop: v ? v.loop : false,
            muted: v ? v.muted : false,
            stageBgColor: s ? s.style.backgroundColor : "",
            stageBgImage: s ? s.style.backgroundImage : "",
        };
    }""")


def assert_restored_state(snapshot: dict, last_restore: dict, label: str = "") -> None:
    assert last_restore is not None, f"[{label}] window.__lastRestore must not be None"
    assert last_restore["state"] == snapshot["state"], (
        f"[{label}] state mismatch: {last_restore['state']} vs {snapshot['state']}"
    )
    assert last_restore["src"] == snapshot["src"], (
        f"[{label}] src mismatch: {last_restore['src']} vs {snapshot['src']}"
    )
    time_diff = abs(last_restore["currentTime"] - snapshot["currentTime"])
    assert time_diff <= 0.05, (
        f"[{label}] currentTime mismatch: {last_restore['currentTime']} vs {snapshot['currentTime']} (diff={time_diff:.4f})"
    )
    assert last_restore["paused"] == snapshot["paused"], (
        f"[{label}] paused mismatch: {last_restore['paused']} vs {snapshot['paused']}"
    )
    assert last_restore["loop"] == snapshot["loop"], (
        f"[{label}] loop mismatch: {last_restore['loop']} vs {snapshot['loop']}"
    )
    assert last_restore["muted"] == snapshot["muted"], (
        f"[{label}] muted mismatch: {last_restore['muted']} vs {snapshot['muted']}"
    )
    assert last_restore["stageBgColor"] == snapshot["stageBgColor"], (
        f"[{label}] stageBgColor mismatch: {last_restore['stageBgColor']} vs {snapshot['stageBgColor']}"
    )
    assert last_restore["stageBgImage"] == snapshot["stageBgImage"], (
        f"[{label}] stageBgImage mismatch: {last_restore['stageBgImage']} vs {snapshot['stageBgImage']}"
    )


def assert_rejected_state(snapshot: dict, post_state: dict, time_elapsed: float = 0.0, label: str = "") -> None:
    assert post_state["state"] == snapshot["state"], (
        f"[{label}] state mismatch: {post_state['state']} vs {snapshot['state']}"
    )
    assert post_state["src"] == snapshot["src"], (
        f"[{label}] src mismatch: {post_state['src']} vs {snapshot['src']}"
    )
    assert post_state["paused"] == snapshot["paused"], (
        f"[{label}] paused mismatch: {post_state['paused']} vs {snapshot['paused']}"
    )
    assert post_state["loop"] == snapshot["loop"], (
        f"[{label}] loop mismatch: {post_state['loop']} vs {snapshot['loop']}"
    )
    assert post_state["muted"] == snapshot["muted"], (
        f"[{label}] muted mismatch: {post_state['muted']} vs {snapshot['muted']}"
    )
    assert post_state["stageBgColor"] == snapshot["stageBgColor"], (
        f"[{label}] stageBgColor mismatch: {post_state['stageBgColor']} vs {snapshot['stageBgColor']}"
    )
    assert post_state["stageBgImage"] == snapshot["stageBgImage"], (
        f"[{label}] stageBgImage mismatch: {post_state['stageBgImage']} vs {snapshot['stageBgImage']}"
    )
    if snapshot["paused"]:
        time_diff = abs(post_state["currentTime"] - snapshot["currentTime"])
        assert time_diff <= 0.05, (
            f"[{label}] currentTime mismatch: {post_state['currentTime']} vs {snapshot['currentTime']} (diff={time_diff:.4f})"
        )
    else:
        diff = abs((post_state["currentTime"] - snapshot["currentTime"]) - time_elapsed)
        assert diff <= 0.05, (
            f"[{label}] currentTime progress mismatch: diff={diff:.4f} > 0.05 (elapsed={time_elapsed:.4f})"
        )


REBUILD_MS: list = []


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

            # Install init script to intercept Blob.prototype.slice for mid-playback chunk error test
            page.add_init_script("""
                (() => {
                    const origBlob = window.Blob;
                    const blobBuffers = new WeakMap();

                    window.Blob = new Proxy(origBlob, {
                        construct(target, args) {
                            const blob = Reflect.construct(target, args);
                            const parts = args[0];
                            if (parts && parts.length === 1 && (parts[0] instanceof ArrayBuffer || ArrayBuffer.isView(parts[0]))) {
                                const view = parts[0];
                                const u8 = view instanceof Uint8Array ? view : new Uint8Array(view.buffer || view, view.byteOffset || 0, view.byteLength);
                                blobBuffers.set(blob, u8);
                            }
                            return blob;
                        }
                    });

                    const origSlice = origBlob.prototype.slice;
                    window.__corruptNextSlice = false;

                    origBlob.prototype.slice = function(start, end, contentType) {
                        if (window.__corruptNextSlice) {
                            window.__corruptNextSlice = false;
                            const buf = blobBuffers.get(this);
                            if (buf) {
                                const s = start !== undefined ? (start < 0 ? Math.max(0, buf.length + start) : Math.min(buf.length, start)) : 0;
                                const e = end !== undefined ? (end < 0 ? Math.max(0, buf.length + end) : Math.min(buf.length, end)) : buf.length;
                                const copy = buf.slice(s, e);
                                if (copy.length > 0) {
                                    copy[0] ^= 0xff;
                                }
                                return new origBlob([copy], { type: contentType || "video/webm" });
                            }
                        }
                        return origSlice.call(this, start, end, contentType);
                    };
                })();
            """)

            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))
            page.on("request", lambda req: external_requests.append(req.url)
                    if not req.url.startswith((f"{base_url}/", "blob:")) else None)

            page.goto(f"{base_url}/src/main/viewer.html")
            page.wait_for_load_state("networkidle")

            # Setup stage background color and image
            page.locator("#backgroundColor").evaluate(
                "el => { el.value = '#203040'; el.dispatchEvent(new Event('input', { bubbles: true })); }"
            )
            assert page.locator("#stage").evaluate("el => el.style.backgroundColor") == "rgb(32, 48, 64)"

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as bg_file:
                bg_path = Path(bg_file.name)
                bg_path.write_bytes(TINY_PNG)

            try:
                page.locator("#backgroundImage").set_input_files(str(bg_path))
                page.wait_for_function("() => (document.querySelector('#stage')?.style.backgroundImage || '').includes('blob:')")
                bg_image_val = page.locator("#stage").evaluate("el => el.style.backgroundImage")
                assert bg_image_val.startswith('url("blob:')
            finally:
                bg_path.unlink(missing_ok=True)

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
            page.evaluate("() => { window.__lastRestore = null; }")

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")

            # Wait for speechAudio to complete naturally
            # (the session's audio is discarded on completion, so wait on the viewer's completion status)
            page.locator("#status").filter(has_text="Playback complete; idle restored.").wait_for(timeout=20_000)

            # Assert canvas hidden, animation visible
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            # Assert restored state via window.__lastRestore
            last_restore1 = page.evaluate("() => window.__lastRestore")
            assert_restored_state(snap1, last_restore1, "Case 1: Normal completion")

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
            page.evaluate("() => { window.__lastRestore = null; }")

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")
            page.wait_for_timeout(300)

            page.locator("#stopComposed").click()
            page.locator("#status").filter(has_text="Stopped; original ready state restored.").wait_for(timeout=5_000)

            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            last_restore2 = page.evaluate("() => window.__lastRestore")
            assert_restored_state(snap2, last_restore2, "Case 2: Explicit stop")

            # Finish action and verify idle
            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # --- Case 3: Invalid unit (Pre-playback rejection) ---
            print("Testing Case 3: Invalid unit (Pre-playback rejection)...")
            with tempfile.TemporaryDirectory(prefix="nva-invalid-unit-") as tmpdir:
                bad_plan_data = json.loads(PLAN_PATH.read_text())
                bad_plan_data["events"].append({"unit": "unknown-nonexistent-unit", "start_us": 1115000, "end_us": 1200000})
                bad_plan_path = Path(tmpdir) / "bad_unit.plan.json"
                bad_plan_path.write_text(json.dumps(bad_plan_data))

                snap3 = get_current_player_state(page)
                t_before = time.time()
                page.locator("#planFile").set_input_files(str(bad_plan_path))
                page.wait_for_function("() => (document.getElementById('status')?.textContent || '').startsWith('Blocked:')", timeout=5_000)
                status_text = page.locator("#status").inner_text()
                assert "invalid SpeechPlan" in status_text, f"unexpected status: {status_text}"
                t_after = time.time()

                assert page.locator("#playComposed").is_disabled()
                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post3 = get_current_player_state(page)
                assert_rejected_state(snap3, post3, t_after - t_before, "Case 3: Invalid unit")

                # Recover with good plan
                page.locator("#planFile").set_input_files(str(PLAN_PATH))
                page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
                assert page.locator("#playComposed").is_enabled()

            # --- Case 4: Audio SHA-256 hash mismatch (Pre-playback rejection) ---
            print("Testing Case 4: Audio hash error (Pre-playback rejection)...")
            with tempfile.TemporaryDirectory(prefix="nva-bad-hash-") as tmpdir:
                bad_hash_data = json.loads(PLAN_PATH.read_text())
                bad_hash_data["audio"]["sha256"] = "0" * 64
                bad_hash_path = Path(tmpdir) / "bad_hash.plan.json"
                bad_hash_path.write_text(json.dumps(bad_hash_data))

                snap4 = get_current_player_state(page)
                t_before = time.time()
                page.locator("#planFile").set_input_files(str(bad_hash_path))
                page.wait_for_function("() => (document.getElementById('status')?.textContent || '').startsWith('Blocked:')", timeout=5_000)
                status_text = page.locator("#status").inner_text()
                assert "audio hash mismatch" in status_text, f"unexpected status: {status_text}"
                t_after = time.time()

                assert page.locator("#playComposed").is_disabled()
                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post4 = get_current_player_state(page)
                assert_rejected_state(snap4, post4, t_after - t_before, "Case 4: Audio hash mismatch")

                # Recover with good plan
                page.locator("#planFile").set_input_files(str(PLAN_PATH))
                page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
                assert page.locator("#playComposed").is_enabled()

            # --- Case 5: Receipt asset hash error (Pre-playback rejection of corrupted atlas.bin) ---
            print("Testing Case 5: Receipt asset hash error (speech/atlas.bin mismatch)...")
            with tempfile.TemporaryDirectory(prefix="nva-corrupted-atlas-") as tmpdir:
                bad_nva_path = Path(tmpdir) / "corrupted_atlas.nva"
                make_corrupted_atlas_bundle(NVA_PATH, bad_nva_path)

                # Upload corrupted bundle
                page.locator("#nvaFile").set_input_files(str(bad_nva_path))
                page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)

                snap5 = get_current_player_state(page)
                t_before = time.time()

                # Upload audio and plan to trigger verifySpeechMotionBundle
                page.locator("#audioFile").set_input_files(str(AUDIO_PATH))
                page.locator("#planFile").set_input_files(str(PLAN_PATH))

                # Must fail specifically with 'generated asset hash mismatch: speech/atlas.bin'
                page.locator("#status").filter(has_text="generated asset hash mismatch: speech/atlas.bin").wait_for(timeout=10_000)
                status_text = page.locator("#status").inner_text()
                assert "generated asset hash mismatch: speech/atlas.bin" in status_text, f"unexpected status: {status_text}"
                t_after = time.time()

                assert page.locator("#playComposed").is_disabled()
                assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
                assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

                post5 = get_current_player_state(page)
                assert_rejected_state(snap5, post5, t_after - t_before, "Case 5: Receipt asset hash error")

                # Recover with original valid NVA bundle
                page.locator("#nvaFile").set_input_files(str(NVA_PATH))
                page.locator("#status").filter(has_text="Ready").wait_for(timeout=30_000)
                page.locator("#audioFile").set_input_files(str(AUDIO_PATH))
                page.locator("#planFile").set_input_files(str(PLAN_PATH))
                page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
                assert page.locator("#playComposed").is_enabled()

            # --- Case 6: Mid-playback audio error ---
            print("Testing Case 6: Mid-playback audio error...")
            page.locator("#action").select_option(value="motion")
            page.locator("#playAction").click()
            page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
            page.wait_for_timeout(200)

            snap6 = page.evaluate("() => window.__takeSnapshot()")
            assert snap6["state"] == "action"
            page.evaluate("() => { window.__lastRestore = null; }")

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")
            page.wait_for_timeout(200)

            # Trigger a real browser media error on #speechAudio (unsupported source), not a synthetic event
            # The viewer discards the session (clearing the element) on error, so record the real MediaError code in the capture phase first
            page.evaluate("() => { window.__audioErrCode = null; document.addEventListener('error', (e) => { if (e.target?.id === 'speechAudio' && window.__audioErrCode === null) window.__audioErrCode = e.target.error?.code ?? null; }, true); }")
            page.evaluate("() => { const a = document.querySelector('#speechAudio'); a.src = 'data:audio/wav;base64,AAAA'; a.load(); }")
            page.locator("#status").filter(has_text="Playback failed: audio error").wait_for(timeout=5_000)
            status_text6 = page.locator("#status").inner_text()
            assert "Playback failed: audio error" in status_text6, f"unexpected status: {status_text6}"
            assert "Playback complete" not in status_text6

            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            last_restore6 = page.evaluate("() => window.__lastRestore")
            assert_restored_state(snap6, last_restore6, "Case 6: Mid-playback audio error")

            err_code6 = page.evaluate("() => window.__audioErrCode")
            assert err_code6 is not None, "Case 6: audio element has no real MediaError"

            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # Rebuild the speech player so later cases use a valid audio source again
            # (a byte-identical copy under another name so the file input fires a change event)
            rebuild_dir = Path(tempfile.mkdtemp(prefix="nva-rebuild-plan-"))
            rebuild_plan = rebuild_dir / "rebuild.plan.json"
            rebuild_plan.write_bytes(PLAN_PATH.read_bytes())
            page.locator("#planFile").set_input_files(str(rebuild_plan))
            page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)

            # --- Case 6b: Stop while play() is pending (start race) ---
            print("Testing Case 6b: Stop while play() is pending...")
            page.evaluate("() => { window.__lastRestore = null; }")
            snap6b = page.evaluate("() => window.__takeSnapshot()")
            page.evaluate("() => { document.querySelector('#playComposed').click(); document.querySelector('#stopComposed').click(); }")
            page.wait_for_timeout(1_000)
            status_text6b = page.locator("#status").inner_text()
            assert status_text6b.startswith("Stopped; original ready state restored."), f"Case 6b: unexpected status: {status_text6b}"
            assert page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6b: audio kept playing after stop"
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            last_restore6b = page.evaluate("() => window.__lastRestore")
            assert_restored_state(snap6b, last_restore6b, "Case 6b: Stop while play pending")

            # --- Case 6c: Stop then start a new session while the first play() is pending ---
            print("Testing Case 6c: Restart while earlier play() is pending...")
            page.evaluate("() => { const p = document.querySelector('#playComposed'), s = document.querySelector('#stopComposed'); p.click(); s.click(); p.click(); }")
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            page.wait_for_timeout(150)  # s1.wav is 1.115 s
            status_text6c = page.locator("#status").inner_text()
            assert "Playback failed" not in status_text6c, f"Case 6c: stale play() leaked: {status_text6c}"
            assert not page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6c: new session audio stopped by stale call"
            t0 = page.evaluate("() => document.querySelector('#speechAudio').currentTime")
            page.wait_for_timeout(200)
            t1 = page.evaluate("() => document.querySelector('#speechAudio').currentTime")
            assert 0.1 <= t1 - t0 <= 0.45, f"Case 6c: audio clock not advancing once ({t0} -> {t1})"
            page.locator("#stopComposed").click()
            page.locator("#status").filter(has_text="Stopped; original ready state restored.").wait_for(timeout=5_000)
            page.wait_for_timeout(500)
            assert page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6c: audio kept playing after final stop"

            # --- Case 6d/6e: forced late media start (bodyVideo.play delayed 800ms) ---
            delay_js = "() => { if (!window.__origMediaPlay) window.__origMediaPlay = HTMLMediaElement.prototype.play; const orig = window.__origMediaPlay; HTMLMediaElement.prototype.play = function () { if (this.id !== 'bodyVideo') return orig.call(this); return new Promise((r) => setTimeout(r, 800)).then(() => orig.call(this)); }; }"
            undelay_js = "() => { if (window.__origMediaPlay) HTMLMediaElement.prototype.play = window.__origMediaPlay; }"
            print("Testing Case 6d: Stop while a delayed play() is pending...")
            page.evaluate(delay_js)
            page.locator("#playComposed").click()
            page.wait_for_timeout(100)
            page.locator("#stopComposed").click()
            page.wait_for_timeout(1_500)
            status_text6d = page.locator("#status").inner_text()
            assert status_text6d.startswith("Stopped; original ready state restored."), f"Case 6d: unexpected status: {status_text6d}"
            assert page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6d: late audio kept playing after stop"
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")

            print("Testing Case 6e: Restart while a delayed play() is pending...")
            page.locator("#playComposed").click()
            page.wait_for_timeout(100)
            page.evaluate("() => { window.__staleAudio = document.querySelector('#speechAudio'); }")
            page.locator("#stopComposed").click()
            page.evaluate(undelay_js)
            page.locator("#playComposed").click()
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            # s1.wav is 1.115 s: check within the first ~0.7 s, after the stale call's delayed start (800 ms) has fired
            page.wait_for_timeout(150)
            status_text6e = page.locator("#status").inner_text()
            assert "Playback failed" not in status_text6e, f"Case 6e: stale play() leaked: {status_text6e}"
            assert not page.evaluate("() => document.querySelector('#speechAudio').muted"), "Case 6e: new session audio left muted"
            assert not page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6e: new session audio stopped by stale call"
            t0 = page.evaluate("() => document.querySelector('#speechAudio').currentTime")
            page.wait_for_timeout(200)
            t1 = page.evaluate("() => document.querySelector('#speechAudio').currentTime")
            dbg6e = page.evaluate("() => ({ status: document.getElementById('status').textContent, src: document.querySelector('#speechAudio').getAttribute('src'), paused: document.querySelector('#speechAudio').paused, rebuild: window.__speechRebuildMs })")
            assert 0.1 <= t1 - t0 <= 0.45, f"Case 6e: audio clock not advancing once ({t0} -> {t1}) {dbg6e}"

            # Case 6f: a real late MediaError on the superseded session's audio must not touch the live session
            print("Testing Case 6f: Late error from a superseded session...")
            assert page.evaluate("() => window.__staleAudio !== document.querySelector('#speechAudio') && !window.__staleAudio.isConnected"), "Case 6f: stale audio element was reused or still attached"
            page.evaluate("() => { const a = window.__staleAudio; a.src = 'data:audio/wav;base64,AAAA'; a.load(); }")
            page.wait_for_function("() => window.__staleAudio.error !== null", timeout=5_000)
            page.wait_for_timeout(50)
            status_text6f = page.locator("#status").inner_text()
            assert status_text6f.startswith("Playing from the audio clock."), f"Case 6f: live session affected: {status_text6f}"
            assert not page.evaluate("() => document.querySelector('#speechAudio').paused"), "Case 6f: live session audio stopped"

            # Case 6g: switching to another clip discards the session (muted, paused, detached)
            print("Testing Case 6g: Clip switch discards the composed session...")
            page.evaluate("() => { window.__liveAudio = document.querySelector('#speechAudio'); }")
            page.locator("#playAction").click()
            page.wait_for_timeout(300)
            assert page.evaluate("() => window.__liveAudio.muted && window.__liveAudio.paused && !window.__liveAudio.isConnected"), "Case 6g: switched-away session audio not discarded"
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'action'", timeout=5_000)
            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)
            page.locator("#playComposed").click()
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            page.locator("#stopComposed").click()
            page.locator("#status").filter(has_text="Stopped; original ready state restored.").wait_for(timeout=5_000)

            # Case 6h: switching clips while a prepared (never played) session is held discards it; the next play rebuilds
            print("Testing Case 6h: Clip switch discards the prepared session...")
            plan6h = rebuild_dir / "case6h.plan.json"
            plan6h.write_bytes(PLAN_PATH.read_bytes())
            page.locator("#planFile").set_input_files(str(plan6h))
            page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
            page.evaluate("() => { window.__readyAudio = window.__player()?.audio ?? document.querySelector('#speechAudio'); }")
            page.locator("#playAction").click()
            page.wait_for_timeout(300)
            assert page.evaluate("() => window.__player() === null"), "Case 6h: prepared session still held after clip switch"
            assert page.evaluate("() => window.__readyAudio.muted && window.__readyAudio.paused && !window.__readyAudio.isConnected"), "Case 6h: prepared session audio not discarded on clip switch"
            page.wait_for_function("() => window.__animationPlayer()?.state === 'action'", timeout=5_000)
            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)
            page.locator("#playComposed").click()
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            page.locator("#stopComposed").click()
            page.locator("#status").filter(has_text="Stopped; original ready state restored.").wait_for(timeout=5_000)

            # --- Case 7: Mid-playback chunk decode error ---
            print("Testing Case 7: Mid-playback chunk decode error...")
            page.locator("#action").select_option(value="motion")
            page.locator("#playAction").click()
            page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
            page.wait_for_timeout(200)

            snap7 = page.evaluate("() => window.__takeSnapshot()")
            assert snap7["state"] == "action"
            page.evaluate("() => { window.__lastRestore = null; }")

            page.locator("#playComposed").click()
            page.wait_for_function("() => document.querySelector('#stageCanvas')?.style.display !== 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display === 'none'")

            # Arm chunk corruption for the first lazily sliced WebM chunk, after this session's
            # (re)build and prefetch are done, so only a read during playback is hit
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            page.evaluate("() => { window.__corruptNextSlice = true; }")

            page.locator("#status").filter(has_text="Playback failed: speech asset error").wait_for(timeout=10_000)
            status_text7 = page.locator("#status").inner_text()
            assert "Playback failed: speech asset error" in status_text7, f"unexpected status: {status_text7}"

            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            last_restore7 = page.evaluate("() => window.__lastRestore")
            assert_restored_state(snap7, last_restore7, "Case 7: Mid-playback chunk error")

            page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
            page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # --- Case 8: Interruptions at 120ms, 240ms, 480ms, 720ms, 960ms ---
            offsets_ms = [120, 240, 480, 720, 960]
            for offset in offsets_ms:
                print(f"Testing Case 8: Interruption at {offset}ms...")
                page.locator("#playAction").click()
                page.locator("#status").filter(has_text="Playing action").wait_for(timeout=5_000)
                page.wait_for_timeout(150)

                snap8 = page.evaluate("() => window.__takeSnapshot()")
                assert snap8["state"] == "action"
                page.evaluate("() => { window.__lastRestore = null; }")

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

                last_restore8 = page.evaluate("() => window.__lastRestore")
                assert_restored_state(snap8, last_restore8, f"Case 8: Interruption at {offset}ms")

                # Verify idle restoration when action finishes
                page.evaluate("() => { const v = document.querySelector('#animation'); v.currentTime = 4.95; }")
                page.wait_for_function("() => window.__animationPlayer()?.state === 'idle'", timeout=5_000)

            # --- Case 9: Reopening an NVA during composed playback discards the session ---
            print("Testing Case 9: Reopen NVA during composed playback...")
            plan9 = rebuild_dir / "case9.plan.json"
            plan9.write_bytes(PLAN_PATH.read_bytes())
            page.locator("#planFile").set_input_files(str(plan9))
            page.locator("#status").filter(has_text="composed speech ready").wait_for(timeout=10_000)
            page.locator("#playComposed").click()
            page.locator("#status").filter(has_text="Playing from the audio clock.").wait_for(timeout=10_000)
            page.evaluate("() => { window.__reopenAudio = document.querySelector('#speechAudio'); }")
            reopen_copy = rebuild_dir / "reopen.nva"
            reopen_copy.write_bytes(NVA_PATH.read_bytes())
            page.locator("#nvaFile").set_input_files(str(reopen_copy))
            page.locator("#status").filter(has_text="Ready ·").wait_for(timeout=15_000)
            assert page.evaluate("() => window.__reopenAudio.muted && window.__reopenAudio.paused && !window.__reopenAudio.isConnected"), "Case 9: session audio not discarded on NVA reopen"
            assert page.locator("#stageCanvas").evaluate("el => el.style.display === 'none'")
            assert page.locator("#animation").evaluate("el => el.style.display !== 'none'")

            # Case 9b: reopening an NVA while a SpeechPlan validation is still in flight must not let the stale
            # validation register a session or touch the new NVA's state (plan read delayed 1.5 s)
            print("Testing Case 9b: Reopen NVA during in-flight SpeechPlan validation...")
            page.evaluate("""() => {
                window.__origBlobText = Blob.prototype.text;
                Blob.prototype.text = function () {
                    const read = window.__origBlobText.call(this);
                    if (!(this.name || '').endsWith('.plan.json')) return read;
                    return new Promise((resolve, reject) => setTimeout(() => read.then(resolve, reject), 1500));
                };
            }""")
            page.locator("#audioFile").set_input_files(str(AUDIO_PATH))
            plan9b = rebuild_dir / "case9b.plan.json"
            plan9b.write_bytes(PLAN_PATH.read_bytes())
            page.locator("#planFile").set_input_files(str(plan9b))
            page.locator("#status").filter(has_text="Validating").wait_for(timeout=5_000)
            reopen2 = rebuild_dir / "reopen2.nva"
            reopen2.write_bytes(NVA_PATH.read_bytes())
            page.locator("#nvaFile").set_input_files(str(reopen2))
            page.locator("#status").filter(has_text="Ready ·").wait_for(timeout=15_000)
            page.wait_for_timeout(2500)
            page.evaluate("() => { Blob.prototype.text = window.__origBlobText; }")
            status9b = page.locator("#status").inner_text()
            assert status9b.startswith("Ready ·") and "composed speech ready" not in status9b, f"Case 9b: stale validation changed the status: {status9b}"
            assert page.evaluate("() => window.__player() === null"), "Case 9b: stale validation registered a session"
            assert page.locator("#playComposed").is_disabled(), "Case 9b: stale validation enabled composed play"
            assert page.locator("#quality").evaluate("el => el.style.display === 'none'"), "Case 9b: stale validation showed a quality badge"

            # Assert clean network and browser runtime
            assert external_requests == [], f"external requests detected: {external_requests}"
            assert console_errors == [], f"console errors detected: {console_errors}"
            assert page_errors == [], f"page errors detected: {page_errors}"

            REBUILD_MS[:] = page.evaluate("() => window.__speechRebuildMs")
            assert REBUILD_MS, "no composed session rebuild was measured"

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    print(f"Rebuild timings (ms, fresh SpeechPlayer + media elements per composed session): {REBUILD_MS}")
    print("PASS: viewer speech motion e2e: normal completion, explicit stop, invalid unit, receipt asset hash mismatch, mid-playback audio error, mid-playback chunk error, interruptions (120/240/480/720/960ms), idle restoration, external requests=0, browser errors=0")


if __name__ == "__main__":
    run_e2e()

