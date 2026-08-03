import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../main/viewer.html", import.meta.url), "utf8");

test("public viewer leads with NVA plus free browser TTS without a generation endpoint", () => {
  assert.match(html, /id="nvaFile"/);
  assert.match(html, /id="speechText"/);
  assert.match(html, /id="voice"/);
  assert.match(html, /new BrowserTts/);
  assert.match(html, /buildBrowserTtsPreviewPlan/);
  assert.match(html, /browser TTS · approximate lip sync/);
  assert.doesNotMatch(html, /cdn\.jsdelivr|https?:\/\/[^"']+\/api/i);
  assert.doesNotMatch(html, /GenerationClient|genUrl|generation endpoint/i);
});

test("public viewer preserves optional aligned audio and SpeechPlan playback", () => {
  assert.match(html, /id="audioFile"/);
  assert.match(html, /id="planFile"/);
  assert.match(html, /new SpeechPlayer/);
  assert.match(html, /aligned audio \+ SpeechPlan/i);
});

test("viewer exposes actions and cancellation with idle restoration", () => {
  assert.match(html, /id="action"/);
  assert.match(html, /new NvaAnimationPlayer/);
  assert.match(html, /tts\?\.cancel\(\)/);
  assert.match(html, /playIdle/);
});

test("viewer routes asynchronous speech playback failures back to idle", () => {
  assert.match(html, /onPlaybackError:\s*\(error\)/);
  assert.match(html, /restoreIdle\(`Playback failed:/);
  assert.match(html, /tts\?\.cancel\(\)/);
});
