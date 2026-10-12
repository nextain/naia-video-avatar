import test from "node:test";
import assert from "node:assert/strict";

import { assertZipBudget } from "../main/zip-budget.js";

const entry = (size) => ({ dir: false, _data: { uncompressedSize: size } });

test("ZIP budget checks central-directory sizes before decompression", () => {
  assert.deepEqual(assertZipBudget({ files: {
    "manifest.json": entry(100), "speech/atlas.bin": entry(200),
  } }), { files: 2, bytes: 300 });
  assert.throws(() => assertZipBudget({ files: { "../escape": entry(1) } }), /file table/);
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": entry(301) } }, { maxBytes: 300 }), /256 MiB/);
  const MIB = 1024 * 1024;
  // Whole-bundle budget is 256 MiB (speech assets alone are capped at 160 MiB by generation-contract.js).
  assert.deepEqual(assertZipBudget({ files: { "speech/atlas.bin": entry(160 * MIB), "talking/clip.webm": entry(96 * MIB) } }),
    { files: 2, bytes: 256 * MIB });
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": entry(160 * MIB), "talking/clip.webm": entry(96 * MIB + 1) } }), /256 MiB/);
  assert.throws(() => assertZipBudget({ files: { "manifest.json": entry(1024 * 1024 + 1) } }), /manifest/);
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": { dir: false, _data: {} } } }), /metadata/);
});
