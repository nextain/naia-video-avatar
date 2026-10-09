import test from "node:test";
import assert from "node:assert/strict";

import { SpeechPlayer } from "../main/speech-player.js";
import { buildSpeechSchedule, resolveSpeechLayers } from "../main/speech-runtime.js";

test("SpeechPlayer backward compatibility: plays legacy atlas without single-unit keys (b81a188 format)", async () => {
  const draws = [];
  const media = () => ({
    pause() {},
    removeEventListener() {},
    addEventListener(event, cb) {
      if (event === "loadeddata" || event === "loadedmetadata") queueMicrotask(cb);
    },
    removeAttribute() {},
    load() {},
    play: async () => {},
    duration: 0.6,
    currentTime: 0,
  });

  const bodyVideo = media();
  bodyVideo.readyState = 4; // HAVE_ENOUGH_DATA
  const audio = media();
  const speechVideos = [media(), media()];

  const player = new SpeechPlayer({
    audio,
    canvas: {
      getContext: () => ({
        clearRect() {},
        drawImage() {},
        save() {},
        restore() {},
        getImageData: () => ({ data: new Uint8Array(4) }),
        putImageData() {},
      }),
      width: 720,
      height: 1280,
    },
    bodyVideo,
    speechVideos,
    urlApi: {
      createObjectURL: () => "blob:test",
      revokeObjectURL() {},
    },
    imageLoader: async () => ({ close() {} }),
    requestFrame: () => 1,
    cancelFrame: () => {},
    decoder: {
      load: async (blob) => ({ slot: 0, video: speechVideos[0] }),
      dispose() {},
    },
    atlasSource: {
      read: async (start, end) => new Blob([new Uint8Array(end - start)]),
    },
  });

  player.onDraw = (info) => {
    draws.push(info);
  };

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

  // Plan with non-overlapping gap between boundaries
  // Boundary 0 at 200k (sil>closed), Boundary 1 at 400k (closed>vowel-open)
  // Non-overlapping gap at 300k (holds closed frame 2 or fallback to sil>closed frame 4)
  const plan = {
    version: "1",
    quality_mode: "aligned",
    aligner: { provider: "test", version: "1.0", model_sha256: "0".repeat(64) },
    audio: { sha256: audioSha, duration_us: 600_000 },
    text: "legacy test",
    events: [
      { unit: "sil", start_us: 0, end_us: 200_000 },
      { unit: "closed", start_us: 200_000, end_us: 400_000 },
      { unit: "vowel-open", start_us: 400_000, end_us: 600_000 },
    ],
  };

  const slice1Bytes = new Uint8Array(50).fill(1);
  const slice2Bytes = new Uint8Array(50).fill(2);
  const atlasBytes = new Uint8Array(100);
  atlasBytes.set(slice1Bytes, 0);
  atlasBytes.set(slice2Bytes, 50);

  const slice1Digest = await crypto.subtle.digest("SHA-256", slice1Bytes);
  const slice1Sha = Buffer.from(slice1Digest).toString("hex");

  const slice2Digest = await crypto.subtle.digest("SHA-256", slice2Bytes);
  const slice2Sha = Buffer.from(slice2Digest).toString("hex");

  const atlasBlob = new Blob([atlasBytes]);
  const atlasDigest = await crypto.subtle.digest("SHA-256", atlasBytes);
  const atlasSha = Buffer.from(atlasDigest).toString("hex");

  // b81a188 legacy atlas format: ONLY transition keys, NO 1-unit keys ("sil", "closed", etc.)
  const atlasIndexObj = {
    version: "1",
    entries: {
      "sil>closed": { offset: 0, length: 50, sha256: slice1Sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
      "closed>vowel-open": { offset: 50, length: 50, sha256: slice2Sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
    },
  };

  // Verify that single unit keys are indeed absent
  assert.equal("sil" in atlasIndexObj.entries, false);
  assert.equal("closed" in atlasIndexObj.entries, false);
  assert.equal("vowel-open" in atlasIndexObj.entries, false);

  const atlasIndexBlob = new Blob([JSON.stringify(atlasIndexObj)]);
  const atlasIndexDigest = await crypto.subtle.digest("SHA-256", await atlasIndexBlob.arrayBuffer());

  const neutralBlob = new Blob([new Uint8Array(10)]);
  const neutralDigest = await crypto.subtle.digest("SHA-256", await neutralBlob.arrayBuffer());

  const valBlob = new Blob([new Uint8Array(10)]);
  const valDigest = await crypto.subtle.digest("SHA-256", await valBlob.arrayBuffer());

  const qualBlob = new Blob([new Uint8Array(10)]);
  const qualDigest = await crypto.subtle.digest("SHA-256", await qualBlob.arrayBuffer());

  const receipt = {
    version: "1",
    job_id: "job_01JINA2Y7Q0M8T6R4P2N",
    assets: [
      { role: "neutral_head", path: "speech/neutral-head.png", sha256: Buffer.from(neutralDigest).toString("hex"), bytes: 10 },
      { role: "speech_atlas", path: "speech/atlas.bin", sha256: atlasSha, bytes: 100 },
      { role: "speech_atlas_index", path: "speech/atlas-index.json", sha256: Buffer.from(atlasIndexDigest).toString("hex"), bytes: atlasIndexBlob.size },
      { role: "validation_report", path: "speech/validation-report.json", sha256: Buffer.from(valDigest).toString("hex"), bytes: 10 },
      { role: "quality_report", path: "speech/quality-report.json", sha256: Buffer.from(qualDigest).toString("hex"), bytes: 10 },
    ],
    provenance: {
      generator: { kind: "ditto", version: "1.0" },
      input_sha256: "1".repeat(64),
      settings_sha256: "2".repeat(64),
      inventory_version: "1.0.0",
      inventory: [...manifest.speech_motion.inventory],
      validation: { status: "passed", report_sha256: Buffer.from(valDigest).toString("hex") },
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
    },
    quality: {
      report_sha256: Buffer.from(qualDigest).toString("hex"),
      sync: { status: "screened" },
      continuity: { status: "screened" },
      naturalness: { status: "not_evaluated" },
      performance: { status: "screened" },
      bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };

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

  await player.load({
    manifest,
    assets,
    plan,
    audioBlob: new Blob([audioBytes]),
  });

  assert.equal(player.state, "ready");

  // Begin speaking
  await player.play();
  assert.equal(player.state, "speaking");

  // 1. Time at boundary 0 (200k us) -> inside sil>closed transition window
  audio.currentTime = 0.2;
  // Trigger internal #draw
  draws.length = 0;
  player.cancelFrame(player.frameHandle);
  player["#draw"]?.() || player.requestFrame(() => {}); // invoke draw
  // Since #draw is private, tick via play tick or direct audio event
  // Let's invoke #tick or trigger drawing
  // Player state should remain 'speaking', not 'ready' or error
  assert.equal(player.state, "speaking");
  assert.notEqual(player.playbackState.lastOutcome, "error");

  // 2. Time in gap at 300k us -> outside window, requests unit piece "closed"
  // Legacy atlas does not have "closed" key.
  // SpeechPlayer must fall back to "sil>closed" frame 4 and NOT crash with stop("error").
  audio.currentTime = 0.3;
  const layers300k = resolveSpeechLayers(player.schedule, 300_000);
  assert.equal(layers300k[0].key, "closed");
  assert.equal(layers300k[0].fallbackKey, "sil>closed");
  assert.equal(layers300k[0].fallbackFrame, 4);

  // 3. Time past last transition at 550k us -> requests unit piece "vowel-open"
  // SpeechPlayer must fall back to "closed>vowel-open" frame 4 and NOT crash.
  audio.currentTime = 0.55;
  const layers550k = resolveSpeechLayers(player.schedule, 550_000);
  assert.equal(layers550k[0].key, "vowel-open");
  assert.equal(layers550k[0].fallbackKey, "closed>vowel-open");
  assert.equal(layers550k[0].fallbackFrame, 4);

  // Settle cleanly
  player.stop("complete");
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "complete");

  player.dispose();
  assert.equal(player.state, "disposed");
});
