import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shouldBundleVoiceRef } from "../main/nva-core.js";

const editor = readFileSync(
  new URL("../main/editor.html", import.meta.url),
  "utf8",
);

test("absolute cascade voice URL stays external to the nva zip", () => {
  assert.equal(shouldBundleVoiceRef("http://localhost:8910/ref/audio/ref.wav"), false);
  assert.equal(shouldBundleVoiceRef("HTTPS://example.com/ref.wav"), false);
  assert.equal(shouldBundleVoiceRef("refs/ref.wav"), true);
  assert.equal(shouldBundleVoiceRef(""), false);
  assert.match(
    editor,
    /const vr=M\.meta\?\.voice_ref\?\.audio_path; if\(shouldBundleVoiceRef\(vr\)\) clips\.add\(vr\)/,
  );
  assert.match(editor, /M\.meta\.voice_ref=\{audio_path:url, sample_rate:48000\}/);
});
