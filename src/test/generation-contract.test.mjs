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

  const limit = 160 * 1024 * 1024;
  const otherBytes = result.assets.reduce((sum, asset, index) => (index === 1 ? sum : sum + asset.bytes), 0);
  const atLimit = structuredClone(result);
  atLimit.assets[1].bytes = limit - otherBytes;
  assert.equal(validateGenerationResult(atLimit).ok, true);

  const oversized = structuredClone(result);
  oversized.assets[1].bytes = limit - otherBytes + 1;
  assert.equal(validateGenerationResult(oversized).ok, false);

  const unboundReport = structuredClone(result);
  unboundReport.assets.find((asset) => asset.role === "quality_report").sha256 = "0".repeat(64);
  assert.equal(validateGenerationResult(unboundReport).ok, false);
});

test("whole-head-layer accepts screened and not_evaluated quality statuses with required region and local retention", () => {
  const wholeHeadResult = {
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
      generator: { kind: "test-generator", version: "test" },
      input_sha256: sha,
      settings_sha256: sha,
      inventory_version: "1.0.0",
      inventory: ["sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round"],
      validation: { status: "passed", report_sha256: sha },
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
    },
    quality: {
      report_sha256: sha,
      sync: { status: "screened" },
      continuity: { status: "screened" },
      naturalness: { status: "not_evaluated" },
      performance: { status: "screened" },
      bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };
  assert.equal(validateGenerationResult(wholeHeadResult).ok, true);

  // whole-head-layer rejects passed quality status
  const rejectedPassed = structuredClone(wholeHeadResult);
  rejectedPassed.quality.sync.status = "passed";
  assert.equal(validateGenerationResult(rejectedPassed).ok, false);

  // whole-head-layer requires region
  const missingRegion = structuredClone(wholeHeadResult);
  delete missingRegion.provenance.region;
  assert.equal(validateGenerationResult(missingRegion).ok, false);

  // validation.status must be passed for whole-head-layer too
  const badValidation = structuredClone(wholeHeadResult);
  badValidation.provenance.validation.status = "screened";
  assert.equal(validateGenerationResult(badValidation).ok, false);

  // factorized-difference-layer rejects local-operator-file retention and null deletion
  const badRetention = structuredClone(wholeHeadResult);
  badRetention.provenance.representation = "factorized-difference-layer";
  badRetention.quality.sync.status = "passed";
  badRetention.quality.continuity.status = "passed";
  badRetention.quality.naturalness.status = "passed";
  badRetention.quality.performance.status = "passed";
  badRetention.quality.bundle.status = "passed";
  assert.equal(validateGenerationResult(badRetention).ok, false);

  // whole-head-layer rejects other retention values
  const otherRetention = structuredClone(wholeHeadResult);
  otherRetention.source_retention = "cloud-storage";
  assert.equal(validateGenerationResult(otherRetention).ok, false);
});

test("whole-head-layer generation result passes with only the 8 contract provenance keys", () => {
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
      generator: { kind: "test-generator", version: "test" },
      input_sha256: sha,
      settings_sha256: sha,
      inventory_version: "1.0.0",
      inventory: ["sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round"],
      validation: { status: "passed", report_sha256: sha },
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
    },
    quality: {
      report_sha256: sha,
      sync: { status: "screened" },
      continuity: { status: "screened" },
      naturalness: { status: "not_evaluated" },
      performance: { status: "screened" },
      bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };
  const keys = Object.keys(result.provenance);
  assert.equal(keys.length, 8);
  assert.deepEqual(new Set(keys), new Set([
    "generator", "input_sha256", "settings_sha256", "inventory_version",
    "inventory", "validation", "representation", "region",
  ]));
  const validation = validateGenerationResult(result);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
});

test("whole-head-layer generation result accepts the canonical speech-set provenance keys and still rejects unknown keys", () => {
  const extraKeys = [
    "generator_commit",
    "anchor_frame_index",
    "natural_eu_sha256",
    "e_u_source",
    "residual_source",
    "anchor_background_rgb",
    "face_guide",
    "face_guide_policy",
    "silhouette_leak",
    "silhouette_leak_threshold",
  ];
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
      generator: { kind: "test-generator", version: "test" },
      input_sha256: sha,
      settings_sha256: sha,
      inventory_version: "1.0.0",
      inventory: ["sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round"],
      validation: { status: "passed", report_sha256: sha },
      representation: "whole-head-layer",
      region: [280, 70, 158, 242],
    },
    quality: {
      report_sha256: sha,
      sync: { status: "screened" },
      continuity: { status: "screened" },
      naturalness: { status: "not_evaluated" },
      performance: { status: "screened" },
      bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };

  for (const key of extraKeys) {
    result.provenance[key] = "test-placeholder";
  }

  assert.deepEqual(validateGenerationResult(result), { ok: true, errors: [] });
  result.provenance.unregistered_key = "x";
  const validation = validateGenerationResult(result);
  assert.equal(validation.ok, false);
  assert.deepEqual(validation.errors, ["provenance.unregistered_key is not allowed"]);
});

