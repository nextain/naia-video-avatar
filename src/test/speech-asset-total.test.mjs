import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { speechAssetTotalBytes, SPEECH_ASSET_MAX_BYTES } from "../main/generation-contract.js";
import { loadNvaBundle } from "../main/nva-bundle-loader.js";

// alpha-adk decision log D25: the gateway, this Player contract and the studio web loader must count the
// same speech asset set. The same fixture bundle and golden total live in all three repositories.
const dir = new URL("./fixtures/speech-asset-total/", import.meta.url);
const golden = JSON.parse(readFileSync(new URL("speech-asset-total.golden.json", dir), "utf8"));
const fixture = readFileSync(new URL(golden.fixture, dir));

test("speech asset total of the shared D25 fixture matches the golden value", async () => {
  assert.equal(createHash("sha256").update(fixture).digest("hex"), golden.sha256);
  const bundle = await loadNvaBundle(new Blob([fixture]));
  const receiptPath = bundle.manifest.speech_motion.provenance;
  const receipt = JSON.parse(await bundle.assets.get(receiptPath).text());
  assert.equal(speechAssetTotalBytes(receipt), golden.expected_speech_asset_total_bytes);
  // The fixture also carries the receipt and a natural-eu side file, so counting all of speech/ would differ.
  assert.notEqual(golden.speech_dir_all_bytes, golden.expected_speech_asset_total_bytes);
});

test("speech asset limit stays 160 MiB", () => {
  assert.equal(SPEECH_ASSET_MAX_BYTES, 160 * 1024 * 1024);
});
