import test from "node:test";
import assert from "node:assert/strict";

import {
  GENERATION_RECEIPT_PATH,
  speechMotionFromGenerationResult,
  verifySpeechAtlasAssets,
  verifySpeechMotionBundle,
} from "../main/speech-bundle.js";
import { SPEECH_UNITS } from "../main/speech-plan.js";

const sha = "e".repeat(64);

function result() {
  return {
    version: "1",
    job_id: "job_01JINA2Y7Q0M8T6R4P2N",
    assets: [
      { role: "neutral_head", path: "speech/neutral-head.png", sha256: sha, bytes: 100 },
      { role: "speech_atlas", path: "speech/atlas.bin", sha256: sha, bytes: 200 },
      { role: "speech_atlas_index", path: "speech/atlas-index.json", sha256: sha, bytes: 300 },
      { role: "validation_report", path: "speech/validation-report.json", sha256: sha, bytes: 400 },
      { role: "quality_report", path: "speech/quality-report.json", sha256: sha, bytes: 500 },
    ],
    provenance: {
      generator: { kind: "ditto", version: "private" }, input_sha256: sha, settings_sha256: sha,
      inventory_version: "1.0.0", inventory: [...SPEECH_UNITS],
      validation: { status: "passed", report_sha256: sha },
    },
    quality: {
      report_sha256: sha,
      sync: { status: "passed" }, continuity: { status: "passed" }, naturalness: { status: "passed" },
      performance: { status: "passed" }, bundle: { status: "passed" },
    },
    source_deleted_at: "2026-08-01T08:00:00.000Z",
  };
}

test("a validated generation receipt maps roles to speech_motion paths", () => {
  assert.deepEqual(speechMotionFromGenerationResult(result()), {
    version: "1",
    representation: "factorized-difference-layer",
    inventory_version: "1.0.0",
    inventory: [...SPEECH_UNITS],
    neutral_head: "speech/neutral-head.png",
    atlas: "speech/atlas.bin",
    atlas_index: "speech/atlas-index.json",
    validation_report: "speech/validation-report.json",
    quality_report: "speech/quality-report.json",
    provenance: "speech/generation-result.json",
  });
});

test("an incomplete receipt cannot create a speech_motion extension", () => {
  const value = result();
  value.quality.continuity.status = "failed";
  assert.throws(() => speechMotionFromGenerationResult(value), /invalid speech provenance receipt/);
});

test("atlas verification binds every indexed byte slice", async () => {
  const bytes = new TextEncoder().encode("abcdefghij");
  const hash = async (value) => {
    const digest = await crypto.subtle.digest("SHA-256", value);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };
  const index = {
    version: "1",
    entries: {
      "sil>closed": { offset: 0, length: 5, sha256: await hash(bytes.slice(0, 5)), frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
      "closed>sil": { offset: 5, length: 5, sha256: await hash(bytes.slice(5)), frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
    },
  };
  assert.equal(await verifySpeechAtlasAssets(new Blob([bytes]), index), true);
  index.entries["closed>sil"].sha256 = "0".repeat(64);
  await assert.rejects(() => verifySpeechAtlasAssets(new Blob([bytes]), index), /slice hash mismatch/);
});

test("player bundle verification binds manifest paths and every generated asset to the receipt", async () => {
  const value = result();
  const assets = new Map();
  for (const asset of value.assets) {
    const blob = new Blob([asset.path]);
    asset.bytes = blob.size;
    asset.sha256 = await hashBlob(blob);
    assets.set(asset.path, blob);
  }
  const validation = value.assets.find((asset) => asset.role === "validation_report");
  const quality = value.assets.find((asset) => asset.role === "quality_report");
  value.provenance.validation.report_sha256 = validation.sha256;
  value.quality.report_sha256 = quality.sha256;
  // Replace the atlas with a contract-valid one-entry payload.
  const atlas = new Blob(["atlas"]);
  const atlasHash = await hashBlob(atlas);
  const index = new Blob([JSON.stringify({ version: "1", entries: {
    "sil>closed": { offset: 0, length: atlas.size, sha256: atlasHash, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
  } })]);
  for (const [role, blob] of [["speech_atlas", atlas], ["speech_atlas_index", index]]) {
    const asset = value.assets.find((item) => item.role === role);
    asset.bytes = blob.size; asset.sha256 = await hashBlob(blob); assets.set(asset.path, blob);
  }
  assets.set(GENERATION_RECEIPT_PATH, new Blob([JSON.stringify(value)]));
  const speech = speechMotionFromGenerationResult(value);
  assert.equal((await verifySpeechMotionBundle(speech, assets)).atlasBlob.size, atlas.size);
  speech.atlas = "speech/swapped.bin";
  await assert.rejects(() => verifySpeechMotionBundle(speech, assets), /not receipt-bound/);
});

async function hashBlob(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Buffer.from(digest).toString("hex");
}
