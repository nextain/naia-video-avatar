import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../main/editor.html", import.meta.url),
  "utf8",
);

test("reference voice is configured through cascade and excluded from NVA", () => {
  assert.match(editor, /fetch\(casUrl\(\)\+"\/voice",\{method:"PUT"/);
  assert.match(editor, /if\(manifest\.meta\) delete manifest\.meta\.voice_ref/);
  assert.match(editor, /delete manifest\.voice_ref/);
  assert.doesNotMatch(editor, /M\.meta\.voice_ref=\{/);
  assert.match(editor, /const id=await casUpload\(\); await casSetVoice\(\)/);
  assert.match(editor, /selectedVoiceUrl\.includes\("\/ref\/audio\/"\)/);
});
