// SoT 5 "boundary-free voice" rule on the canonical player. N3 (2026-10-13)
// measured zero word boundaries for ko/en/ja on Chrome 155, Chromium 148 and
// WebKitGTK 2.52.5, so browser-timed plans in practice always take this path:
// from the start event the words run serially, each unit 80ms in order, the
// last unit holds until the end event, and the end event is sil.
// The plans below are written out by hand from that rule (the browser plan
// generator moves into this repository later; then it must emit these plans).
import test from "node:test";
import assert from "node:assert/strict";

import { validateSpeechPlan } from "../main/speech-plan.js";
import { buildSpeechSchedule, resolveSpeechLayers } from "../main/speech-runtime.js";

const WORDS = [["vowel-open", "alveolar"], ["closed", "vowel-mid", "velar"]];
const UNITS = WORDS.flat();

function serialEvents() {
  return UNITS.map((unit, index) => ({ unit, start_us: index * 80_000, end_us: (index + 1) * 80_000 }));
}

function plan(events) {
  return {
    version: "1",
    quality_mode: "browser-timed",
    text: "no boundary voice",
    audio: { duration_us: events.at(-1).end_us },
    events,
  };
}

test("boundary-free browser-timed plan runs units in order from the start at 80ms each", () => {
  const started = plan(serialEvents());
  assert.deepEqual(validateSpeechPlan(started), { ok: true, errors: [] });
  const schedule = buildSpeechSchedule(started);
  assert.equal(schedule.quality_mode, "browser-timed");
  assert.deepEqual(schedule.events.map((event) => event.unit), UNITS);
  assert.equal(schedule.events[0].start_us, 0);
  assert.deepEqual(schedule.transitions.map((t) => t.boundary_us), [80_000, 160_000, 240_000, 320_000]);
  assert.deepEqual(
    schedule.transitions.map((t) => [t.previous_unit, t.current_unit]),
    UNITS.slice(1).map((unit, index) => [UNITS[index], unit]),
  );
  assert.ok(schedule.transitions.every((t) => t.playback_rate === 1));
  // The first clip is already on screen at the start event, not after a wait.
  assert.equal(resolveSpeechLayers(schedule, 0)[0].index, 0);
});

test("the end event holds the last unit until end and closes on sil", () => {
  const endUs = 700_000;
  const events = serialEvents();
  events.at(-1).end_us = endUs; // last unit holds its centre frame up to the end event
  events.push({ unit: "sil", start_us: endUs, end_us: endUs + 80_000 });
  const ended = plan(events);
  const schedule = buildSpeechSchedule(ended);
  const last = schedule.transitions.at(-1);
  assert.equal(last.current_unit, "sil");
  assert.equal(last.previous_unit, "velar");
  assert.equal(last.boundary_us, endUs);
  // Between the last word unit and the end nothing new starts (no timer-driven units).
  assert.equal(schedule.transitions.filter((t) => t.boundary_us > 320_000 && t.boundary_us < endUs).length, 0);
  const after = resolveSpeechLayers(schedule, endUs + 120_000);
  assert.equal(after.length, 1);
  assert.equal(after[0].key, "velar>sil");
});
