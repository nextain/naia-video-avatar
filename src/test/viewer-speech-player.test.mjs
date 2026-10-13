import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SOUNDLESS_REPEAT, scan } from "./drift-patterns.mjs";

const html = await readFile(new URL("../main/viewer.html", import.meta.url), "utf8");

test("public viewer takes an NVA, audio, and SpeechPlan without a generation endpoint", () => {
  assert.match(html, /id="nvaFile"/);
  assert.match(html, /id="audioFile"/);
  assert.match(html, /id="planFile"/);
  assert.match(html, /new SpeechPlayer/);
  assert.doesNotMatch(html, /GenerationClient|genUrl|generation endpoint/i);
});

test("viewer shows only the aligned quality path and keeps cancellation", () => {
  assert.match(html, /aligned quality path/);
  assert.doesNotMatch(html, /approximate/i);
  assert.match(html, /player\?\.stop\("cancel"\)/);
});

test("viewer has no sound-independent talking repetition control (SoT 4)", () => {
  assert.deepEqual(scan("viewer.html", html, SOUNDLESS_REPEAT), []);
});
