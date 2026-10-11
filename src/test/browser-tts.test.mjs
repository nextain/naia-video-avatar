import test from "node:test";
import assert from "node:assert/strict";

import { BrowserTts, buildBrowserTtsPreviewPlan } from "../main/browser-tts.js";
import { validateSpeechPlan } from "../main/speech-plan.js";

class MockUtterance {
  constructor(text) { this.text = text; }
}

function setup() {
  const voices = [
    { voiceURI: "ko", name: "Korean", lang: "ko-KR" },
    { voiceURI: "en", name: "English", lang: "en-US" },
  ];
  const synthesis = {
    cancelled: 0,
    spoken: [],
    getVoices: () => voices,
    speak(utterance) { this.spoken.push(utterance); },
    cancel() { this.cancelled += 1; },
  };
  let now = 0;
  return {
    synthesis,
    setNow: (value) => { now = value; },
    tts: new BrowserTts({ synthesis, Utterance: MockUtterance, now: () => now }),
  };
}

test("browser TTS preview plan is valid, bounded, and explicitly approximate", () => {
  const plan = buildBrowserTtsPreviewPlan({ durationUs: 640_000, stepUs: 160_000 });
  assert.equal(validateSpeechPlan(plan).ok, true);
  assert.equal(plan.quality_mode, "approximate");
  assert.deepEqual(plan.events.map((event) => event.unit), [
    "closed", "vowel-mid", "closed", "vowel-mid",
  ]);
  assert.equal(plan.events.at(-1).end_us, 640_000);
});

test("browser TTS exposes voices and a monotonic clock from the start event", async () => {
  const { synthesis, setNow, tts } = setup();
  assert.deepEqual(tts.voices().map((voice) => voice.voiceURI), ["en", "ko"]);
  setNow(100);
  const done = tts.speak({ text: "안녕하세요", voiceURI: "ko", rate: 1.1 });
  const utterance = synthesis.spoken[0];
  assert.equal(utterance.voice.voiceURI, "ko");
  assert.equal(tts.currentTimeSeconds(), 0);
  utterance.onstart();
  setNow(350);
  assert.equal(tts.currentTimeSeconds(), 0.25);
  utterance.onend();
  assert.deepEqual(await done, { outcome: "complete" });
  assert.equal(tts.speaking, false);
});

test("browser TTS cancellation settles even when the browser emits no end event", async () => {
  const { synthesis, tts } = setup();
  const done = tts.speak({ text: "hello" });
  assert.equal(tts.cancel(), true);
  assert.equal(synthesis.cancelled, 1);
  assert.deepEqual(await done, { outcome: "cancel" });
  assert.equal(tts.cancel(), false);
});

test("browser TTS errors fail closed", async () => {
  const { synthesis, tts } = setup();
  const done = tts.speak({ text: "hello" });
  synthesis.spoken[0].onerror({ error: "voice-unavailable" });
  await assert.rejects(done, /voice-unavailable/);
});
