// SoT 3 / 6 recurrence guard: the canonical player and every file the web and
// shell copy byte for byte (vendor-manifest.json) must never again carry the
// drift traces Luke named — aiueo loops, volume-threshold mouths, drawn mouths,
// or approximate plans. Any hit fails the suite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mainDir = join(root, "src", "main");

const FORBIDDEN = Object.freeze([
  ["aiueo loop", /aiueo|a-i-u-e-o|아이우에오/i],
  ["volume threshold mouth", /createAnalyser|AnalyserNode|get(Byte|Float)(Frequency|TimeDomain)Data|\brms\b|volume[_-]?threshold|amplitude|loudness/i],
  ["drawn mouth", /draw[_-]?mouth|mouth[_-]?(open|shape|path|draw)|openness|\.ellipse\(|quadraticCurveTo|bezierCurveTo/i],
  ["approximate plan", /approximate/i],
]);

function scan(name, source) {
  const hits = [];
  source.split("\n").forEach((line, index) => {
    for (const [label, pattern] of FORBIDDEN) {
      if (pattern.test(line)) hits.push(`${name}:${index + 1} ${label}: ${line.trim().slice(0, 120)}`);
    }
  });
  return hits;
}

test("canonical player sources carry no aiueo, volume-threshold, drawn-mouth, or approximate traces", () => {
  const files = readdirSync(mainDir).filter((name) => /\.(js|mjs|html)$/.test(name));
  assert.ok(files.includes("speech-player.js") && files.includes("viewer.html"));
  const hits = files.flatMap((name) => scan(name, readFileSync(join(mainDir, name), "utf8")));
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

test("the drift scan itself catches each forbidden trace", () => {
  for (const sample of [
    "const AIUEO = ['a','i','u','e','o'];",
    "const analyser = ctx.createAnalyser();",
    "if (rms > volumeThreshold) open();",
    "drawMouth(ctx, openness);",
    "ctx.ellipse(x, y, w, h, 0, 0, 7);",
    "quality_mode: 'approximate'",
  ]) {
    assert.ok(scan("sample", sample).length > 0, sample);
  }
});
