import test from "node:test";
import assert from "node:assert/strict";

import { SpeechPlayer } from "../main/speech-player.js";

test("SpeechPlayer rejects incomplete browser dependencies before touching media", () => {
  assert.throws(() => new SpeechPlayer({}), /audio, canvas, and bodyVideo/);
  assert.throws(() => new SpeechPlayer({
    audio: {}, canvas: {}, bodyVideo: {}, speechVideos: [{}, {}],
  }), /canvas must expose/);
});

test("SpeechPlayer exposes a read-only lifecycle and restores its ready state", () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener() {}, removeAttribute() {}, load() {},
  });
  const player = new SpeechPlayer({
    audio: media(),
    canvas: { getContext: () => ({}) },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}), requestFrame: () => 1, cancelFrame() {},
  });
  player.state = "ready";
  player.token = player.playbackState.begin("speaking");
  player.stop("cancel");
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "cancel");
  player.dispose();
  assert.equal(player.state, "disposed");
});

test("SpeechPlayer restores ready state when browser media play rejects", async () => {
  const media = () => ({
    currentTime: 3, pause() {}, removeEventListener() {}, addEventListener() {}, removeAttribute() {}, load() {},
  });
  const audio = media(); audio.play = async () => { throw new Error("blocked"); };
  const body = media(); body.play = async () => {};
  const player = new SpeechPlayer({
    audio, canvas: { getContext: () => ({}) }, bodyVideo: body,
    speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}), requestFrame: () => 1, cancelFrame() {},
  });
  player.state = "ready";
  await assert.rejects(() => player.play(), /blocked/);
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "error");
  assert.equal(audio.currentTime, 0);
  assert.equal(body.currentTime, 0);
});

test("default browser frame functions retain their global invocation context", () => {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let cancelled = null;
  globalThis.requestAnimationFrame = function (callback) {
    assert.equal(this, globalThis);
    assert.equal(typeof callback, "function");
    return 41;
  };
  globalThis.cancelAnimationFrame = function (handle) {
    assert.equal(this, globalThis);
    cancelled = handle;
  };
  const media = () => ({ pause() {}, removeEventListener() {}, addEventListener() {}, load() {} });
  try {
    const player = new SpeechPlayer({
      audio: media(), canvas: { getContext: () => ({}) }, bodyVideo: media(),
      speechVideos: [media(), media()], imageLoader: async () => ({}),
    });
    assert.equal(player.requestFrame(() => {}), 41);
    player.cancelFrame(41);
    assert.equal(cancelled, 41);
  } finally {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});

async function buildWholeHeadFixture({ atlasKeys = ["sil>closed"], alignedEvents = null } = {}) {
  const manifest = {
    nva_version: "0.2",
    canvas: { width: 720, height: 1280, fps: 25 },
    animations: {
      speak: { clip: "clips/speak.webm", loop: true, can_talk: true, face_bbox: [0.2, 0.1, 0.6, 0.4] },
    },
    speech_motion: {
      version: "1",
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
      inventory_version: "1.0.0",
      inventory: ["sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round"],
      neutral_head: "speech/neutral-head.png",
      atlas: "speech/atlas.bin",
      atlas_index: "speech/atlas-index.json",
      validation_report: "speech/validation-report.json",
      quality_report: "speech/quality-report.json",
      provenance: "speech/generation-result.json",
    },
  };

  const audioBytes = new Uint8Array([1, 2, 3, 4]);
  const audioDigest = await crypto.subtle.digest("SHA-256", audioBytes);
  const audioSha = Buffer.from(audioDigest).toString("hex");

  const alignedPlan = {
    version: "1",
    quality_mode: "aligned",
    aligner: { provider: "test", version: "1.0", model_sha256: "0".repeat(64) },
    audio: { sha256: audioSha, duration_us: 100_000 },
    text: "test",
    events: alignedEvents ?? [
      { unit: "sil", start_us: 0, end_us: 50_000 },
      { unit: "closed", start_us: 50_000, end_us: 100_000 },
    ],
  };
  if (alignedEvents) alignedPlan.audio.duration_us = alignedEvents.at(-1).end_us;

  const browserPlan = {
    version: "1",
    quality_mode: "browser-timed",
    audio: { duration_us: 100_000 },
    text: "test",
    events: [
      { unit: "sil", start_us: 0, end_us: 50_000 },
      { unit: "closed", start_us: 50_000, end_us: 100_000 },
    ],
  };

  const receipt = {
    version: "1",
    job_id: "job_01JINA2Y7Q0M8T6R4P2N",
    assets: [
      { role: "neutral_head", path: "speech/neutral-head.png", sha256: "a".repeat(64), bytes: 10 },
      { role: "speech_atlas", path: "speech/atlas.bin", sha256: "b".repeat(64), bytes: 5 },
      { role: "speech_atlas_index", path: "speech/atlas-index.json", sha256: "c".repeat(64), bytes: 20 },
      { role: "validation_report", path: "speech/validation-report.json", sha256: "d".repeat(64), bytes: 10 },
      { role: "quality_report", path: "speech/quality-report.json", sha256: "e".repeat(64), bytes: 10 },
    ],
    provenance: {
      generator: { kind: "ditto", version: "1.0" },
      input_sha256: "1".repeat(64), settings_sha256: "2".repeat(64),
      inventory_version: "1.0.0", inventory: [...manifest.speech_motion.inventory],
      validation: { status: "passed", report_sha256: "d".repeat(64) },
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
    },
    quality: {
      report_sha256: "e".repeat(64),
      sync: { status: "screened" }, continuity: { status: "screened" }, naturalness: { status: "not_evaluated" },
      performance: { status: "screened" }, bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };

  // One distinct 5-byte slice per key, laid out back to back.
  const atlasBytes = new Uint8Array(atlasKeys.length * 5).map((_, i) => i + 1);
  const atlasBlob = new Blob([atlasBytes]);
  const atlasDigest = await crypto.subtle.digest("SHA-256", await atlasBlob.arrayBuffer());
  const atlasSha = Buffer.from(atlasDigest).toString("hex");
  receipt.assets.find((a) => a.role === "speech_atlas").sha256 = atlasSha;
  receipt.assets.find((a) => a.role === "speech_atlas").bytes = atlasBlob.size;

  const atlasIndexObj = { version: "1", entries: {} };
  for (const [i, key] of atlasKeys.entries()) {
    const slice = atlasBytes.slice(i * 5, i * 5 + 5);
    const sliceSha = Buffer.from(await crypto.subtle.digest("SHA-256", slice)).toString("hex");
    atlasIndexObj.entries[key] = { offset: i * 5, length: 5, sha256: sliceSha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true };
  }
  const atlasIndexBlob = new Blob([JSON.stringify(atlasIndexObj)]);
  const atlasIndexDigest = await crypto.subtle.digest("SHA-256", await atlasIndexBlob.arrayBuffer());
  receipt.assets.find((a) => a.role === "speech_atlas_index").sha256 = Buffer.from(atlasIndexDigest).toString("hex");
  receipt.assets.find((a) => a.role === "speech_atlas_index").bytes = atlasIndexBlob.size;

  const neutralBlob = new Blob([new Uint8Array(10)]);
  const neutralDigest = await crypto.subtle.digest("SHA-256", await neutralBlob.arrayBuffer());
  receipt.assets.find((a) => a.role === "neutral_head").sha256 = Buffer.from(neutralDigest).toString("hex");

  const valBlob = new Blob([new Uint8Array(10)]);
  const valDigest = await crypto.subtle.digest("SHA-256", await valBlob.arrayBuffer());
  const valSha = Buffer.from(valDigest).toString("hex");
  receipt.assets.find((a) => a.role === "validation_report").sha256 = valSha;
  receipt.provenance.validation.report_sha256 = valSha;

  const qualBlob = new Blob([new Uint8Array(10)]);
  const qualDigest = await crypto.subtle.digest("SHA-256", await qualBlob.arrayBuffer());
  const qualSha = Buffer.from(qualDigest).toString("hex");
  receipt.assets.find((a) => a.role === "quality_report").sha256 = qualSha;
  receipt.quality.report_sha256 = qualSha;

  const receiptBlob = new Blob([JSON.stringify(receipt)]);

  const assets = new Map([
    ["clips/speak.webm", new Blob([new Uint8Array(20)])],
    ["speech/neutral-head.png", neutralBlob],
    ["speech/atlas.bin", atlasBlob],
    ["speech/atlas-index.json", atlasIndexBlob],
    ["speech/validation-report.json", valBlob],
    ["speech/quality-report.json", qualBlob],
    ["speech/generation-result.json", receiptBlob],
  ]);

  return { manifest, assets, alignedPlan, browserPlan, audioBytes };
}

test("SpeechPlayer accepts whole-head-layer without ditto_region and binds region from speech_motion", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1,
  });
  const player = new SpeechPlayer({
    audio: media(), canvas: { getContext: () => ({ clearRect() {}, drawImage() {}, save() {}, restore() {} }), width: 720, height: 1280 },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
  });

  const { manifest, assets, alignedPlan, audioBytes } = await buildWholeHeadFixture();

  const result = await player.load({
    manifest,
    assets,
    plan: alignedPlan,
    audioBlob: new Blob([audioBytes]),
  });

  assert.equal(result.transitions, 1);
  assert.equal(player.representation, "whole-head-layer");
  assert.deepEqual(player.region, [280, 70, 158, 242]);
});

test("SpeechPlayer external clock mode requires a browser-timed plan, prepares without audio, rejects play() mix, and releases clock on stop", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1, async play() {},
    currentTime: 0, readyState: 4,
  });
  let frameCallback = null;
  const player = new SpeechPlayer({
    audio: media(),
    canvas: { getContext: () => ({ clearRect() {}, drawImage() {}, save() {}, restore() {} }), width: 720, height: 1280 },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
    requestFrame: (cb) => { frameCallback = cb; return 1; },
    cancelFrame: () => {},
  });

  const { manifest, assets, alignedPlan, browserPlan } = await buildWholeHeadFixture();

  // (1) loadExternal rejects aligned SpeechPlan
  await assert.rejects(
    () => player.loadExternal({ manifest, assets, plan: alignedPlan }),
    /external browser clock requires a browser-timed SpeechPlan/
  );

  // (2) loadExternal prepares without audioBlob
  const loadResult = await player.loadExternal({ manifest, assets, plan: browserPlan });
  assert.equal(loadResult.quality_mode, "browser-timed");
  assert.equal(player.state, "ready");
  assert.equal(player.mode, "external");

  // (3) Calling play() when loaded external rejects
  await assert.rejects(
    () => player.play(),
    /SpeechPlayer is not loaded for audio playback/
  );

  // (4) playExternal draws with external clock function
  let clockTime = 0.02;
  await player.playExternal(() => clockTime);
  assert.equal(player.state, "speaking");
  assert.equal(typeof frameCallback, "function");

  // Advance clock and tick
  clockTime = 0.08;
  frameCallback();
  assert.equal(player.state, "speaking");

  // (5) stop clears externalClock and restores ready state
  player.stop("complete");
  assert.equal(player.state, "ready");
  assert.equal(player.externalClock, null);
  assert.equal(player.playbackState.lastOutcome, "complete");
});

test("SpeechPlayer rejects playExternal when loaded in audio mode", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1, async play() {},
    currentTime: 0, readyState: 4,
  });
  const player = new SpeechPlayer({
    audio: media(),
    canvas: { getContext: () => ({ clearRect() {}, drawImage() {}, save() {}, restore() {} }), width: 720, height: 1280 },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
  });
  const { manifest, assets, alignedPlan, audioBytes } = await buildWholeHeadFixture();
  await player.load({ manifest, assets, plan: alignedPlan, audioBlob: new Blob([audioBytes]) });
  assert.equal(player.mode, "audio");
  await assert.rejects(
    () => player.playExternal(() => 0.1),
    /SpeechPlayer is not loaded for browser TTS playback/
  );
  player.dispose();
});

test("SpeechPlayer renders whole-head-layer frames with external clock", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1, async play() {},
    currentTime: 0, readyState: 4,
  });
  const drawn = [];
  const player = new SpeechPlayer({
    audio: media(),
    canvas: {
      getContext: () => ({
        clearRect(...args) { drawn.push(["clearRect", ...args]); },
        drawImage(...args) { drawn.push(["drawImage", ...args]); },
        save() {}, restore() {},
      }),
      width: 720, height: 1280,
    },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
    requestFrame: () => 1,
    cancelFrame: () => {},
  });

  const { manifest, assets, browserPlan } = await buildWholeHeadFixture();
  await player.loadExternal({ manifest, assets, plan: browserPlan });
  assert.equal(player.representation, "whole-head-layer");

  let clockTime = 0.01;
  await player.playExternal(() => clockTime);
  assert.equal(player.state, "speaking");
  assert.ok(drawn.some((call) => call[0] === "clearRect"));
  assert.ok(drawn.some((call) => call[0] === "drawImage"));
  player.stop("complete");
  assert.equal(player.state, "ready");
});

test("SpeechPlayer audio load accepts only aligned plans and updateExternalPlan revises a browser-timed schedule in place", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1, async play() {},
    currentTime: 0, readyState: 4,
  });
  const player = new SpeechPlayer({
    audio: media(),
    canvas: { getContext: () => ({ clearRect() {}, drawImage() {}, save() {}, restore() {} }), width: 720, height: 1280 },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
    requestFrame: () => 1,
    cancelFrame: () => {},
  });
  const { manifest, assets, alignedPlan, browserPlan, audioBytes } = await buildWholeHeadFixture();

  await assert.rejects(
    () => player.load({ manifest, assets, plan: browserPlan, audioBlob: new Blob([audioBytes]) }),
    /audio playback requires an aligned SpeechPlan/,
  );
  assert.throws(() => player.updateExternalPlan(browserPlan), /not loaded for browser TTS playback/);

  await player.loadExternal({ manifest, assets, plan: browserPlan });
  await player.playExternal(() => 0.02);
  const revised = structuredClone(browserPlan);
  revised.audio.duration_us = 200_000;
  revised.events = [
    { unit: "sil", start_us: 0, end_us: 100_000 },
    { unit: "closed", start_us: 100_000, end_us: 200_000 },
  ];
  const result = player.updateExternalPlan(revised);
  assert.deepEqual(result, { quality_mode: "browser-timed", transitions: 1 });
  assert.equal(player.schedule.transitions[0].boundary_us, 100_000);
  assert.equal(player.state, "speaking");

  assert.throws(() => player.updateExternalPlan(alignedPlan), /requires a browser-timed SpeechPlan/);
  const missing = structuredClone(revised);
  missing.events[1].unit = "vowel-open";
  assert.throws(() => player.updateExternalPlan(missing), /missing atlas unit: sil>vowel-open/);
  assert.equal(player.schedule.transitions[0].key, "sil>closed");
  player.stop("complete");
  player.dispose();
});

test("SpeechPlayer audio clock mode plays an aligned plan against the streamed sound position (SoT 8)", async () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    }, removeAttribute() {}, load() {}, duration: 0.1, async play() {},
    currentTime: 0, readyState: 4,
  });
  let frameCallback = null;
  const audio = media();
  let audioPlayed = false;
  audio.play = async () => { audioPlayed = true; };
  const player = new SpeechPlayer({
    audio,
    canvas: { getContext: () => ({ clearRect() {}, drawImage() {}, save() {}, restore() {} }), width: 720, height: 1280 },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    imageLoader: async () => ({ close() {} }),
    requestFrame: (cb) => { frameCallback = cb; return 1; },
    cancelFrame: () => {},
  });
  const { manifest, assets, alignedPlan, browserPlan } = await buildWholeHeadFixture();

  await assert.rejects(
    () => player.loadAudioClock({ manifest, assets, plan: browserPlan }),
    /audio clock playback requires an aligned SpeechPlan/,
  );
  const result = await player.loadAudioClock({ manifest, assets, plan: alignedPlan });
  assert.equal(result.quality_mode, "aligned");
  assert.equal(player.mode, "audio-clock");
  await assert.rejects(() => player.play(), /not loaded for audio playback/);
  await assert.rejects(() => player.playExternal(() => 0), /not loaded for browser TTS playback/);
  assert.throws(() => player.updateExternalPlan(browserPlan), /not loaded for browser TTS playback/);

  let position = 0.01;
  let reads = 0;
  await player.playAudioClock(() => { reads++; return position; });
  assert.equal(player.state, "speaking");
  assert.equal(audioPlayed, false, "the player never plays the media element itself in audio clock mode");
  position = 0.06;
  frameCallback();
  assert.ok(reads >= 1);
  player.stop("complete");
  assert.equal(player.state, "ready");
  assert.equal(player.externalClock, null);
  await assert.rejects(() => player.playAudioClock(42), /external clock function is required/);
  player.dispose();
});

// Luke 10/13 "요로 끝났는데 ... 합 하는 느낌": in the jina comparison the
// head fell back to the neutral (closed) head for a frame inside "까" and "요"
// (audio 5.98 s and 6.10 s, 4 of 5 runs). Cause: the next clip was loaded into
// the alternating slot even when that slot held the clip on screen, so its src
// was replaced while it was being drawn. Repeated keys (A, B, A, C) break the
// alternation; the scheduled clip must stay on screen while C loads (SoT 2:
// the schedule names one pre-rendered clip per instant).
test("SpeechPlayer never reloads the slot that holds the clip on screen", async () => {
  const srcLog = [];
  const media = (name) => {
    const element = {
      name, pause() {}, removeEventListener() {}, removeAttribute() {}, load() {},
      addEventListener(event, cb) {
        if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
      },
      duration: 0.1, async play() {}, currentTime: 0, readyState: 4,
    };
    let src = "";
    Object.defineProperty(element, "src", {
      get: () => src,
      set: (value) => { src = value; srcLog.push(name); },
    });
    return element;
  };
  const drawnImages = [];
  let frameCallback = null;
  let url = 0;
  const player = new SpeechPlayer({
    audio: media("audio"),
    canvas: {
      getContext: () => ({ clearRect() {}, drawImage(image) { drawnImages.push(image?.name); }, save() {}, restore() {} }),
      width: 720, height: 1280,
    },
    bodyVideo: media("body"), speechVideos: [media("slot0"), media("slot1")],
    urlApi: { createObjectURL: () => `blob:${++url}`, revokeObjectURL() {} },
    imageLoader: async () => ({ close() {}, name: "neutral" }),
    requestFrame: (cb) => { frameCallback = cb; return 1; },
    cancelFrame: () => {},
  });
  // keys in schedule order: sil>closed (A), closed>sil (B), sil>closed (A), closed>vowel-open (C)
  const { manifest, assets, alignedPlan } = await buildWholeHeadFixture({
    atlasKeys: ["sil>closed", "closed>sil", "closed>vowel-open"],
    alignedEvents: [
      { unit: "sil", start_us: 0, end_us: 200_000 },
      { unit: "closed", start_us: 200_000, end_us: 400_000 },
      { unit: "sil", start_us: 400_000, end_us: 600_000 },
      { unit: "closed", start_us: 600_000, end_us: 800_000 },
      { unit: "vowel-open", start_us: 800_000, end_us: 1_000_000 },
    ],
  });
  await player.loadAudioClock({ manifest, assets, plan: alignedPlan });
  assert.deepEqual(player.slotToKey, ["sil>closed", "closed>sil"], "first two unique clips are primed");
  srcLog.length = 0;

  // 0.62 s: only the third transition (sil>closed, slot 0) is on screen; the
  // player prefetches closed>vowel-open. Slot 0 must not be the one reloaded.
  await player.playAudioClock(() => 0.62);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(srcLog.filter((name) => name.startsWith("slot")), ["slot1"]);
  assert.equal(player.slotToKey[0], "sil>closed");
  assert.equal(player.slotToKey[1], "closed>vowel-open");

  drawnImages.length = 0;
  frameCallback();
  assert.ok(drawnImages.includes("slot0"), "the scheduled clip is still drawn after the prefetch");
  player.stop("complete");
  player.dispose();
});
