#!/usr/bin/env python3
"""
tools/jina-fastpath/recorder.py
Playwright Chromium(GPU 비활성화, no-user-gesture-required)을 실행하여
record-composed.html 및 record-studio-way.html을 녹화하고 결과를 저장.
"""

import argparse
import base64
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

def record_composed(page, server_url: str, nva_url: str, audio_url: str, plan_url: str, out_path: Path) -> dict:
    url = f"{server_url}/tools/jina-fastpath/record-composed.html"
    page.goto(url)

    # runComposedRecording 실행
    script = f"window.runComposedRecording('{nva_url}', '{audio_url}', '{plan_url}')"
    page.evaluate(script)

    # 녹화 완료 대기 (최대 120초)
    page.wait_for_function("window.__recordingResult !== undefined", timeout=120000)
    result = page.evaluate("window.__recordingResult")

    if not result.get("ok"):
        raise RuntimeError(f"Composed recording failed: {result.get('error', 'unknown error')}")

    b64_data = result.pop("base64", None)
    if not b64_data:
        raise RuntimeError(f"No base64 video data returned: result keys={list(result.keys())}")
    b64_data = b64_data.strip()
    # Add padding if needed
    missing_padding = len(b64_data) % 4
    if missing_padding:
        b64_data += '=' * (4 - missing_padding)
    raw_bytes = base64.b64decode(b64_data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(raw_bytes)

    return result

def record_studio(page, server_url: str, manifest_url: str, atlas_url: str, base_video_url: str, audio_url: str, out_path: Path) -> dict:
    url = f"{server_url}/tools/jina-fastpath/record-studio-way.html"
    page.goto(url)

    # runStudioRecording 실행
    script = f"window.runStudioRecording('{manifest_url}', '{atlas_url}', '{base_video_url}', '{audio_url}')"
    page.evaluate(script)

    # 녹화 완료 대기 (최대 120초)
    page.wait_for_function("window.__recordingResult !== undefined", timeout=120000)
    result = page.evaluate("window.__recordingResult")

    if not result.get("ok"):
        raise RuntimeError(f"Studio recording failed: {result.get('error', 'unknown error')}")

    b64_data = result.pop("base64", None)
    if not b64_data:
        raise RuntimeError(f"No base64 video data returned: result keys={list(result.keys())}")
    b64_data = b64_data.strip()
    missing_padding = len(b64_data) % 4
    if missing_padding:
        b64_data += '=' * (4 - missing_padding)
    raw_bytes = base64.b64decode(b64_data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(raw_bytes)

    return result

def record_viewer_rejection(page, server_url: str, nva_path: Path, out_screenshot: Path) -> dict:
    import time
    url = f"{server_url}/viewer/viewer.html"
    page.goto(url)
    page.wait_for_selector("#nvaFile", timeout=10000)
    page.set_input_files("#nvaFile", str(nva_path))
    page.wait_for_function('document.getElementById("status").textContent.includes("Blocked:")', timeout=30000)
    time.sleep(0.5)
    status_text = page.text_content("#status")
    out_screenshot.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out_screenshot))
    return {
        "ok": True,
        "mode": "viewer_rejection",
        "status_text": status_text,
        "screenshot": str(out_screenshot),
    }

def record_viewer_speech(page, server_url: str, nva_path: Path, out_path: Path) -> dict:
    url = f"{server_url}/viewer/viewer.html"
    page.goto(url)
    page.wait_for_selector("#nvaFile", timeout=10000)
    page.set_input_files("#nvaFile", str(nva_path))
    page.wait_for_function('!document.getElementById("playSpeech").disabled', timeout=30000)

    res = page.evaluate('''() => {
        return new Promise((resolve, reject) => {
            const video = document.getElementById("animation");
            let mimeType = 'video/webm; codecs="vp9,opus"';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";

            let recorder = null;
            const chunks = [];
            let startTime = 0;
            let endTime = 0;

            const onPlay = () => {
                const stream = video.captureStream();
                recorder = new MediaRecorder(stream, { mimeType });
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };
                recorder.onstop = async () => {
                    endTime = performance.now();
                    const finalBlob = new Blob(chunks, { type: mimeType });
                    const arrayBuf = await finalBlob.arrayBuffer();
                    let binary = "";
                    const bytes = new Uint8Array(arrayBuf);
                    const chunkSize = 0x8000;
                    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength)));
                    }
                    resolve({
                        ok: true,
                        recordDurationSec: (endTime - startTime) / 1000,
                        videoDuration: video.duration,
                        blobSize: finalBlob.size,
                        base64: btoa(binary)
                    });
                };
                startTime = performance.now();
                recorder.start(100);
            };

            const onEnded = () => {
                if (recorder && recorder.state !== "inactive") {
                    recorder.stop();
                }
            };

            video.addEventListener("play", onPlay, { once: true });
            video.addEventListener("ended", onEnded, { once: true });
            video.addEventListener("error", (err) => {
                if (recorder && recorder.state !== "inactive") recorder.stop();
                reject(err);
            }, { once: true });

            document.getElementById("playSpeech").click();
        });
    }''')

    b64_data = res.pop("base64", None)
    if not b64_data:
        raise RuntimeError("No base64 video data returned from viewer recording")
    b64_data = b64_data.strip()
    missing_padding = len(b64_data) % 4
    if missing_padding:
        b64_data += '=' * (4 - missing_padding)
    raw_bytes = base64.b64decode(b64_data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(raw_bytes)
    return res

def main():
    parser = argparse.ArgumentParser(description="Jina Fastpath Playwright Recorder")
    parser.add_argument("--mode", choices=["composed", "studio", "viewer_rejection", "viewer_speech"], required=True)
    parser.add_argument("--server-url", required=True)
    parser.add_argument("--out", required=True, help="Output path (webm or png)")
    parser.add_argument("--report", required=True, help="Report json path")

    # composed args
    parser.add_argument("--nva-url", default="/data/jina-speech-set.nva")
    parser.add_argument("--audio-url", default="")
    parser.add_argument("--plan-url", default="")

    # studio args
    parser.add_argument("--manifest-url", default="/studio-assets/jina-speech-set.json")
    parser.add_argument("--atlas-url", default="/studio-assets/jina-mouth-atlas.png")
    parser.add_argument("--base-video-url", default="/studio-assets/jina-idle-transparent.webm")

    # viewer args
    parser.add_argument("--nva-file", default="", help="File path for viewer upload")

    args = parser.parse_args()
    out_path = Path(args.out).resolve()
    report_path = Path(args.report).resolve()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--autoplay-policy=no-user-gesture-required",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ]
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 1400}
        )
        page = context.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

        try:
            if args.mode == "composed":
                res = record_composed(
                    page,
                    args.server_url,
                    args.nva_url,
                    args.audio_url,
                    args.plan_url,
                    out_path
                )
            elif args.mode == "studio":
                res = record_studio(
                    page,
                    args.server_url,
                    args.manifest_url,
                    args.atlas_url,
                    args.base_video_url,
                    args.audio_url,
                    out_path
                )
            elif args.mode == "viewer_rejection":
                res = record_viewer_rejection(
                    page,
                    args.server_url,
                    Path(args.nva_file).resolve(),
                    out_path
                )
            elif args.mode == "viewer_speech":
                res = record_viewer_speech(
                    page,
                    args.server_url,
                    Path(args.nva_file).resolve(),
                    out_path
                )
            else:
                raise ValueError(f"Unknown mode: {args.mode}")

            res["browserConsole"] = console_messages
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"SUCCESS: {out_path} ({out_path.stat().st_size} bytes)")
        except Exception as e:
            err_data = {
                "ok": False,
                "error": str(e),
                "browserConsole": console_messages
            }
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(err_data, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
