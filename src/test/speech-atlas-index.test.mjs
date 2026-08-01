import test from "node:test";
import assert from "node:assert/strict";

import { validateSpeechAtlasIndex } from "../main/speech-atlas-index.js";
import { SPEECH_UNITS } from "../main/speech-plan.js";

const sha = "b".repeat(64);

function index() {
  return {
    version: "1",
    entries: {
      "closed>vowel-open": { offset: 0, length: 120, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
      "vowel-open>sil": { offset: 120, length: 80, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
    },
  };
}

test("atlas index covers the complete byte range without gaps", () => {
  assert.deepEqual(validateSpeechAtlasIndex(index(), 200), { ok: true, errors: [] });
});

test("atlas rejects gaps, overlaps, non-lossless units, and wrong media constants", () => {
  const gap = index();
  gap.entries["vowel-open>sil"].offset = 121;
  assert.equal(validateSpeechAtlasIndex(gap, 201).ok, false);

  const lossy = index();
  lossy.entries["closed>vowel-open"].lossless = false;
  assert.equal(validateSpeechAtlasIndex(lossy, 200).ok, false);

  const wrongFrames = index();
  wrongFrames.entries["closed>vowel-open"].frames = 6;
  assert.equal(validateSpeechAtlasIndex(wrongFrames, 200).ok, false);
});

test("atlas unit keys must be language-independent inventory transitions", () => {
  const bad = index();
  bad.entries["가>나"] = bad.entries["closed>vowel-open"];
  delete bad.entries["closed>vowel-open"];
  assert.equal(validateSpeechAtlasIndex(bad, 200).ok, false);
});

test("atlas caps context units at 64 and requires every B fallback pair", () => {
  const contextual = index();
  contextual.entries = {
    "sil>closed": { offset: 0, length: 100, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
    "sil>closed>vowel-open": { offset: 100, length: 100, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true },
  };
  assert.equal(validateSpeechAtlasIndex(contextual, 200).ok, true);

  const missingFallback = structuredClone(contextual);
  delete missingFallback.entries["sil>closed"];
  missingFallback.entries["sil>closed>vowel-open"].offset = 0;
  assert.equal(validateSpeechAtlasIndex(missingFallback, 100).ok, false);

  const tooManyContexts = { version: "1", entries: {} };
  let offset = 0;
  for (const previous of SPEECH_UNITS) for (const current of SPEECH_UNITS) {
    const pair = `${previous}>${current}`;
    tooManyContexts.entries[pair] = { offset: offset++, length: 1, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true };
  }
  const contexts = [];
  for (const previous of SPEECH_UNITS) for (const current of SPEECH_UNITS) for (const next of SPEECH_UNITS)
    contexts.push(`${previous}>${current}>${next}`);
  for (const key of contexts.slice(0, 65))
    tooManyContexts.entries[key] = { offset: offset++, length: 1, sha256: sha, frames: 5, fps: 25, codec: "vp09.00.10.08", lossless: true };
  assert.equal(validateSpeechAtlasIndex(tooManyContexts, offset).ok, false);
});
