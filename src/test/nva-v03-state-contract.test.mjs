import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NVA_VERSION,
  NvaCharacterStateRuntime,
  buildStateSpeechPlan,
  listStateAssets,
  migrateToV03,
  replaceStateResource,
  validateManifest,
} from "../main/nva-core.js";

const load = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
const golden = load("../../examples/demo.nva/manifest.json");

assert.equal(NVA_VERSION, "0.3", "the public state-resource contract is v0.3");
assert.equal(golden.nva_version, "0.3", "the golden fixture uses the current contract");
assert.equal(validateManifest(golden).ok, true, "the two-state golden fixture is valid");
assert.deepEqual(Object.keys(golden.character_states).sort(), ["neutral", "seated"]);

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

const plan = buildStateSpeechPlan(golden, "hello", "seated");
assert.equal(plan.character_state_id, "seated");
assert.equal(plan.playback_state, "speaking");
assert.equal(plan.talking_head_descriptor.profile_ref, "demo-windows-default");

for (const outcome of ["completed", "cancelled", "error", "barge-in"]) {
  const runtime = new NvaCharacterStateRuntime(golden);
  runtime.selectCharacterState("seated");
  runtime.startSpeaking();
  const restored = runtime.finishSpeaking(outcome);
  assert.equal(restored.character_state_id, "seated", `${outcome} keeps the selected character state`);
  assert.equal(restored.playback_state, "idle", `${outcome} returns to idle`);
  assert.equal(restored.idle.path, golden.character_states.seated.idle.path);
}

const before = structuredClone(golden);
const replaced = replaceStateResource(golden, "seated", "talking_body", {
  path: "clips/sit-talking-r2.webm",
  revision: { id: "demo-seated-talking-r2" },
});
assert.deepEqual(golden, before, "editing is immutable");
assert.deepEqual(replaced.character_states.neutral, golden.character_states.neutral, "an unrelated state is unchanged");
assert.equal(replaced.character_states.seated.idle.revision.id, golden.character_states.seated.idle.revision.id, "an unrelated resource revision is unchanged");
assert.equal(replaced.character_states.seated.talking_body.revision.id, "demo-seated-talking-r2");

const missingDescriptor = structuredClone(golden);
delete missingDescriptor.character_states.neutral.talking_head.descriptor;
assert.equal(validateManifest(missingDescriptor).ok, false, "a talking-head descriptor is mandatory");

const traversal = structuredClone(golden);
traversal.character_states.neutral.idle.path = "../secret.webm";
assert.equal(validateManifest(traversal).ok, false, "portable asset paths reject traversal");

const future = { ...golden, nva_version: "0.4" };
assert.equal(validateManifest(future).ok, false, "a future version is rejected explicitly");

const legacy = load("../../examples/naia.nva/manifest.json");
const migrated = migrateToV03(legacy);
assert.equal(migrated.nva_version, "0.3");
assert.ok(migrated.character_states.neutral);
assert.equal(migrated.character_states.neutral.talking_head.descriptor.kind, "legacy-v0.2-prototype");
assert.ok(migrated.character_states.neutral.talking_head.descriptor.legacy_prototype.talking_heads);
assert.equal(validateManifest(migrated).ok, true, "legacy v0.2 migrates to a valid current manifest");

console.log("✅ nva-v03-state-contract: PASS");
