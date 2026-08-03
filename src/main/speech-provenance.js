import { SPEECH_UNITS } from "./speech-plan.js";

const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_ROLES = new Set([
  "neutral_head", "speech_atlas", "speech_atlas_index",
  "validation_report", "quality_report",
]);
const QUALITY_SECTIONS = ["sync", "continuity", "naturalness", "performance", "bundle"];

function rejectUnknown(object, allowed, where, fail) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return;
  for (const key of Object.keys(object)) if (!allowed.has(key)) fail(`${where}.${key} is not allowed`);
}

function relativeBundlePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\")) return false;
  if (value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}

export function validateSpeechProvenanceReceipt(result) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (!result || typeof result !== "object" || Array.isArray(result))
    return { ok: false, errors: ["speech provenance receipt must be an object"] };
  rejectUnknown(result, new Set(["version", "job_id", "assets", "provenance", "quality", "source_deleted_at"]), "receipt", fail);
  if (result.version !== "1") fail('version must be "1"');
  if (!/^job_[A-Za-z0-9]{12,64}$/.test(result.job_id || "")) fail("job_id must be an opaque job_ identifier");

  const seenRoles = new Set();
  let totalAssetBytes = 0;
  if (!Array.isArray(result.assets) || !result.assets.length) fail("assets must be non-empty");
  else for (const [index, asset] of result.assets.entries()) {
    if (!asset || typeof asset !== "object") { fail(`assets[${index}] must be an object`); continue; }
    rejectUnknown(asset, new Set(["role", "path", "sha256", "bytes"]), `assets[${index}]`, fail);
    if (!REQUIRED_ROLES.has(asset.role)) fail(`assets[${index}].role is unsupported`);
    if (seenRoles.has(asset.role)) fail(`assets[${index}].role is duplicated`);
    seenRoles.add(asset.role);
    if (!relativeBundlePath(asset.path)) fail(`assets[${index}].path must stay inside the bundle`);
    if (!SHA256.test(asset.sha256 || "")) fail(`assets[${index}].sha256 is invalid`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) fail(`assets[${index}].bytes must be positive`);
    else totalAssetBytes += asset.bytes;
  }
  for (const role of REQUIRED_ROLES) if (!seenRoles.has(role)) fail(`asset role ${role} is required`);
  if (totalAssetBytes > 100 * 1024 * 1024) fail("speech assets exceed the 100 MiB bundle limit");
  const byRole = new Map((result.assets || []).map((asset) => [asset?.role, asset]));

  const provenance = result.provenance;
  if (!provenance || typeof provenance !== "object") fail("provenance is required");
  else {
    rejectUnknown(provenance, new Set(["generator", "input_sha256", "settings_sha256", "inventory_version", "inventory", "validation"]), "provenance", fail);
    rejectUnknown(provenance.generator, new Set(["kind", "version"]), "provenance.generator", fail);
    rejectUnknown(provenance.validation, new Set(["status", "report_sha256"]), "provenance.validation", fail);
    if (typeof provenance.generator?.kind !== "string" || !provenance.generator.kind) fail("provenance.generator.kind is required");
    if (typeof provenance.generator?.version !== "string" || !provenance.generator.version) fail("provenance.generator.version is required");
    for (const field of ["input_sha256", "settings_sha256"])
      if (!SHA256.test(provenance[field] || "")) fail(`provenance.${field} is invalid`);
    if (provenance.inventory_version !== "1.0.0") fail("provenance.inventory_version is invalid");
    if (!Array.isArray(provenance.inventory)
      || provenance.inventory.length !== SPEECH_UNITS.length
      || provenance.inventory.some((unit, index) => unit !== SPEECH_UNITS[index]))
      fail("provenance.inventory must equal the frozen inventory in order");
    if (provenance.validation?.status !== "passed") fail("provenance.validation must be passed");
    if (!SHA256.test(provenance.validation?.report_sha256 || "")) fail("provenance.validation.report_sha256 is invalid");
    if (byRole.get("validation_report")?.sha256 !== provenance.validation?.report_sha256)
      fail("validation report is not bound to provenance");
  }

  if (!result.quality || typeof result.quality !== "object") fail("quality is required");
  else {
    rejectUnknown(result.quality, new Set(["report_sha256", ...QUALITY_SECTIONS]), "quality", fail);
    if (!SHA256.test(result.quality.report_sha256 || "")) fail("quality.report_sha256 is invalid");
    if (byRole.get("quality_report")?.sha256 !== result.quality.report_sha256)
      fail("quality report is not bound to quality.report_sha256");
    for (const section of QUALITY_SECTIONS) {
      rejectUnknown(result.quality[section], new Set(["status"]), `quality.${section}`, fail);
      if (result.quality[section]?.status !== "passed") fail(`quality.${section} must be passed`);
    }
  }
  const deletedAt = typeof result.source_deleted_at === "string" ? Date.parse(result.source_deleted_at) : NaN;
  if (!Number.isFinite(deletedAt) || new Date(deletedAt).toISOString() !== result.source_deleted_at)
    fail("source_deleted_at must be an ISO timestamp");
  return { ok: errors.length === 0, errors };
}
