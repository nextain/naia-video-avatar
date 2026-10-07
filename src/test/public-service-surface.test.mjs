import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const srcRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../", import.meta.url);
const readSrc = (path) => readFileSync(new URL(path, srcRoot), "utf8");
const readRepo = (path) => readFileSync(new URL(path, repoRoot), "utf8");

test("public entrypoint is a simple completed-media service player", () => {
  assert.equal(existsSync(new URL("main/viewer.html", srcRoot)), true);
  const viewer = readSrc("main/viewer.html");
  assert.match(viewer, /NVA Avatar Player/);
  assert.match(viewer, /background/i);
  assert.match(viewer, /speech/i);
  assert.doesNotMatch(viewer, /node graph|timeline|text-to-speech|cascade/i);
});

test("public repository excludes creation, editor, TTS, and Cascade entrypoints", () => {
  for (const path of [
    "main/editor.html",
    "main/nva-cascade-adapter.js",
    "../docs/cascade-integration.md",
  ]) {
    assert.equal(existsSync(new URL(path, srcRoot)), false, `${path} must not be public`);
  }

  const readme = readRepo("README.md");
  assert.match(readme, /NVA v0\.3/);
  assert.match(readme, /read-only web Player/);
  assert.doesNotMatch(readme, /editor\.html|cascade-integration|nva-cascade-adapter/i);
});
