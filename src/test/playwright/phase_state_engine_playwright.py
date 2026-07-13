import json
import subprocess
import hashlib
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = ROOT / ".agents" / "work" / "test-results" / "nva-state-engine"
EXAMPLES = sorted(
    p for p in (ROOT / "examples").iterdir()
    if p.is_dir() and p.suffix == ".nva" and (p / "manifest.json").exists()
)
PRIMARY_STATES = {"neutral", "happy", "thinking", "surprised", "sad", "angry"}
QUALITY_STATES = ["neutral", "happy", "sad", "angry", "surprised", "thinking"]


def node_file_url(path: Path) -> str:
    return "file:///" + quote(path.resolve().as_posix())


def track_non_aborted_failures(page, failed_requests: list[str]) -> None:
    def on_failed(req) -> None:
        failure = req.failure or ""
        error_text = failure if isinstance(failure, str) else failure.get("errorText", "")
        if "ERR_ABORTED" not in error_text:
            failed_requests.append(req.url)
    page.on("requestfailed", on_failed)


def rel_files(root: Path) -> set[str]:
    return {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}


def test_p1_manifest_video_cache_contract() -> None:
    for root in EXAMPLES:
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        files = rel_files(root)
        text = json.dumps(manifest, ensure_ascii=False).lower()
        assert "prebaked_speech" not in manifest
        assert not manifest.get("vrm_slots", {}).get("speech")
        assert not any("/say-" in f or f.startswith("clips/ko-") or f.startswith("clips/en-") for f in files)
        assert "viseme_clips" not in manifest
        assert not manifest.get("vrm_slots", {}).get("visemes")
        for banned in ("voxcpm", "elevenlabs", "typecast", "audio_path"):
            assert banned not in text, f"{root.name}: provider/audio ref leaked: {banned}"
        engine = manifest["state_engine"]
        assert engine["states"]
        assert set(engine["states"]).issubset(PRIMARY_STATES)
        if root.name.endswith("-prebaked.nva"):
            assert set(engine["states"]) == PRIMARY_STATES
        if PRIMARY_STATES.issubset(set(engine["states"])):
            assert manifest["prosody_map"]["laughing"]["state"] == "happy"
            assert manifest["prosody_map"]["sigh"]["state"] == "sad"
            assert manifest["prosody_map"]["hesitation"]["state"] == "thinking"
            assert manifest["prosody_map"]["gasp"]["state"] == "surprised"
            assert manifest["prosody_map"]["shout"]["state"] == "angry"
        for state_key, state in engine["states"].items():
            assert state["idle"] in files, f"{root.name}:{state_key}:idle"
            assert state["talking_body"] in files, f"{root.name}:{state_key}:talking_body"
            assert state["face_preview"] in files, f"{root.name}:{state_key}:face_preview"
            assert state.get("sync", {}).get("default_hold_ms", 0) > 0
            for viseme in engine["visemes"]:
                assert state["talking_heads"][viseme] in files, f"{root.name}:{state_key}:{viseme}"
                meta = state["sync"]["heads"][viseme]
                assert meta["duration_ms"] > 0
                assert meta["fps"] > 0
                assert isinstance(meta["loopable"], bool)

def test_p1c_naia_original_idle_and_gestures_preserved() -> None:
    root = ROOT / "examples" / "naia-prebaked.nva"
    source = json.loads((ROOT / "examples" / "naia.nva" / "manifest.json").read_text(encoding="utf-8"))
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    files = rel_files(root)
    assert manifest["animations"]["idle"]["clip"] == source["animations"]["idle"]["clip"]
    assert manifest["animations"]["idle"]["clip"] in files
    assert manifest["animations"]["gesture-1"]["clip"] == "clips/water_drop.webm"
    assert manifest["animations"]["gesture-2"]["clip"] == "clips/heart.webm"
    assert manifest["vrm_slots"]["motions"]["idle"]["clip"] == source["animations"]["idle"]["clip"]
    assert manifest["vrm_slots"]["motions"]["gesture-1"]["clip"] == "clips/water_drop.webm"
    assert manifest["vrm_slots"]["motions"]["gesture-2"]["clip"] == "clips/heart.webm"
    assert "clips/water_drop.webm" in files
    assert "clips/heart.webm" in files
    assert manifest["state_engine"]["states"]["neutral"]["idle"] != manifest["animations"]["gesture-1"]["clip"]
    assert manifest["state_engine"]["states"]["neutral"]["idle"] != manifest["animations"]["gesture-2"]["clip"]


def test_p1d_expression_previews_are_real_distinct_assets() -> None:
    for rel in ("naia-prebaked.nva", "osarang-prebaked.nva"):
        root = ROOT / "examples" / rel
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        review = json.loads((root / "asset-quality.review.json").read_text(encoding="utf-8"))
        checklist = review["expression_previews"]["checklist"]
        assert review["reviewer"]
        assert review["evidence"]
        assert review["expression_previews"]["status"] == "reviewed-pass"
        for key in ("full_head_visible", "eyes_open", "front_facing", "identity_preserved", "not_color_border_placeholder", "no_text_label"):
            assert checklist[key] is True, f"{rel}:{key}"
        hashes: list[str] = []
        for state in QUALITY_STATES:
            data = (root / "expressions" / f"{state}.png").read_bytes()
            assert len(data) > 50000, f"{rel}:{state}:nontrivial image"
            assert review["expression_previews"]["sha256"][f"expressions/{state}.png"] == hashlib.sha256(data).hexdigest()
            hashes.append(hashlib.sha256(data).hexdigest())
        assert len(set(hashes)) == len(QUALITY_STATES), f"{rel}:distinct expression hashes"
        expected_status = "held" if rel == "naia-prebaked.nva" else "reviewed-pass"
        assert review["state_videos"]["status"] == expected_status
        assert manifest["asset_quality"]["state_videos"]["status"] == expected_status
        idle_hashes = set()
        body_hashes = set()
        for state in QUALITY_STATES:
            idle_hashes.add(review["state_videos"]["sha256"][f"clips/{state}/idle.webm"])
            body_hashes.add(review["state_videos"]["sha256"][f"clips/{state}/talking-body.webm"])
            rel_paths = [f"clips/{state}/idle.webm", f"clips/{state}/talking-body.webm"] + [f"clips/{state}/head-{v}.webm" for v in ["sil", "a", "i", "u", "e", "o"]]
            for rel_path in rel_paths:
                assert review["state_videos"]["sha256"][rel_path] == hashlib.sha256((root / rel_path).read_bytes()).hexdigest()
        if rel == "naia-prebaked.nva":
            assert len(idle_hashes) == 1
            assert review["state_videos"]["checklist"]["state_idle_distinct"] is False
            assert review["state_videos"]["checklist"]["full_body_idle"] is True
        else:
            assert len(idle_hashes) == len(QUALITY_STATES)
        assert len(body_hashes) == len(QUALITY_STATES)


def test_p1e_builder_requires_real_expression_assets() -> None:
    text = (ROOT / "scripts" / "build-prebaked-nva.mjs").read_text(encoding="utf-8")
    assert "real expression assets required" in text
    assert "--expression-dir" in text
    assert "real state video assets required" in text
    assert "--state-asset-dir" in text
    assert "default_locale" in text
    assert "available_locales" in text
    assert 'run("cp"' not in text
    assert 'runQuiet("find"' not in text
    assert "viseme-${key}.webm" not in text
    assert "function ffmpegTextClip" not in text
    assert "function ffmpegStateImage" not in text


def test_p1f_builder_runs_with_real_asset_dirs() -> None:
    import os
    import shutil
    out = ROOT / ".agents" / "work" / "tmp" / f"test-build-prebaked-py-{os.getpid()}.nva"
    shutil.rmtree(out, ignore_errors=True)
    subprocess.check_output([
        "node",
        str(ROOT / "scripts" / "build-prebaked-nva.mjs"),
        "--source", str(ROOT / "examples" / "naia.nva"),
        "--out", str(out),
        "--character", "naia",
        "--expression-dir", str(ROOT / "examples" / "naia-prebaked.nva" / "expressions"),
        "--state-asset-dir", str(ROOT / "examples" / "naia-prebaked.nva" / "clips"),
        "--force",
    ], text=True)
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["vrm_slots"]["profile"]["default_locale"] == "ko-KR"
    assert "ko-KR" in manifest["vrm_slots"]["profile"]["available_locales"]
    assert manifest["state_engine"]["states"]["happy"]["talking_heads"]["o"] == "clips/happy/head-o.webm"
    assert (out / "clips" / "happy" / "head-o.webm").exists()
    assert not (out / "clips" / "viseme-o.webm").exists()
    shutil.rmtree(out, ignore_errors=True)

def test_p1b_runtime_sources_do_not_retain_legacy_sentence_speech_paths() -> None:
    code = """
const core = await import('__CORE_URL__');
const invalid = {
  nva_version: '0.2',
  canvas: { width: 1, height: 1 },
  animations: { idle: { clip: 'x.webm', loop: true } },
  state_engine: {
    default_state: 'neutral',
    visemes: ['sil'],
    states: {
      neutral: {
        idle: 'idle.webm',
        talking_body: 'body.webm',
        face_bbox: [0, 0, 1, 1],
        talking_heads: { sil: 'head.webm' },
        sync: { default_hold_ms: 160, heads: { sil: { duration_ms: 160, fps: 25, loopable: true } } },
      },
    },
  },
  vrm_slots: { speech: {}, visemes: {}, foo: {} },
  viseme_clips: {},
  audio_path: 'audio.wav',
};
console.log(JSON.stringify(core.validateManifest(invalid).errors));
""".replace("__CORE_URL__", node_file_url(ROOT / "src" / "main" / "nva-core.js"))
    errors = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", code], text=True))
    joined = "\n".join(errors)
    assert "held prototype state_engine.visemes must include" in joined
    assert "talking_heads.a: clip required" in joined
    assert "face_preview required" in joined
    assert "speech slot map" in joined
    assert "viseme slot map" in joined
    assert "vrm_slots.foo" in joined
    assert "top-level viseme clip map" in joined
    assert "cached audio path" in joined

    code_generated = """
const core = await import('__CORE_URL__');
const fs = await import('node:fs');
const generated = JSON.parse(fs.readFileSync('__MANIFEST_PATH__', 'utf8'));
delete generated.state_engine.states.happy.face_preview;
generated.state_engine.states.extra = JSON.parse(JSON.stringify(generated.state_engine.states.neutral));
console.log(JSON.stringify(core.validateManifest(generated).errors));
""".replace("__CORE_URL__", node_file_url(ROOT / "src" / "main" / "nva-core.js")).replace("__MANIFEST_PATH__", (ROOT / "examples" / "osarang-prebaked.nva" / "manifest.json").as_posix())
    generated_errors = "\n".join(json.loads(subprocess.check_output(["node", "--input-type=module", "-e", code_generated], text=True)))
    assert "state_engine.states.happy: face_preview required" in generated_errors
    assert "state_engine.states.extra: not allowed in primary generated state set" in generated_errors

    source_files = [
        ROOT / "src" / "main" / "editor.html",
        ROOT / "src" / "main" / "prebaked-player.html",
        ROOT / "scripts" / "build-prebaked-nva.mjs",
        ROOT / "scripts" / "generate-local-tts-wav.mjs",
    ]
    banned = [
        "prebaked" + "_speech",
        "vrm_slots" + ".speech",
        "slots" + ".speech",
        "s" + ".speech",
        "say-.*\\.webm",
        "say-.*\\.wav",
        "audio_path",
        "viseme_clips",
        "vrm_slots" + ".visemes",
        "slots" + ".visemes",
    ]
    for path in source_files:
        text = path.read_text(encoding="utf-8")
        for token in banned:
            if token.startswith("say-"):
                import re
                assert not re.search(token, text), f"{path.relative_to(ROOT)}:{token}"
            else:
                assert token not in text, f"{path.relative_to(ROOT)}:{token}"

def test_p2_core_timeline_adapter() -> None:
    code = """
const core = await import('__CORE_URL__');
const visemes = ['sil','a','i','u','e','o'];
const phoneme = core.buildTtsVisemeTimeline({ text:'ignored', visemes, phonemes:[{t_ms:10, viseme:'a'}, {t_ms:70, phoneme:'i'}] });
const boundary = core.buildTtsVisemeTimeline({ text:'ao', visemes, boundaries:[{elapsedTime:0.12, charIndex:0}, {elapsedTime:0.34, charIndex:1}] });
const fallback = core.buildTtsVisemeTimeline({ text:'aiueo', visemes, sync:{default_hold_ms:160} });
const messy = core.buildTtsVisemeTimeline({ text:'ao', visemes, boundaries:[{elapsed_ms:300, char_index:9}, {t_ms:-20, index:0}, {elapsedTimeMs:120, charIndex:1}] });
console.log(JSON.stringify({
  phoneme: phoneme.map(x => [x.viseme, x.source]),
  boundary: boundary.map(x => [x.viseme, x.source]),
  fallback: fallback.map(x => x.viseme),
  messy,
  at500: core.visemeAtTime(fallback, 500),
}));
""".replace("__CORE_URL__", node_file_url(ROOT / "src" / "main" / "nva-core.js"))
    out = subprocess.check_output(["node", "--input-type=module", "-e", code], text=True)
    data = json.loads(out)
    assert data["phoneme"] == [["a", "phoneme"], ["i", "phoneme"]]
    assert data["boundary"] == [["a", "boundary"], ["o", "boundary"]]
    assert data["fallback"] == ["sil", "a", "i", "u", "e", "o", "sil"]
    assert data["at500"] == "u"
    assert [x["t_ms"] for x in data["messy"]] == sorted(x["t_ms"] for x in data["messy"])
    assert all(x["t_ms"] >= 0 for x in data["messy"])
    assert all(x["viseme"] in ["sil", "a", "i", "u", "e", "o"] for x in data["messy"])

def test_p2b_prosody_tags_route_to_primary_states_only() -> None:
    code = """
const core = await import('__CORE_URL__');
const fs = await import('node:fs');
const manifest = JSON.parse(fs.readFileSync('__MANIFEST_PATH__', 'utf8'));
const bad = JSON.parse(JSON.stringify(manifest));
bad.prosody_map.laughing.state = 'laughing';
console.log(JSON.stringify({
  tags: core.extractProsodyTags('[laughing] hi [sigh]').map(x => x.tag),
  stripped: core.stripProsodyTags('[laughing] hello [pause] world'),
  routes: {
    laughing: core.routeProsodyState(manifest, '[laughing] aiueo').state,
    sigh: core.routeProsodyState(manifest, '[sigh] aiueo').state,
    pause: core.routeProsodyState(manifest, '[pause] aiueo').state,
    gasp: core.routeProsodyState(manifest, '[gasp] aiueo').state,
    shout: core.routeProsodyState(manifest, '[shout] aiueo').state,
    whisper: core.routeProsodyState(manifest, '[whisper] aiueo').state,
  },
  prosodyKeys: Object.keys(manifest.prosody_map),
  badErrors: core.validateManifest(bad).errors,
}));
""".replace("__CORE_URL__", node_file_url(ROOT / "src" / "main" / "nva-core.js")).replace("__MANIFEST_PATH__", (ROOT / "examples" / "osarang-prebaked.nva" / "manifest.json").as_posix())
    data = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", code], text=True))
    assert data["tags"] == ["laughing", "sigh"]
    assert data["stripped"] == "hello world"
    assert data["routes"] == {
        "laughing": "happy",
        "sigh": "sad",
        "pause": "thinking",
        "gasp": "surprised",
        "shout": "angry",
        "whisper": "neutral",
    }
    assert not (PRIMARY_STATES & set(data["prosodyKeys"]))
    assert any("prosody_map.laughing: state missing laughing" in e for e in data["badErrors"])


def test_p3_p4_editor_runtime_timeline_and_blocking() -> None:
    with sync_playwright() as pw:
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        console_errors: list[str] = []
        sentence_clip_requests: list[str] = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))
        failed_requests: list[str] = []
        asset_responses: list[tuple[str, int]] = []
        track_non_aborted_failures(page, failed_requests)
        page.on("response", lambda res: asset_responses.append((res.url, res.status)) if "/clips/" in res.url or "/expressions/" in res.url else None)
        page.on("request", lambda req: sentence_clip_requests.append(req.url) if "say-" in req.url else None)

        page.goto("http://localhost:8785/src/main/editor.html", wait_until="domcontentloaded")
        page.wait_for_selector("#cv")
        page.click("#loadOsarang")
        page.wait_for_timeout(800)

        default_text = page.locator("#ttsText").input_value()
        assert any("\uac00" <= ch <= "\ud7a3" for ch in default_text)
        assert default_text != "aiueo"
        page.click("#ttsVisemeSmoke")
        assert page.locator("#ttsText").input_value() == "aiueo"
        page.click("#ttsKoreanSample")
        assert any("\uac00" <= ch <= "\ud7a3" for ch in page.locator("#ttsText").input_value())
        status_text = page.locator("#ttsStatus").text_content() or ""
        assert "aiueo is only" in status_text
        assert "numbers and symbols" in status_text

        page.locator("#exprGalleryGrid button").nth(1).click()
        page.wait_for_timeout(300)
        page.fill("#ttsText", "aiueo")
        page.click("#ttsSpeak")
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.ttsStarted === true")
        page.wait_for_timeout(300)
        page.screenshot(path=str(ARTIFACT_DIR / "python-editor-tts-overlay.png"), full_page=True)
        debug = page.evaluate("window.__nvaDebug")
        assert debug["current"]["key"].startswith("state:")
        assert debug["current"]["key"].endswith(":talking")
        assert debug["current"]["clip"].endswith("talking-body.webm")
        assert debug["ttsStarted"] is True
        assert debug["ttsError"] is None
        assert debug["videoReady"] >= 2
        assert debug["headReady"] >= 2
        assert [x["viseme"] for x in debug["engineSpeech"]["timeline"]] == ["sil", "a", "i", "u", "e", "o", "sil"]
        assert debug["engineSpeech"]["sync"]["mode"] in ("timeline", "speechSynthesis.boundary")
        assert sentence_clip_requests == []
        assert any(url.endswith("talking-body.webm") and status == 200 for url, status in asset_responses)
        assert any("head-" in url and url.endswith(".webm") and status == 200 for url, status in asset_responses)
        assert failed_requests == []

        page.click("#ttsStop")
        page.wait_for_timeout(300)
        debug = page.evaluate("window.__nvaDebug")
        assert debug["engineSpeech"] is None
        assert debug["current"]["key"].endswith(":idle")

        page.locator("#exprGalleryGrid button").first.click()
        page.locator('[data-head="a"]').fill("")
        page.locator('[data-head="a"]').dispatch_event("change")
        page.fill("#ttsText", "a")
        page.click("#ttsSpeak")
        page.wait_for_timeout(400)
        status = page.locator("#ttsStatus").text_content() or ""
        assert "State engine assets missing" in status or "blocked" in status
        assert console_errors == []
        browser.close()


def test_p3c_naia_original_idle_and_gestures_play_in_editor() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        failed_requests: list[str] = []
        track_non_aborted_failures(page, failed_requests)
        page.goto("http://localhost:8785/src/main/editor.html", wait_until="domcontentloaded")
        page.wait_for_selector("#cv")
        page.click("#loadNaia")
        page.wait_for_timeout(800)

        page.locator("#animList .item").first.click()
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.videoReady >= 2")
        debug = page.evaluate("window.__nvaDebug")
        assert debug["current"]["clip"] == "clips/sijak.webm"

        page.locator("#animList .item", has_text="water drop").click()
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.videoReady >= 2")
        debug = page.evaluate("window.__nvaDebug")
        assert debug["current"]["clip"] == "clips/water_drop.webm"

        page.locator("#animList .item", has_text="heart").click()
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.videoReady >= 2")
        debug = page.evaluate("window.__nvaDebug")
        assert debug["current"]["clip"] == "clips/heart.webm"
        assert failed_requests == []
        browser.close()


def test_p3b_editor_prosody_routing_and_visual_evidence() -> None:
    with sync_playwright() as pw:
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        console_errors: list[str] = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))
        failed_requests: list[str] = []
        asset_responses: list[tuple[str, int]] = []
        track_non_aborted_failures(page, failed_requests)
        page.on("response", lambda res: asset_responses.append((res.url, res.status)) if "/clips/" in res.url or "/expressions/" in res.url else None)
        page.goto("http://localhost:8785/src/main/editor.html", wait_until="domcontentloaded")
        page.wait_for_selector("#cv")
        page.click("#loadOsarang")
        page.wait_for_timeout(800)
        assert page.locator("#exprGalleryGrid button").count() == len(PRIMARY_STATES)
        page.locator("#right").screenshot(path=str(ARTIFACT_DIR / "python-editor-state-gallery.png"))
        page.fill("#ttsText", "[sigh] aiueo")
        page.click("#ttsSpeak")
        page.wait_for_timeout(900)
        debug = page.evaluate("window.__nvaDebug")
        assert debug["activeState"] == "sad"
        assert debug["ttsRawText"] == "[sigh] aiueo"
        assert debug["ttsSpokenText"] == "aiueo"
        assert "[sigh]" not in debug["ttsSpokenText"]
        assert debug["engineSpeech"]["state"] == "sad"
        assert debug["current"]["key"] == "state:sad:talking"
        assert debug["videoReady"] >= 2
        assert debug["headReady"] >= 2
        assert any(url.endswith("/sad/talking-body.webm") and status == 200 for url, status in asset_responses)
        assert any("/sad/head-" in url and url.endswith(".webm") and status == 200 for url, status in asset_responses)
        assert failed_requests == []
        page.screenshot(path=str(ARTIFACT_DIR / "python-editor-prosody-sad-talking.png"), full_page=True)
        assert console_errors == []
        browser.close()


def test_p3d_selected_state_resource_previews() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        failed_requests: list[str] = []
        track_non_aborted_failures(page, failed_requests)
        page.goto("http://localhost:8785/src/main/editor.html", wait_until="domcontentloaded")
        page.wait_for_timeout(800)

        page.locator("#exprGalleryGrid button", has_text="sad").click()
        page.wait_for_function("window.__nvaDebug && /clips\\/sad\\/idle\\.webm$/.test(window.__nvaDebug.current && window.__nvaDebug.current.clip)")
        assert page.locator("#formBody .resRow").count() == 9

        page.locator('#formBody .resRow button[data-res-preview="face_preview"]').click()
        debug = page.evaluate("window.__nvaDebug")
        assert debug["resourcePreview"]["state"] == "sad"
        assert debug["resourcePreview"]["role"] == "face_preview"
        assert debug["resourcePreview"]["type"] == "image"
        assert debug["engineSpeech"] is None
        assert page.locator("#resourcePreviewBox img").get_attribute("src").endswith("expressions/sad.png")

        page.locator('#formBody .resRow button[data-res-preview="idle"]').click()
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.resourcePreview && window.__nvaDebug.resourcePreview.readyState >= 2")
        debug = page.evaluate("window.__nvaDebug")
        assert debug["resourcePreview"]["state"] == "sad"
        assert debug["resourcePreview"]["role"] == "idle"
        assert debug["resourcePreview"]["type"] == "video"
        assert debug["resourcePreview"]["path"] == "clips/sad/idle.webm"
        assert debug["current"]["key"] == "state:sad:idle"
        assert debug["engineSpeech"] is None

        page.locator('#formBody .resRow button[data-res-preview="head:a"]').click()
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.resourcePreview && window.__nvaDebug.resourcePreview.readyState >= 2")
        debug = page.evaluate("window.__nvaDebug")
        assert debug["resourcePreview"]["state"] == "sad"
        assert debug["resourcePreview"]["role"] == "head:a"
        assert debug["resourcePreview"]["type"] == "video"
        assert debug["resourcePreview"]["path"] == "clips/sad/head-a.webm"
        assert debug["engineSpeech"] is None

        expected_resources = [
            ("face_preview", "image", "expressions/sad.png"),
            ("idle", "video", "clips/sad/idle.webm"),
            ("talking_body", "video", "clips/sad/talking-body.webm"),
            ("head:sil", "video", "clips/sad/head-sil.webm"),
            ("head:a", "video", "clips/sad/head-a.webm"),
            ("head:i", "video", "clips/sad/head-i.webm"),
            ("head:u", "video", "clips/sad/head-u.webm"),
            ("head:e", "video", "clips/sad/head-e.webm"),
            ("head:o", "video", "clips/sad/head-o.webm"),
        ]
        for role, typ, resource_path in expected_resources:
            page.locator(f'#formBody .resRow button[data-res-preview="{role}"]').click()
            if typ == "video":
                page.wait_for_function("window.__nvaDebug && window.__nvaDebug.resourcePreview && window.__nvaDebug.resourcePreview.readyState >= 2")
            debug = page.evaluate("window.__nvaDebug")
            assert debug["resourcePreview"]["state"] == "sad"
            assert debug["resourcePreview"]["role"] == role
            assert debug["resourcePreview"]["type"] == typ
            assert debug["resourcePreview"]["path"] == resource_path

        page.fill("#ttsText", "aiueo")
        page.click("#ttsSpeak")
        page.wait_for_function("window.__nvaDebug && window.__nvaDebug.ttsStarted === true")
        before = page.evaluate("({current: window.__nvaDebug.current, engineSpeech: window.__nvaDebug.engineSpeech})")
        page.locator('#formBody .resRow button[data-res-preview="face_preview"]').click()
        debug = page.evaluate("window.__nvaDebug")
        assert debug["engineSpeech"]["state"] == before["engineSpeech"]["state"]
        assert debug["current"]["key"] == before["current"]["key"]
        assert debug["current"]["clip"] == before["current"]["clip"]
        assert failed_requests == []
        browser.close()


if __name__ == "__main__":
    test_p1_manifest_video_cache_contract()
    test_p1c_naia_original_idle_and_gestures_preserved()
    test_p1d_expression_previews_are_real_distinct_assets()
    test_p1e_builder_requires_real_expression_assets()
    test_p1f_builder_runs_with_real_asset_dirs()
    test_p1b_runtime_sources_do_not_retain_legacy_sentence_speech_paths()
    test_p2_core_timeline_adapter()
    test_p2b_prosody_tags_route_to_primary_states_only()
    test_p3_p4_editor_runtime_timeline_and_blocking()
    test_p3b_editor_prosody_routing_and_visual_evidence()
    test_p3d_selected_state_resource_previews()
    test_p3c_naia_original_idle_and_gestures_play_in_editor()
    print("phase_state_engine_playwright: PASS")
