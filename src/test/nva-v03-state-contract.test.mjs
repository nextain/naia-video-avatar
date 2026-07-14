import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NVA_VERSION,
  NvaCharacterStateRuntime,
  buildStateSpeechPlan,
  extractProsodyTags,
  listStateAssets,
  migrateToV03,
  replaceStateResource,
  routeProsodyState,
  stripProsodyTags,
  validateManifest,
} from "../main/nva-core.js";

const load = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
const golden = load("../../examples/demo.nva/manifest.json");

assert.equal(NVA_VERSION, "0.3", "the public state-resource contract is v0.3");
assert.equal(golden.nva_version, "0.3", "the golden fixture uses the current contract");
assert.equal(validateManifest(golden).ok, true, "the two-state golden fixture is valid");
assert.deepEqual(Object.keys(golden.character_states).sort(), ["neutral", "seated"]);
assert.equal(golden.meta.license, "CC-BY-4.0", "the public golden fixture declares its license");
assert.match(golden.meta.provenance, /procedural|public-safe/i, "the public golden fixture declares non-customer provenance");
assert.doesNotMatch(JSON.stringify(golden.meta), /오사랑|osarang|customer|private/i, "the public golden fixture contains no customer provenance");

for (const [stateId, state] of Object.entries(golden.character_states)) {
  assert.ok(state.revision?.id, `${stateId} keeps a state revision`);
  assert.ok(state.idle?.path && state.idle?.revision?.id, `${stateId} keeps idle + revision`);
  assert.ok(state.talking_body?.path && state.talking_body?.revision?.id, `${stateId} keeps talking body + revision`);
  assert.ok(state.talking_head?.source?.path, `${stateId} keeps a talking-head source`);
  assert.ok(state.talking_head?.descriptor?.schema_version, `${stateId} keeps a versioned descriptor`);
  assert.equal(state.face_bbox.coordinate_space, "normalized_0_1");
}

const assets = listStateAssets(golden);
assert.ok(assets.some((asset) => asset.role === "character_states.neutral.talking_head.source"));
assert.ok(assets.some((asset) => asset.role === "character_states.seated.idle"));
assert.ok(assets.some((asset) => asset.role === "animations.dance.clip"), "hybrid legacy animation assets remain exportable");

const plan = buildStateSpeechPlan(golden, "hello", "seated");
assert.equal(plan.character_state_id, "seated");
assert.equal(plan.playback_state, "speaking");
assert.equal(plan.talking_head_descriptor.profile_ref, "demo-windows-default");
assert.equal(buildStateSpeechPlan(golden, "hello", "unknown-state"), null, "an unknown requested state is never silently replaced");

for (const outcome of ["completed", "cancelled", "error", "barge-in"]) {
  const runtime = new NvaCharacterStateRuntime(golden);
  runtime.selectCharacterState("seated");
  runtime.startSpeaking();
  const restored = runtime.finishSpeaking(outcome);
  assert.equal(restored.character_state_id, "seated", `${outcome} keeps the selected character state`);
  assert.equal(restored.playback_state, "idle", `${outcome} returns to idle`);
  assert.equal(restored.idle.path, golden.character_states.seated.idle.path);
}

const runtime = new NvaCharacterStateRuntime(golden);
runtime.selectCharacterState("seated");
const gesture = runtime.startGesture("wave");
assert.equal(gesture.character_state_id, "seated");
assert.equal(gesture.playback_state, "gesture");
assert.equal(runtime.finishGesture().character_state_id, "seated");
assert.equal(runtime.snapshot().playback_state, "idle");
assert.throws(() => runtime.selectCharacterState("missing"), /unknown character state/);
assert.throws(() => runtime.finishSpeaking("timed-out"), /unknown speech outcome/);
assert.throws(() => runtime.startGesture("missing"), /unknown gesture/);

const restrictedGesture = structuredClone(golden);
restrictedGesture.gestures.wave.allowed_character_state_ids = ["neutral"];
const restrictedRuntime = new NvaCharacterStateRuntime(restrictedGesture);
restrictedRuntime.selectCharacterState("seated");
assert.throws(() => restrictedRuntime.startGesture("wave"), /not allowed/);

const routedManifest = structuredClone(golden);
routedManifest.prosody_map = { sigh: { character_state_id: "seated" } };
assert.deepEqual(extractProsodyTags("[sigh] hello").map(({ tag }) => tag), ["sigh"]);
assert.equal(stripProsodyTags("[sigh] hello   world"), "hello world");
const routed = routeProsodyState(routedManifest, "[sigh] hello", "neutral");
assert.equal(routed.character_state_id, "seated");
assert.equal(routed.cleanText, "hello");

const before = structuredClone(golden);
const replaced = replaceStateResource(golden, "seated", "talking_body", {
  path: "clips/sit-talking-r2.webm",
  revision: { id: "demo-seated-talking-r2" },
});
assert.deepEqual(golden, before, "editing is immutable");
assert.deepEqual(replaced.character_states.neutral, golden.character_states.neutral, "an unrelated state is unchanged");
assert.equal(replaced.character_states.seated.idle.revision.id, golden.character_states.seated.idle.revision.id, "an unrelated resource revision is unchanged");
assert.equal(replaced.character_states.seated.talking_body.revision.id, "demo-seated-talking-r2");
assert.notEqual(replaced.character_states.seated.revision.id, golden.character_states.seated.revision.id, "resource replacement invalidates the state revision");

const missingAsset = validateManifest(golden, { assetFiles: listStateAssets(golden).map(({ path }) => path).filter((path) => path !== golden.character_states.seated.idle.path) });
assert.equal(missingAsset.ok, false, "bundle validation rejects a referenced asset that is absent from the archive");

const missingReturnPolicy = structuredClone(golden);
delete missingReturnPolicy.gestures.wave.return_policy;
assert.equal(validateManifest(missingReturnPolicy).ok, false, "a gesture must explicitly return to the same character state");

const missingDescriptor = structuredClone(golden);
delete missingDescriptor.character_states.neutral.talking_head.descriptor;
assert.equal(validateManifest(missingDescriptor).ok, false, "a talking-head descriptor is mandatory");

const missingDefault = structuredClone(golden);
missingDefault.default_character_state_id = "missing";
assert.equal(validateManifest(missingDefault).ok, false, "the default state must exist");

const duplicateRevision = structuredClone(golden);
duplicateRevision.character_states.seated.idle.revision.id = duplicateRevision.character_states.neutral.idle.revision.id;
assert.equal(validateManifest(duplicateRevision).ok, false, "revision IDs are unique across the bundle");

for (const invalidBox of [
  { x: 0.9, width: 0.2 },
  { y: 0.9, height: 0.2 },
  { width: 0 },
  { confidence: 1.1 },
  { anchor_frame: -1 },
]) {
  const invalid = structuredClone(golden);
  Object.assign(invalid.character_states.neutral.face_bbox, invalidBox);
  assert.equal(validateManifest(invalid).ok, false, `face bbox rejects ${JSON.stringify(invalidBox)}`);
}

const traversal = structuredClone(golden);
traversal.character_states.neutral.idle.path = "../secret.webm";
assert.equal(validateManifest(traversal).ok, false, "portable asset paths reject traversal");

const future = { ...golden, nva_version: "0.4" };
assert.equal(validateManifest(future).ok, false, "a future version is rejected explicitly");

const leakedEndpoint = { ...golden, cascade_endpoint: "http://private-host:8910" };
assert.equal(validateManifest(leakedEndpoint).ok, false, "runtime Cascade endpoints are not portable manifest data");

for (const field of ["viseme_clips", "prebaked_speech", "audio_path"]) {
  const forbidden = { ...golden, [field]: {} };
  assert.equal(validateManifest(forbidden).ok, false, `${field} is rejected from portable state data`);
}

for (const mutate of [
  (value) => { value.gestures["bad id"] = value.gestures.wave; delete value.gestures.wave; },
  (value) => { value.gestures.wave.allowed_character_state_ids = "neutral"; },
  (value) => { value.gestures.wave.allowed_character_state_ids = ["missing"]; },
  (value) => { value.gestures.wave.return_policy = "default-state"; },
]) {
  const invalid = structuredClone(golden);
  mutate(invalid);
  assert.equal(validateManifest(invalid).ok, false, "invalid gesture contract is rejected");
}

const legacy = load("../../examples/naia.nva/manifest.json");
const migrated = migrateToV03(legacy);
assert.equal(migrated.nva_version, "0.3");
assert.ok(migrated.character_states.neutral);
assert.equal(migrated.character_states.neutral.talking_head.descriptor.kind, "legacy-v0.2-prototype");
assert.ok(migrated.character_states.neutral.talking_head.descriptor.legacy_prototype.talking_heads);
assert.equal(validateManifest(migrated).ok, true, "legacy v0.2 migrates to a valid current manifest");

console.log("✅ nva-v03-state-contract: PASS");
