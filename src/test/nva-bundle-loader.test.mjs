import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";

import {
  MAX_ARCHIVE_BYTES,
  MAX_EXPANDED_BYTES,
  loadNvaBundle,
} from "../main/nva-bundle-loader.js";

const encoder = new TextEncoder();

function concat(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function record(size, write) {
  const bytes = new Uint8Array(size);
  write(new DataView(bytes.buffer));
  return bytes;
}

function storedZip(files, { deflate = false } = {}) {
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  for (const [path, value] of Object.entries(files)) {
    const name = encoder.encode(path);
    const raw = typeof value === "string" ? encoder.encode(value) : value;
    const data = deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const local = record(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(8, deflate ? 8 : 0, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, raw.length, true);
      view.setUint16(26, name.length, true);
    });
    locals.push(local, name, data);
    const central = record(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(10, deflate ? 8 : 0, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, raw.length, true);
      view.setUint16(28, name.length, true);
      view.setUint32(42, localOffset, true);
    });
    centrals.push(central, name);
    localOffset += local.length + name.length + data.length;
  }
  const centralBytes = concat(centrals);
  const eocd = record(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, Object.keys(files).length, true);
    view.setUint16(10, Object.keys(files).length, true);
    view.setUint32(12, centralBytes.length, true);
    view.setUint32(16, localOffset, true);
  });
  return new Blob([concat([...locals, centralBytes, eocd])], { type: "application/zip" });
}

test("native NVA loader reads a stored manifest and assets without JSZip", async () => {
  const bundle = storedZip({
    "manifest.json": JSON.stringify({ nva_version: "0.2" }),
    "clips/idle.webm": new Uint8Array([1, 2, 3]),
  });
  const result = await loadNvaBundle(bundle);
  assert.equal(result.manifest.nva_version, "0.2");
  assert.equal(result.assets.get("clips/idle.webm").size, 3);
  assert.equal(result.files, 2);
});

test("native NVA loader rejects traversal, archive overflow and expanded-size overflow separately", async () => {
  assert.equal(MAX_ARCHIVE_BYTES, 200 * 1024 * 1024);
  assert.equal(MAX_EXPANDED_BYTES, 400 * 1024 * 1024);
  await assert.rejects(loadNvaBundle(storedZip({
    "manifest.json": "{}", "../escape": "x",
  })), /file table/);
  await assert.rejects(loadNvaBundle(storedZip({
    "manifest.json": "{}", "speech/atlas.bin": "12345",
  }), { maxBytes: 4 }), /200 MiB/);
  await assert.rejects(loadNvaBundle(storedZip({
    "manifest.json": "{}", "speech/atlas.bin": "12345",
  }), { maxBytes: 10_000, maxExpandedBytes: 4 }), /400 MiB/);
});

test("native NVA loader reads a deflated bundle built from the tracked naia example", async () => {
  const manifestText = await readFile(new URL("../../examples/naia.nva/manifest.json", import.meta.url), "utf8");
  const manifest = JSON.parse(manifestText);
  const clip = await readFile(new URL("../../examples/naia.nva/clips/speak_body.webm", import.meta.url));
  const result = await loadNvaBundle(storedZip({
    "manifest.json": manifestText,
    "clips/speak_body.webm": new Uint8Array(clip),
  }, { deflate: true }));
  assert.equal(result.manifest.nva_version, manifest.nva_version);
  assert.equal(result.assets.get("clips/speak_body.webm").size, clip.length);
});
