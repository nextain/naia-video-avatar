import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const main = new URL("../main/", import.meta.url);
const removed = [
  "editor.html",
  "demo.html",
  "generation-client.js",
  "generation-contract.js",
  "nva-cascade-adapter.js",
  "browser-tts.js",
  "speech-player.js",
  "speech-plan.js",
  "speech-runtime.js",
  "speech-browser-runtime.js",
  "speech-atlas-index.js",
  "speech-atlas-source.js",
  "speech-bundle.js",
  "speech-provenance.js",
];

test("public runtime contains only completed-media format and Player surfaces", async () => {
  for (const path of [
    "nva-schema.json", "nva-core.js", "viewer.html",
    "nva-animation-player.js", "nva-bundle-loader.js",
    "sample-catalog.js", "load-coordinator.js", "stage-background.js",
  ]) await access(new URL(path, main));
  for (const path of removed)
    await assert.rejects(access(new URL(path, main)), /ENOENT/);
});

test("README presents NVA Avatar Player as the current product", async () => {
  const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
  assert.match(readme, /^# NVA Avatar Player/m);
  assert.match(readme, /completed.*speech|pre-rendered.*speech/is);
  assert.doesNotMatch(readme, /browser.*TTS|Cascade|TensorRT|TRT/is);
  assert.doesNotMatch(readme, /src\/main\/editor\.html|src\/main\/demo\.html/);
});

test("viewer.html contains the playTalking button", async () => {
  const viewerHtml = await readFile(new URL("../main/viewer.html", import.meta.url), "utf8");
  assert.match(viewerHtml, /<button\s+[^>]*id="playTalking"[^>]*>/);
});

