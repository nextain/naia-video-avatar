import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSpeechSchedule,
  prefetchSpeechRanges,
  SpeechPlaybackState,
  resolveSpeechLayers,
  speechPlaybackRate,
} from "../main/speech-runtime.js";

const sha = "d".repeat(64);

function plan() {
  return {
    version: "1",
    text: "language-independent input",
    audio: { sha256: sha, duration_us: 600_000 },
    quality_mode: "aligned",
    aligner: { provider: "mfa", version: "3.3.9", model_sha256: sha },
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

test("runtime holds visemes and uses a two-frame raised-cosine transition blend", () => {
  const schedule = buildSpeechSchedule(plan(), {
    availableKeys: ["sil>closed", "closed>vowel-open"],
  });
  assert.deepEqual(resolveSpeechLayers(schedule, 100_000), []);
  assert.deepEqual(resolveSpeechLayers(schedule, 260_000), [
    { index: 0, key: "sil>closed", frame: 4, opacity: 1 },
  ]);
  const midpoint = resolveSpeechLayers(schedule, 300_000);
  assert.equal(midpoint.length, 2);
  assert.ok(Math.abs(midpoint[0].opacity - 0.5) < 1e-12);
  assert.ok(Math.abs(midpoint[1].opacity - 0.5) < 1e-12);
  assert.deepEqual(resolveSpeechLayers(schedule, 500_000), [
    { index: 1, key: "closed>vowel-open", frame: 4, opacity: 1 },
  ]);
});

test("protocol line 103: spans of 80ms or more keep rate 1 and the original frame times", () => {
  const schedule = buildSpeechSchedule(plan());
  for (const transition of schedule.transitions) {
    assert.equal(transition.playback_rate, 1);
    assert.deepEqual(
      transition.frame_times_us,
      [-80_000, -40_000, 0, 40_000, 80_000].map((offset) => transition.boundary_us + offset),
    );
  }
  assert.equal(speechPlaybackRate(80_000), 1);
  assert.equal(speechPlaybackRate(200_000), 1);
});

test("protocol line 103: spans shorter than 80ms play up to 2x and never faster", () => {
  assert.equal(speechPlaybackRate(60_000), 80_000 / 60_000);
  assert.equal(speechPlaybackRate(40_000), 2);
  assert.equal(speechPlaybackRate(20_000), 2);

  const short = plan();
  short.events = [
    { unit: "sil", start_us: 0, end_us: 200_000 },
    { unit: "closed", start_us: 200_000, end_us: 240_000 },
    { unit: "vowel-open", start_us: 240_000, end_us: 600_000 },
  ];
  const schedule = buildSpeechSchedule(short);
  const fast = schedule.transitions[0];
  assert.equal(fast.key, "sil>closed");
  assert.equal(fast.playback_rate, 2);
  assert.deepEqual(fast.frame_times_us, [160_000, 180_000, 200_000, 220_000, 240_000]);
  const layers = resolveSpeechLayers(schedule, 180_000);
  assert.equal(layers[0].key, "sil>closed");
  assert.equal(layers[0].frame, 1);
  assert.equal(schedule.transitions[1].playback_rate, 1);
});

test("protocol line 103: spans below 40ms are merged before any rate is applied", () => {
  const tiny = plan();
  tiny.events = [
    { unit: "sil", start_us: 0, end_us: 200_000 },
    { unit: "closed", start_us: 200_000, end_us: 230_000 },
    { unit: "vowel-open", start_us: 230_000, end_us: 600_000 },
  ];
  const schedule = buildSpeechSchedule(tiny);
  assert.deepEqual(schedule.transitions.map((item) => item.key), ["sil>vowel-open"]);
  assert.equal(schedule.transitions[0].playback_rate, 1);
});
