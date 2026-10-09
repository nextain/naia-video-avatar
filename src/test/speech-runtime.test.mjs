import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSpeechSchedule,
  prefetchSpeechRanges,
  SpeechPlaybackState,
  resolveSpeechLayers,
} from "../main/speech-runtime.js";

const sha = "d".repeat(64);

function plan() {
  return {
    version: "1",
    text: "language-independent input",
    audio: { sha256: sha, duration_us: 600_000 },
    quality_mode: "approximate",
    events: [
      { unit: "sil", start_us: 0, end_us: 200_000 },
      { unit: "closed", start_us: 200_000, end_us: 400_000 },
      { unit: "vowel-open", start_us: 400_000, end_us: 600_000 },
    ],
  };
}

test("runtime places five atlas frames around each audio boundary", () => {
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  assert.deepEqual(schedule.transitions.map((item) => item.key), [
    "sil>closed",
    "closed>vowel-open",
  ]);
  assert.deepEqual(schedule.transitions[0].frame_times_us, [120_000, 160_000, 200_000, 240_000, 280_000]);
  assert.equal(schedule.duration_us, 600_000);
});

test("runtime rejects a missing transition and has no language field", () => {
  assert.throws(() => buildSpeechSchedule(plan(), { availableKeys: ["sil>closed"] }), /missing atlas unit/);
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  assert.equal("language" in schedule, false);
});

test("runtime prefers a registered three-unit context and falls back to a pair", () => {
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed>vowel-open", "closed>vowel-open"],
  });
  assert.deepEqual(schedule.transitions.map((item) => item.key), [
    "sil>closed>vowel-open",
    "closed>vowel-open",
  ]);
});

test("prefetch selects the first two unique byte ranges", () => {
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  const ranges = prefetchSpeechRanges(schedule, {
    version: "1",
    entries: {
      "sil>closed": { offset: 0, length: 80 },
      "closed>vowel-open": { offset: 80, length: 120 },
    },
  });
  assert.deepEqual(ranges, [
    { key: "sil>closed", start: 0, end: 79 },
    { key: "closed>vowel-open", start: 80, end: 199 },
  ]);
});

test("playback state restores after complete, cancel, and error", () => {
  for (const outcome of ["complete", "cancel", "error"]) {
    let state = "idle";
    const playback = new SpeechPlaybackState(() => state, (next) => { state = next; });
    const token = playback.begin("speaking");
    assert.equal(state, "speaking");
    playback.settle(token, outcome);
    assert.equal(state, "idle");
    assert.equal(playback.lastOutcome, outcome);
  }
});

test("runtime blends at midpoint when windows overlap", () => {
  const overlappingPlan = {
    version: "1",
    text: "overlap",
    audio: { sha256: sha, duration_us: 400_000 },
    quality_mode: "approximate",
    events: [
      { unit: "sil", start_us: 0, end_us: 150_000 },
      { unit: "closed", start_us: 150_000, end_us: 250_000 },
      { unit: "vowel-open", start_us: 250_000, end_us: 400_000 },
    ],
  };
  const schedule = buildSpeechSchedule(overlappingPlan, {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  const midpoint = resolveSpeechLayers(schedule, 200_000);
  assert.equal(midpoint.length, 2);
  assert.ok(Math.abs(midpoint[0].opacity - 0.5) < 1e-12);
  assert.ok(Math.abs(midpoint[1].opacity - 0.5) < 1e-12);
});

test("runtime does not blend when windows do not overlap and holds unit frame 2 in gap", () => {
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  assert.deepEqual(resolveSpeechLayers(schedule, 100_000), []);
  assert.deepEqual(resolveSpeechLayers(schedule, 260_000), [
    { index: 0, key: "sil>closed", frame: 4, opacity: 1 },
  ]);
  // Windows [120k, 280k] and [320k, 480k] do not overlap.
  // At 300k, no blend, holds unit piece frame 2 with opacity 1.
  assert.deepEqual(resolveSpeechLayers(schedule, 300_000), [
    { key: "closed", frame: 2, opacity: 1 },
  ]);
  // After last transition window (ends at 480k), holds unit frame 2.
  assert.deepEqual(resolveSpeechLayers(schedule, 500_000), [
    { key: "vowel-open", frame: 2, opacity: 1 },
  ]);
});

test("runtime scales playback rate for 60ms and 40ms allocated duration", () => {
  // Plan with four 40ms events (duration 160ms, all >= 40ms so no event merge):
  // Event 0: [0, 40k], Event 1: [40k, 80k], Event 2: [80k, 120k], Event 3: [120k, 160k]
  // Transition 0 (boundary 40k): prevMid=0, nextMid=(40k+80k)/2=60k -> allocated 60ms
  // Transition 1 (boundary 80k): prevMid=60k, nextMid=(80k+120k)/2=100k -> allocated 40ms
  const plan = {
    version: "1",
    text: "test rate scaling",
    audio: { sha256: sha, duration_us: 160_000 },
    quality_mode: "approximate",
    events: [
      { unit: "sil", start_us: 0, end_us: 40_000 },
      { unit: "closed", start_us: 40_000, end_us: 80_000 },
      { unit: "vowel-open", start_us: 80_000, end_us: 120_000 },
      { unit: "sil", start_us: 120_000, end_us: 160_000 },
    ],
  };
  const sched = buildSpeechSchedule(plan, {
    availableKeys: ["sil>closed", "closed>vowel-open", "vowel-open>sil"],
  });

  // Transition 0: 60ms allocated duration
  assert.equal(sched.transitions[0].rate, 80_000 / 60_000);
  assert.equal(sched.transitions[0].frame_interval_us, 30_000);
  assert.deepEqual(sched.transitions[0].frame_times_us, [-20_000, 10_000, 40_000, 70_000, 100_000]);

  // Transition 1: 40ms allocated duration
  assert.equal(sched.transitions[1].rate, 2.0);
  assert.equal(sched.transitions[1].frame_interval_us, 20_000);
  assert.deepEqual(sched.transitions[1].frame_times_us, [40_000, 60_000, 80_000, 100_000, 120_000]);
});


