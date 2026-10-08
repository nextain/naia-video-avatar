import test from "node:test";
import assert from "node:assert/strict";

import {
  SPEECH_UNITS,
  normalizeShortSpeechEvents,
  validateSpeechPlan,
} from "../main/speech-plan.js";

const sha = "a".repeat(64);

function plan(events) {
  return {
    version: "1",
    text: "hello",
    audio: { sha256: sha, duration_us: 240_000 },
    quality_mode: "aligned",
    aligner: { provider: "mfa", version: "3.3.9", model_sha256: sha },
    events,
  };
}

test("SpeechPlan accepts only the frozen 13-unit vocabulary and monotonic audio time", () => {
  assert.equal(SPEECH_UNITS.length, 13);
  const result = validateSpeechPlan(plan([
    { unit: "closed", start_us: 0, end_us: 80_000, confidence: -12.4 },
    { unit: "vowel-open", start_us: 80_000, end_us: 240_000, confidence: -8.1 },
  ]));
  assert.deepEqual(result, { ok: true, errors: [] });

  assert.equal(validateSpeechPlan(plan([
    { unit: "korean-a", start_us: 0, end_us: 240_000 },
  ])).ok, false);
  assert.equal(validateSpeechPlan(plan([
    { unit: "closed", start_us: 80_000, end_us: 40_000 },
  ])).ok, false);
});

test("aligned quality requires audio identity and aligner provenance", () => {
  const missing = plan([{ unit: "sil", start_us: 0, end_us: 240_000 }]);
  delete missing.aligner.model_sha256;
  assert.equal(validateSpeechPlan(missing).ok, false);
  missing.quality_mode = "approximate";
  delete missing.aligner;
  assert.equal(validateSpeechPlan(missing).ok, true);
});

test("short events merge deterministically by duration without confidence", () => {
  const normalized = normalizeShortSpeechEvents([
    { unit: "closed", start_us: 0, end_us: 70_000, confidence: 99 },
    { unit: "alveolar", start_us: 70_000, end_us: 100_000, confidence: -99 },
    { unit: "vowel-open", start_us: 100_000, end_us: 240_000, confidence: 0 },
  ]);
  assert.deepEqual(normalized.map(({ unit, start_us, end_us }) => ({ unit, start_us, end_us })), [
    { unit: "closed", start_us: 0, end_us: 70_000 },
    { unit: "vowel-open", start_us: 70_000, end_us: 240_000 },
  ]);
});

test("equal short durations remove the earlier event and merge toward the longer neighbor", () => {
  const normalized = normalizeShortSpeechEvents([
    { unit: "closed", start_us: 0, end_us: 30_000 },
    { unit: "alveolar", start_us: 30_000, end_us: 60_000 },
    { unit: "vowel-open", start_us: 60_000, end_us: 200_000 },
  ]);
  assert.deepEqual(normalized.map((event) => event.unit), ["alveolar", "vowel-open"]);
  assert.equal(normalized[0].start_us, 0);
  assert.equal(normalized[0].end_us, 60_000);
});
