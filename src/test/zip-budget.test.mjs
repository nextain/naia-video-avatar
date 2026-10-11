import test from "node:test";
import assert from "node:assert/strict";

import { assertZipBudget } from "../main/zip-budget.js";

const entry = (size) => ({ dir: false, _data: { uncompressedSize: size } });

test("ZIP budget checks central-directory sizes before decompression", () => {
  assert.deepEqual(assertZipBudget({ files: {
    "manifest.json": entry(100), "speech/atlas.bin": entry(200),
  } }), { files: 2, bytes: 300 });
  assert.throws(() => assertZipBudget({ files: { "../escape": entry(1) } }), /file table/);
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": entry(301) } }, { maxBytes: 300 }), /160 MiB/);
  const MIB = 1024 * 1024;
  assert.deepEqual(assertZipBudget({ files: { "speech/atlas.bin": entry(160 * MIB) } }), { files: 1, bytes: 160 * MIB });
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": entry(160 * MIB + 1) } }), /160 MiB/);
  assert.throws(() => assertZipBudget({ files: { "manifest.json": entry(1024 * 1024 + 1) } }), /manifest/);
  assert.throws(() => assertZipBudget({ files: { "speech/atlas.bin": { dir: false, _data: {} } } }), /metadata/);
});
