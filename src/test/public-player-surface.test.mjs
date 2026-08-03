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
];

test("public runtime contains format and Player surfaces but no Editor or video-generation client", async () => {
  for (const path of [
    "nva-schema.json", "nva-core.js", "viewer.html", "browser-tts.js",
    "nva-animation-player.js", "nva-bundle-loader.js", "speech-player.js",
    "sample-catalog.js", "load-coordinator.js",
  ]) await access(new URL(path, main));
  for (const path of removed)
    await assert.rejects(access(new URL(path, main)), /ENOENT/);
});

test("README presents NVA Avatar Player as the current product", async () => {
  const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
  assert.match(readme, /^# NVA Avatar Player/m);
  assert.match(readme, /browser.*TTS/is);
  assert.doesNotMatch(readme, /src\/main\/editor\.html|src\/main\/demo\.html/);
});
