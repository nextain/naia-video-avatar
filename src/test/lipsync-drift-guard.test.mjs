// SoT 3 / 4 / 6 recurrence guard: the canonical player, every file the web and
// shell copy byte for byte (vendor-manifest.json), and the whole repository
// src must never again carry the drift traces Luke named — aiueo loops,
// volume-threshold mouths, drawn mouths, approximate plans, or a talking clip
// repeated without the sound. Any hit fails the suite. Patterns live in
// drift-patterns.mjs, the only file allowed to spell them out.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { FORBIDDEN, SAMPLES, SOUNDLESS_REPEAT, REPEAT_SAMPLES, scan } from "./drift-patterns.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcDir = join(root, "src");
const mainDir = join(srcDir, "main");
const PATTERN_FILE = join(srcDir, "test", "drift-patterns.mjs");
const TEXT = /\.(js|mjs|cjs|ts|tsx|html|py|json)$/;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(path);
    return TEXT.test(entry.name) ? [path] : [];
  });
}

test("canonical player sources carry no aiueo, volume-threshold, drawn-mouth, approximate, or sound-independent repeat traces", () => {
  const files = walk(mainDir);
  assert.ok(files.some((f) => f.endsWith("speech-player.js")) && files.some((f) => f.endsWith("viewer.html")));
  assert.ok(files.some((f) => f.endsWith("nva-animation-player.js")));
  const hits = files.flatMap((file) => scan(relative(root, file), readFileSync(file, "utf8")));
  assert.deepEqual(hits, []);
});

test("every vendored file in vendor-manifest.json is covered by the drift scan", () => {
  const manifest = JSON.parse(readFileSync(join(root, "vendor-manifest.json"), "utf8"));
  const vendored = Object.keys(manifest.files);
  assert.ok(vendored.length >= 10);
  for (const name of vendored) {
    assert.deepEqual(scan(name, readFileSync(join(mainDir, name), "utf8")), [], name);
  }
});

test("no file anywhere in src (players, viewer, tests, e2e) brings back a sound-independent talking repeat", () => {
  const files = walk(srcDir).filter((file) => file !== PATTERN_FILE);
  assert.ok(files.length > 40, `scanned ${files.length}`);
  const hits = files.flatMap((file) => scan(relative(root, file), readFileSync(file, "utf8"), SOUNDLESS_REPEAT));
  assert.deepEqual(hits, []);
});

test("the drift scan itself catches each forbidden trace", () => {
  for (const sample of SAMPLES) assert.ok(scan("sample", sample).length > 0, sample);
  for (const sample of REPEAT_SAMPLES) assert.ok(scan("sample", sample, SOUNDLESS_REPEAT).length > 0, sample);
  // The speech player's body clip (derived.talking, driven by the plan clock) is not a loop trace.
  assert.deepEqual(scan("ok", "const bodyUrl = this.#objectUrl(requiredAsset(assets, talking.clip));"), []);
});
