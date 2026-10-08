import test from "node:test";
import assert from "node:assert/strict";

import { validateManifest } from "../main/nva-core.js";
import { SPEECH_UNITS } from "../main/speech-plan.js";

function manifest() {
  return {
    nva_version: "0.2",
    canvas: { width: 720, height: 1280, fps: 25 },
    animations: {
      speak: { clip: "clips/speak.webm", loop: true, can_talk: true, face_bbox: [0.2, 0.1, 0.6, 0.4] },
    },
    speech_motion: {
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
    },
  };
}

test("legacy manifests remain valid when speech_motion is absent", () => {
  const value = manifest();
  delete value.speech_motion;
  assert.equal(validateManifest(value).ok, true);
});

test("speech_motion binds the frozen inventory and bundle-relative assets", () => {
  const value = manifest();
  const files = [
    "clips/speak.webm",
    "speech/neutral-head.png",
    "speech/atlas.bin",
    "speech/atlas-index.json",
    "speech/validation-report.json",
    "speech/quality-report.json",
    "speech/generation-result.json",
  ];
  assert.deepEqual(validateManifest(value, { clipFiles: files }).errors, []);

  value.speech_motion.inventory[1] = "korean-a";
  assert.equal(validateManifest(value).ok, false);
  value.speech_motion.inventory = [...SPEECH_UNITS];
  value.speech_motion.atlas = "../private/atlas.bin";
  assert.equal(validateManifest(value).ok, false);
});

test("bundle inventory rejects a missing speech asset", () => {
  const value = manifest();
  assert.equal(validateManifest(value, {
    clipFiles: ["clips/speak.webm", "speech/neutral-head.png"],
  }).ok, false);
});

test("speech_motion validates whole-head-layer and requires region without ditto_region", () => {
  const value = manifest();
  value.speech_motion.representation = "whole-head-layer";
  value.speech_motion.region = [280, 70, 158, 242];
  const files = [
    "clips/speak.webm",
    "speech/neutral-head.png",
    "speech/atlas.bin",
    "speech/atlas-index.json",
    "speech/validation-report.json",
    "speech/quality-report.json",
    "speech/generation-result.json",
  ];
  assert.deepEqual(validateManifest(value, { clipFiles: files }).errors, []);

  // Missing region fails
  const missingRegion = structuredClone(value);
  delete missingRegion.speech_motion.region;
  assert.equal(validateManifest(missingRegion, { clipFiles: files }).ok, false);

  // Odd width fails
  const oddWidth = structuredClone(value);
  oddWidth.speech_motion.region = [280, 70, 157, 242];
  assert.equal(validateManifest(oddWidth, { clipFiles: files }).ok, false);

  // Out of bounds region fails
  const outOfBounds = structuredClone(value);
  outOfBounds.speech_motion.region = [600, 70, 158, 242]; // 600 + 158 > 720
  assert.equal(validateManifest(outOfBounds, { clipFiles: files }).ok, false);
});
