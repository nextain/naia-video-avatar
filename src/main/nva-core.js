// Portable NVA state-resource contract. Browser and Node ESM compatible.

export const NVA_VERSION = "0.3";
export const NVA_CONTRACT = "nva-state-resource";
export const PRIMARY_GENERATED_STATES = ["neutral", "happy", "sad", "angry", "surprised", "thinking"];
// Historical v0.2 prototype keys. They are accepted only inside a migrated descriptor.
export const PROTOTYPE_HEAD_KEYS = ["sil", "a", "i", "u", "e", "o"];

const clone = (value) => globalThis.structuredClone
  ? globalThis.structuredClone(value)
  : JSON.parse(JSON.stringify(value));
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const idPattern = /^[a-z0-9][a-z0-9._+-]{0,127}$/i;

export function isPortableAssetPath(value) {
  if (typeof value !== "string" || !value || value.includes("\0") || value.includes("\\")) return false;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|~)/i.test(value)) return false;
  const parts = value.split("/");
  return parts.every((part) => part && part !== "." && part !== "..");
}

export function isTransition(animation) {
  return (animation?.entry_pose || "") !== (animation?.exit_pose || "");
}

export function animKind(animation) {
  if (isTransition(animation)) return "transition";
  if (animation?.loop && animation?.can_talk) return "talking";
  if (animation?.loop) return "idle";
  return "gesture";
}

export function scenarioStartAnim(manifest) {
  const nodes = manifest?.scenario?.nodes || {};
  const edges = manifest?.scenario?.edges || [];
  const start = Object.keys(nodes).find((key) => nodes[key]?.type === "start");
  const next = start && edges.find((edge) => edge.from === start)?.to;
  return next && nodes[next] ? nodes[next].animation || null : null;
}

function stateMap(manifest) {
  return manifest?.character_states || {};
}

function resource(path, revisionId) {
  return { path: path || "", revision: { id: revisionId } };
}

function bboxObject(value, canvas, detector = "legacy-import") {
  if (object(value)) return clone(value);
  const [x = 0, y = 0, width = 0, height = width] = Array.isArray(value) ? value : [];
  return {
    schema_version: "1.0",
    source_width: Number(canvas?.width) || 1,
    source_height: Number(canvas?.height) || 1,
    coordinate_space: "normalized_0_1",
    x, y, width, height,
    anchor_frame: 0,
    confidence: 0,
    detector_version: detector,
    drift_report: { max_normalized_displacement: 0 },
  };
}

export function buildDefaultStatePlan(manifest, requestedStateId = null) {
  const states = stateMap(manifest);
  if (requestedStateId && !states[requestedStateId]) return null;
  const characterStateId = requestedStateId || manifest?.default_character_state_id;
  const state = states[characterStateId];
  if (!characterStateId || !state) return null;
  return {
    character_state_id: characterStateId,
    playback_state: "idle",
    state_revision: clone(state.revision),
    idle: clone(state.idle),
    talking_body: clone(state.talking_body),
    talking_head_source: clone(state.talking_head?.source),
    talking_head_descriptor: clone(state.talking_head?.descriptor),
    talking_head_revision: clone(state.talking_head?.revision),
    face_bbox: clone(state.face_bbox),
  };
}

export function listStateAssets(manifest) {
  const assets = [];
  for (const [stateId, state] of Object.entries(stateMap(manifest))) {
    for (const role of ["idle", "talking_body"]) {
      if (state?.[role]?.path) assets.push({ role: `character_states.${stateId}.${role}`, path: state[role].path });
    }
    if (state?.talking_head?.source?.path) {
      assets.push({ role: `character_states.${stateId}.talking_head.source`, path: state.talking_head.source.path });
    }
  }
  for (const [gestureId, gesture] of Object.entries(manifest?.gestures || {})) {
    if (gesture?.clip?.path) assets.push({ role: `gestures.${gestureId}.clip`, path: gesture.clip.path });
  }
  if (manifest?.background?.src) assets.push({ role: "background.src", path: manifest.background.src });
  for (const [animationId, animation] of Object.entries(manifest?.animations || {})) {
    if (animation?.clip) assets.push({ role: `animations.${animationId}.clip`, path: animation.clip });
  }
  return assets;
}

// Compatibility alias for older consumers. The returned roles are always v0.3 roles.
export const listStateEngineAssets = listStateAssets;

export function buildStateSpeechPlan(manifest, text = "", requestedStateId = null) {
  const plan = buildDefaultStatePlan(manifest, requestedStateId);
  if (!plan?.talking_body?.path || !plan?.talking_head_source?.path || !plan?.talking_head_descriptor) return null;
  return { ...plan, playback_state: "speaking", text: String(text || "") };
}

export function extractProsodyTags(text = "") {
  const tags = [];
  const pattern = /\[([a-z][a-z0-9_-]*)\]/gi;
  let match;
  while ((match = pattern.exec(String(text || "")))) {
    tags.push({ tag: match[1].toLowerCase(), index: match.index, raw: match[0] });
  }
  return tags;
}

export function stripProsodyTags(text = "") {
  return String(text || "").replace(/\[[a-z][a-z0-9_-]*\]/gi, "").replace(/\s+/g, " ").trim();
}

export function routeProsodyState(manifest, text = "", fallbackStateId = null) {
  const states = stateMap(manifest);
  const fallback = fallbackStateId && states[fallbackStateId]
    ? fallbackStateId
    : manifest?.default_character_state_id;
  for (const item of extractProsodyTags(text)) {
    const route = manifest?.prosody_map?.[item.tag];
    if (route?.character_state_id && states[route.character_state_id]) {
      return { character_state_id: route.character_state_id, state: route.character_state_id, tag: item.tag, route, cleanText: stripProsodyTags(text) };
    }
    // v0.2 authoring compatibility.
    if (route?.state && states[route.state]) {
      return { character_state_id: route.state, state: route.state, tag: item.tag, route, cleanText: stripProsodyTags(text) };
    }
  }
  const state = fallback && states[fallback] ? fallback : Object.keys(states)[0] || null;
  return { character_state_id: state, state, tag: null, route: null, cleanText: stripProsodyTags(text) };
}

// Historical helpers retained for reading v0.2 evidence. v0.3 does not call them.
export function textToViseme(character, visemes = PROTOTYPE_HEAD_KEYS) {
  const available = new Set(visemes);
  const mapped = ({ a: "a", i: "i", u: "u", e: "e", o: "o", 아: "a", 이: "i", 우: "u", 으: "u", 에: "e", 애: "e", 오: "o", 어: "o" })[String(character || "").toLowerCase()];
  return mapped && available.has(mapped) ? mapped : available.has("sil") ? "sil" : [...available][0] || "sil";
}

export function buildTtsVisemeTimeline(input = {}) {
  const visemes = input.visemes?.length ? input.visemes : PROTOTYPE_HEAD_KEYS;
  const hold = Number(input.sync?.default_hold_ms || 160);
  return [...String(input.text || "")].map((character, index) => ({
    t_ms: index * hold,
    viseme: textToViseme(character, visemes),
    source: "legacy-text",
  }));
}

export function visemeAtTime(timeline, elapsedMs) {
  let value = timeline?.[0]?.viseme || "sil";
  for (const item of timeline || []) {
    if (Number(item.t_ms || 0) > elapsedMs) break;
    value = item.viseme || value;
  }
  return value;
}

export function derive(manifest) {
  const animations = manifest?.animations || {};
  const start = scenarioStartAnim(manifest);
  const pick = (predicate) => {
    if (start && animations[start] && predicate(animations[start])) return start;
    return Object.keys(animations).find((key) => predicate(animations[key])) || null;
  };
  const idleKey = pick((item) => item.loop && !isTransition(item) && !item.can_talk);
  const talkKey = pick((item) => item.loop && !isTransition(item) && item.can_talk);
  const events = Object.fromEntries(Object.entries(animations)
    .filter(([, item]) => !item.loop || isTransition(item))
    .map(([key, item]) => [key, item.clip]));
  return {
    idleKey,
    talkKey,
    listeningKey: idleKey,
    events,
    idle: animations[idleKey],
    talking: animations[talkKey],
    stateEngine: buildDefaultStatePlan(manifest),
    characterState: buildDefaultStatePlan(manifest),
  };
}

export function migrateToV02(manifest) {
  if (!manifest || manifest.nva_version === "0.2") return manifest;
  if (manifest.nva_version !== "0.1") return manifest;
  const animations = {};
  for (const [key, state] of Object.entries(manifest.states || {})) {
    animations[key] = {
      clip: state.clip,
      entry_pose: state.entry_pose,
      exit_pose: state.exit_pose,
      loop: !!state.loop,
      can_talk: !!state.can_talk,
      ...(Array.isArray(state.face_bbox) ? { face_bbox: state.face_bbox } : {}),
      label: state.label || key,
    };
  }
  for (const [key, transition] of Object.entries(manifest.transitions || {})) {
    animations[key] = { ...transition, loop: false, can_talk: false, label: transition.label || key };
  }
  const nodes = { start: { type: "start", label: "start" } };
  const edges = [];
  const scenario = Object.values(manifest.scenarios || {})[0];
  let previous = "start";
  let index = 0;
  for (const step of scenario?.steps || []) {
    const animation = step.goto || step.event;
    if (!animation) continue;
    const id = `n${index++}`;
    nodes[id] = { type: "scene", animation, label: step.say || animation, ...(step.dwell_ms ? { dwell_ms: step.dwell_ms } : {}) };
    edges.push({ from: previous, to: id });
    previous = id;
  }
  if (index === 0 && manifest.initial) {
    nodes.n0 = { type: "scene", animation: manifest.initial, label: "idle" };
    edges.push({ from: "start", to: "n0" });
  }
  return {
    nva_version: "0.2",
    meta: clone(manifest.meta || {}),
    canvas: clone(manifest.canvas || { width: 720, height: 1280, fps: 25 }),
    background: clone(manifest.background || { type: "transparent" }),
    poses: clone(manifest.poses || []),
    animations,
    scenario: { nodes, edges },
    ...(manifest.chroma_key ? { chroma_key: manifest.chroma_key } : {}),
  };
}

export function migrateToV03(input) {
  if (!object(input)) return input;
  if (input.nva_version === NVA_VERSION) return clone(input);
  const legacy = input.nva_version === "0.1" ? migrateToV02(input) : input;
  if (legacy?.nva_version !== "0.2") return clone(input);

  const canvas = clone(legacy.canvas || { width: 720, height: 1280, fps: 25 });
  const animations = clone(legacy.animations || {});
  const idleAnimation = Object.entries(animations).find(([, item]) => item.loop && !item.can_talk && !isTransition(item));
  const talkAnimation = Object.entries(animations).find(([, item]) => item.loop && item.can_talk && !isTransition(item));
  const legacyStates = legacy.state_engine?.states || {
    neutral: {
      label: "neutral",
      idle: idleAnimation?.[1]?.clip || talkAnimation?.[1]?.clip || "",
      talking_body: talkAnimation?.[1]?.clip || idleAnimation?.[1]?.clip || "",
      face_preview: talkAnimation?.[1]?.head_image || "",
      face_bbox: talkAnimation?.[1]?.face_bbox || [0, 0, 1, 1],
      talking_heads: {},
      sync: {},
    },
  };
  const characterStates = {};
  for (const [stateId, state] of Object.entries(legacyStates)) {
    const safeId = idPattern.test(stateId) ? stateId : `state-${Object.keys(characterStates).length + 1}`;
    const sourcePath = state.face_preview
      || state.talking_head_source
      || Object.values(state.talking_heads || {}).find(Boolean)
      || talkAnimation?.[1]?.head_image
      || state.talking_body
      || talkAnimation?.[1]?.clip
      || "";
    characterStates[safeId] = {
      label: state.label || safeId,
      revision: { id: `legacy-${safeId}-state-r1` },
      idle: resource(state.idle || idleAnimation?.[1]?.clip || "", `legacy-${safeId}-idle-r1`),
      talking_body: resource(state.talking_body || talkAnimation?.[1]?.clip || "", `legacy-${safeId}-talking-r1`),
      talking_head: {
        revision: { id: `legacy-${safeId}-head-r1` },
        source: {
          ...resource(sourcePath, `legacy-${safeId}-head-source-r1`),
          media_type: /\.mp4$/i.test(sourcePath) ? "video/mp4" : /\.webm$/i.test(sourcePath) ? "video/webm" : "image/png",
        },
        descriptor: {
          schema_version: "1.0",
          kind: "legacy-v0.2-prototype",
          profile_ref: "legacy-default",
          legacy_prototype: {
            talking_heads: clone(state.talking_heads || {}),
            sync: clone(state.sync || {}),
            talking_head_crop: !!state.talking_head_crop,
          },
        },
      },
      face_bbox: bboxObject(state.face_bbox || talkAnimation?.[1]?.face_bbox, canvas),
    };
  }
  const defaultId = legacy.state_engine?.default_state;
  const defaultCharacterStateId = defaultId && characterStates[defaultId] ? defaultId : Object.keys(characterStates)[0];
  const gestures = {};
  for (const [gestureId, animation] of Object.entries(animations)) {
    if (animation.loop || isTransition(animation)) continue;
    gestures[gestureId] = {
      label: animation.label || gestureId,
      revision: { id: `legacy-gesture-${gestureId}-r1` },
      clip: resource(animation.clip || "", `legacy-gesture-${gestureId}-clip-r1`),
      allowed_character_state_ids: Object.keys(characterStates),
      return_policy: "same-character-state",
    };
  }
  return {
    nva_version: NVA_VERSION,
    contract: { name: NVA_CONTRACT, version: "1.0" },
    revision: { id: "legacy-import-r1" },
    meta: clone(legacy.meta || {}),
    canvas,
    background: clone(legacy.background || { type: "transparent" }),
    ...(legacy.chroma_key ? { chroma_key: legacy.chroma_key } : {}),
    default_character_state_id: defaultCharacterStateId,
    character_states: characterStates,
    gestures,
    legacy: { source_version: legacy.nva_version },
  };
}

function validateRevision(value, where, errors, revisionIds) {
  if (!object(value) || !idPattern.test(value.id || "")) {
    errors.push(`${where}.revision.id required`);
    return;
  }
  if (revisionIds.has(value.id)) errors.push(`${where}.revision.id duplicate: ${value.id}`);
  revisionIds.add(value.id);
}

function validateResource(value, where, errors, revisionIds, assetPaths) {
  if (!object(value)) {
    errors.push(`${where} resource required`);
    return;
  }
  if (!isPortableAssetPath(value.path)) errors.push(`${where}.path must be a portable relative asset path`);
  else if (assetPaths && !assetPaths.has(value.path)) errors.push(`${where}.path missing asset: ${value.path}`);
  validateRevision(value.revision, where, errors, revisionIds);
}

function validateFaceBbox(value, where, errors) {
  if (!object(value)) return errors.push(`${where} object required`);
  if (value.schema_version !== "1.0") errors.push(`${where}.schema_version must be 1.0`);
  if (value.coordinate_space !== "normalized_0_1") errors.push(`${where}.coordinate_space must be normalized_0_1`);
  for (const key of ["source_width", "source_height"]) if (!Number.isInteger(value[key]) || value[key] <= 0) errors.push(`${where}.${key} must be a positive integer`);
  for (const key of ["x", "y", "width", "height"]) if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1 || ((key === "width" || key === "height") && value[key] === 0)) errors.push(`${where}.${key} must be within normalized bounds`);
  if (Number.isFinite(value.x) && Number.isFinite(value.width) && value.x + value.width > 1) errors.push(`${where} exceeds horizontal bounds`);
  if (Number.isFinite(value.y) && Number.isFinite(value.height) && value.y + value.height > 1) errors.push(`${where} exceeds vertical bounds`);
  if (!Number.isInteger(value.anchor_frame) || value.anchor_frame < 0) errors.push(`${where}.anchor_frame must be a non-negative integer`);
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) errors.push(`${where}.confidence must be 0..1`);
  if (typeof value.detector_version !== "string" || !value.detector_version) errors.push(`${where}.detector_version required`);
  if (!object(value.drift_report) || !Number.isFinite(value.drift_report.max_normalized_displacement) || value.drift_report.max_normalized_displacement < 0) errors.push(`${where}.drift_report.max_normalized_displacement required`);
}

export function validateManifest(manifest, options = {}) {
  const errors = [];
  const warnings = [];
  const revisionIds = new Set();
  const assetPaths = options.assetFiles || options.clipFiles ? new Set(options.assetFiles || options.clipFiles) : null;
  if (!object(manifest)) return { ok: false, errors: ["manifest must be an object"], warnings };
  if (manifest.nva_version !== NVA_VERSION) errors.push(`unsupported nva_version ${manifest.nva_version ?? "missing"}; current reader supports ${NVA_VERSION}`);
  if (manifest.contract?.name !== NVA_CONTRACT || manifest.contract?.version !== "1.0") errors.push(`contract must be ${NVA_CONTRACT} 1.0`);
  validateRevision(manifest.revision, "manifest", errors, revisionIds);
  if (!object(manifest.canvas) || !Number.isInteger(manifest.canvas.width) || manifest.canvas.width <= 0 || !Number.isInteger(manifest.canvas.height) || manifest.canvas.height <= 0) errors.push("canvas.width/height must be positive integers");
  if (manifest.canvas?.fps !== undefined && (!Number.isFinite(manifest.canvas.fps) || manifest.canvas.fps <= 0)) errors.push("canvas.fps must be a positive number");
  if (manifest.state_engine) errors.push("state_engine is a historical v0.2 field; migrate it to character_states");
  for (const forbidden of ["viseme_clips", "prebaked_speech", "audio_path"]) if (forbidden in manifest) errors.push(`${forbidden} is not portable NVA state data`);
  for (const forbidden of ["endpoint", "cascade_endpoint", "cascade_url", "remote_endpoint"]) if (forbidden in manifest) errors.push(`${forbidden} is local runtime configuration and must not be stored in NVA`);

  const states = stateMap(manifest);
  const stateIds = Object.keys(states);
  if (!object(manifest.character_states) || stateIds.length === 0) errors.push("character_states requires at least one state");
  if (!manifest.default_character_state_id || !states[manifest.default_character_state_id]) errors.push("default_character_state_id must reference character_states");
  for (const [stateId, state] of Object.entries(states)) {
    const where = `character_states.${stateId}`;
    if (!idPattern.test(stateId)) errors.push(`${where}: invalid state id`);
    if (!object(state)) { errors.push(`${where} object required`); continue; }
    validateRevision(state.revision, where, errors, revisionIds);
    validateResource(state.idle, `${where}.idle`, errors, revisionIds, assetPaths);
    validateResource(state.talking_body, `${where}.talking_body`, errors, revisionIds, assetPaths);
    if (!object(state.talking_head)) errors.push(`${where}.talking_head required`);
    else {
      validateRevision(state.talking_head.revision, `${where}.talking_head`, errors, revisionIds);
      validateResource(state.talking_head.source, `${where}.talking_head.source`, errors, revisionIds, assetPaths);
      const descriptor = state.talking_head.descriptor;
      if (!object(descriptor)) errors.push(`${where}.talking_head.descriptor required`);
      else {
        if (descriptor.schema_version !== "1.0") errors.push(`${where}.talking_head.descriptor.schema_version must be 1.0`);
        if (typeof descriptor.kind !== "string" || !descriptor.kind.trim()) errors.push(`${where}.talking_head.descriptor.kind required`);
        if (typeof descriptor.profile_ref !== "string" || !descriptor.profile_ref.trim()) errors.push(`${where}.talking_head.descriptor.profile_ref required`);
      }
    }
    validateFaceBbox(state.face_bbox, `${where}.face_bbox`, errors);
  }
  for (const [gestureId, gesture] of Object.entries(manifest.gestures || {})) {
    const where = `gestures.${gestureId}`;
    if (!idPattern.test(gestureId)) errors.push(`${where}: invalid gesture id`);
    validateRevision(gesture?.revision, where, errors, revisionIds);
    validateResource(gesture?.clip, `${where}.clip`, errors, revisionIds, assetPaths);
    if (!Array.isArray(gesture?.allowed_character_state_ids)) errors.push(`${where}.allowed_character_state_ids must be an array`);
    else for (const stateId of gesture.allowed_character_state_ids) if (!states[stateId]) errors.push(`${where}: unknown allowed character state ${stateId}`);
    if (gesture?.return_policy !== "same-character-state") errors.push(`${where}.return_policy must be same-character-state`);
  }
  for (const [tag, route] of Object.entries(manifest.prosody_map || {})) {
    const stateId = route?.character_state_id || route?.state;
    if (!stateId || !states[stateId]) errors.push(`prosody_map.${tag}: unknown character state ${stateId || "missing"}`);
  }
  const animations = manifest.animations || {};
  if (manifest.background?.src) {
    if (!isPortableAssetPath(manifest.background.src)) errors.push("background.src must be a portable relative asset path");
    else if (assetPaths && !assetPaths.has(manifest.background.src)) errors.push(`background.src missing asset: ${manifest.background.src}`);
  }
  for (const [animationId, animation] of Object.entries(animations)) {
    if (!object(animation) || !isPortableAssetPath(animation.clip)) errors.push(`animations.${animationId}.clip must be a portable relative asset path`);
    else if (assetPaths && !assetPaths.has(animation.clip)) errors.push(`animations.${animationId}.clip missing asset: ${animation.clip}`);
    if (animation?.can_talk && (!Array.isArray(animation.face_bbox) || ![3, 4].includes(animation.face_bbox.length))) errors.push(`animations.${animationId}.face_bbox required when can_talk=true`);
  }
  const nodes = manifest.scenario?.nodes || {};
  let starts = 0;
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (node?.type === "start") starts += 1;
    else if (!node?.animation || !animations[node.animation]) errors.push(`scenario node ${nodeId}: animation missing ${node?.animation || ""}`);
  }
  if (starts > 1) errors.push("scenario must have at most one start node");
  for (const edge of manifest.scenario?.edges || []) {
    if (!nodes[edge?.from] || !nodes[edge?.to]) errors.push(`scenario edge references a missing node: ${edge?.from || ""}->${edge?.to || ""}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function replaceStateResource(manifest, stateId, role, nextResource) {
  if (!stateMap(manifest)[stateId]) throw new Error(`unknown character state: ${stateId}`);
  if (!new Set(["idle", "talking_body", "talking_head"]).has(role)) throw new Error(`unsupported state resource role: ${role}`);
  const revisionId = nextResource?.revision?.id;
  if (!revisionId) throw new Error(`${role} revision required`);
  if (role !== "talking_head" && !isPortableAssetPath(nextResource?.path)) throw new Error(`${role} portable asset path required`);
  if (role === "talking_head" && (!isPortableAssetPath(nextResource?.source?.path) || !nextResource?.descriptor)) throw new Error("talking_head source and descriptor required");
  const next = clone(manifest);
  next.character_states[stateId][role] = clone(nextResource);
  const previous = next.character_states[stateId].revision?.id || `${stateId}-state`;
  const stateRevisionId = `${previous}+${revisionId}`.replace(/[^a-z0-9._+-]/gi, "-").slice(0, 128);
  next.character_states[stateId].revision = { id: stateRevisionId };
  return next;
}

export class NvaCharacterStateRuntime {
  constructor(manifest) {
    const result = validateManifest(manifest);
    if (!result.ok) throw new Error(`invalid NVA manifest: ${result.errors.join("; ")}`);
    this.manifest = manifest;
    this.character_state_id = manifest.default_character_state_id;
    this.playback_state = "idle";
  }

  selectCharacterState(stateId) {
    if (!stateMap(this.manifest)[stateId]) throw new Error(`unknown character state: ${stateId}`);
    this.character_state_id = stateId;
    this.playback_state = "idle";
    return this.snapshot();
  }

  startSpeaking() {
    const plan = buildStateSpeechPlan(this.manifest, "", this.character_state_id);
    if (!plan) throw new Error(`character state is not speakable: ${this.character_state_id}`);
    this.playback_state = "speaking";
    return { ...plan, playback_state: this.playback_state };
  }

  finishSpeaking(outcome = "completed") {
    if (!new Set(["completed", "cancelled", "error", "barge-in"]).has(outcome)) throw new Error(`unknown speech outcome: ${outcome}`);
    this.playback_state = "idle";
    return { ...this.snapshot(), outcome };
  }

  startGesture(gestureId) {
    const gesture = this.manifest.gestures?.[gestureId];
    if (!gesture) throw new Error(`unknown gesture: ${gestureId}`);
    if (gesture.allowed_character_state_ids?.length && !gesture.allowed_character_state_ids.includes(this.character_state_id)) throw new Error(`gesture ${gestureId} not allowed from ${this.character_state_id}`);
    this.playback_state = "gesture";
    return { gesture_id: gestureId, character_state_id: this.character_state_id, playback_state: this.playback_state, clip: clone(gesture.clip) };
  }

  finishGesture() {
    this.playback_state = "idle";
    return this.snapshot();
  }

  snapshot() {
    return { ...buildDefaultStatePlan(this.manifest, this.character_state_id), playback_state: this.playback_state };
  }
}

export function listScenarios(manifest) {
  const nodes = manifest?.scenario?.nodes;
  if (!nodes) return [];
  return [{ id: "scenario", label: "scenario", steps: Object.values(nodes).filter((node) => node.type !== "start").length }];
}

export function scenarioPlayOrder(manifest) {
  const nodes = manifest?.scenario?.nodes || {};
  const edges = manifest?.scenario?.edges || [];
  let current = Object.keys(nodes).find((key) => nodes[key]?.type === "start");
  const order = [];
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = nodes[current];
    if (node?.type !== "start" && node?.animation) order.push({ animation: node.animation, say: node.label, dwell_ms: node.dwell_ms });
    current = edges.find((edge) => edge.from === current)?.to;
  }
  return order;
}

export function findTransitionPath(manifest, fromPose, toPose) {
  if (fromPose === toPose) return [];
  const transitions = Object.entries(manifest?.animations || {}).filter(([, animation]) => isTransition(animation));
  const queue = [[fromPose, []]];
  const seen = new Set([fromPose]);
  while (queue.length) {
    const [pose, path] = queue.shift();
    for (const [key, animation] of transitions) {
      if (animation.entry_pose !== pose || seen.has(animation.exit_pose)) continue;
      const next = [...path, key];
      if (animation.exit_pose === toPose) return next;
      seen.add(animation.exit_pose);
      queue.push([animation.exit_pose, next]);
    }
  }
  return null;
}

export class NvaRuntime {
  constructor(manifest) {
    this.m = manifest;
    const derived = derive(manifest);
    this.current = derived.idleKey || Object.keys(manifest.animations || {})[0] || null;
  }
  anim(key = this.current) { return this.m.animations?.[key]; }
  plan(targetKey) {
    const current = this.anim();
    const target = this.anim(targetKey);
    if (!target) return null;
    const path = findTransitionPath(this.m, current?.exit_pose ?? target.entry_pose, target.entry_pose);
    return path === null ? null : { transitions: path, target: targetKey };
  }
  commit(targetKey) { this.current = targetKey; }
}

export function buildPlaybackSequence(manifest, plan) {
  const sequence = (plan?.transitions || []).map((key) => ({ key, clip: manifest.animations[key].clip, loop: false, can_talk: false, face_bbox: null }));
  const target = manifest.animations?.[plan?.target];
  if (target) sequence.push({ key: plan.target, clip: target.clip, loop: !!target.loop, can_talk: !!target.can_talk, face_bbox: target.face_bbox || null });
  return sequence;
}

export function summarize(result) {
  return [result.ok ? "VALID" : "INVALID", ...result.errors.map((item) => `  ERROR  ${item}`), ...result.warnings.map((item) => `  WARN   ${item}`)].join("\n");
}
