import test from "node:test";
import assert from "node:assert/strict";

import {
  validateGenerationJob,
  validateGenerationResult,
} from "../main/generation-contract.js";

const sha = "c".repeat(64);

test("generation job exposes only an opaque source ID and bounded settings", () => {
  assert.equal(validateGenerationJob({
    version: "1",
    source_asset_id: "src_01JINA2Y7Q0M8T6R4P2N",
    representation: "factorized-difference-layer",
    inventory_version: "1.0.0",
  }).ok, true);

  assert.equal(validateGenerationJob({
    version: "1",
    source_asset_id: "https://internal/source.png",
    source_image_base64: "secret",
  }).ok, false);

  assert.equal(validateGenerationJob({
    version: "1",
    source_asset_id: "src_01JINA2Y7Q0M8T6R4P2N",
    representation: "factorized-difference-layer",
    inventory_version: "2.0.0",
  }).ok, false);

  assert.equal(validateGenerationJob({
    version: "1",
    source_asset_id: "src_01JINA2Y7Q0M8T6R4P2N",
    representation: "factorized-difference-layer",
    inventory_version: "1.0.0",
    debug_source_url: "https://internal/source.png",
  }).ok, false);
});

test("generation result requires complete provenance and quality sections", () => {
  const result = {
    version: "1",
    job_id: "job_01JINA2Y7Q0M8T6R4P2N",
    assets: [
      { role: "neutral_head", path: "speech/neutral-head.png", sha256: sha, bytes: 100 },
      { role: "speech_atlas", path: "speech/atlas.bin", sha256: sha, bytes: 200 },
      { role: "speech_atlas_index", path: "speech/atlas-index.json", sha256: sha, bytes: 300 },
      { role: "validation_report", path: "speech/validation-report.json", sha256: sha, bytes: 400 },
      { role: "quality_report", path: "speech/quality-report.json", sha256: sha, bytes: 500 },
    ],
    provenance: {
      generator: { kind: "ditto", version: "5c1863ca" },
      input_sha256: sha,
      settings_sha256: sha,
      inventory_version: "1.0.0",
      inventory: ["sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round"],
      validation: { status: "passed", report_sha256: sha },
    },
    quality: {
      report_sha256: sha,
      sync: { status: "passed" },
      continuity: { status: "passed" },
      naturalness: { status: "passed" },
      performance: { status: "passed" },
      bundle: { status: "passed" },
    },
    source_deleted_at: "2026-08-01T08:00:00.000Z",
  };
  assert.equal(validateGenerationResult(result).ok, true);

  const incomplete = structuredClone(result);
  delete incomplete.quality.naturalness;
  assert.equal(validateGenerationResult(incomplete).ok, false);

  const escaped = structuredClone(result);
  escaped.assets[0].path = "../private/source.png";
  assert.equal(validateGenerationResult(escaped).ok, false);

  const leaked = structuredClone(result);
  leaked.source_image_base64 = "secret";
  assert.equal(validateGenerationResult(leaked).ok, false);

  const weakDeletion = structuredClone(result);
  weakDeletion.source_deleted_at = "2026-08-01";
  assert.equal(validateGenerationResult(weakDeletion).ok, false);

  const oversized = structuredClone(result);
  oversized.assets[1].bytes = 100 * 1024 * 1024;
  assert.equal(validateGenerationResult(oversized).ok, false);

  const unboundReport = structuredClone(result);
  unboundReport.assets.find((asset) => asset.role === "quality_report").sha256 = "0".repeat(64);
  assert.equal(validateGenerationResult(unboundReport).ok, false);
});
