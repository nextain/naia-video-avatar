import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  NVA_VERSION, animKind, derive, findTransitionPath, isTransition,
  listScenarios, propActions, scenarioPlayOrder, validateManifest,
} from "../main/nva-core.js";

function completedManifest() {
  return {
    nva_version: "0.3",
    profile: "completed-media",
    meta: { name: "Fixture", delivery: { kind: "completed-media", realtime: false } },
    canvas: { width: 720, height: 1280, fps: 25 },
    background: { type: "transparent" },
    poses: ["standing", "waving"],
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, entry_pose: "standing", exit_pose: "standing" },
      wave: { clip: "clips/wave.webm", loop: false, entry_pose: "standing", exit_pose: "standing" },
      raise: { clip: "clips/raise.webm", loop: false, entry_pose: "standing", exit_pose: "waving" },
    },
    speech_clips: {
      hello: { clip: "speech/hello.mp4", audio: "embedded", language: "ko-KR", label: "인사", duration_ms: 1000 },
    },
    scenario: {
      nodes: { start: { type: "start" }, idle: { type: "scene", animation: "idle" } },
      edges: [{ from: "start", to: "idle" }],
    },
  };
}

test("v0.3 completed-media manifest validates with all referenced assets", () => {
  const manifest = completedManifest();
  const result = validateManifest(manifest, {
    clipFiles: ["clips/idle.webm", "clips/wave.webm", "clips/raise.webm", "speech/hello.mp4"],
  });
  assert.equal(NVA_VERSION, "0.3");
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(derive(manifest).idleKey, "idle");
  assert.equal(animKind(manifest.animations.wave), "gesture");
});

test("v0.3 rejects missing speech, unsafe paths and private generation fields", () => {
  const missing = completedManifest();
  delete missing.speech_clips;
  assert.equal(validateManifest(missing).ok, false);

  const unsafe = completedManifest();
  unsafe.speech_clips.hello.clip = "../outside.mp4";
  assert.equal(validateManifest(unsafe).ok, false);

  const privateField = completedManifest();
  privateField.animations.idle.face_bbox = [0, 0, 1, 1];
  assert.equal(validateManifest(privateField).ok, false);

  const unknownRoot = completedManifest();
  unknownRoot.generation_receipt = { provider: "private" };
  assert.equal(validateManifest(unknownRoot).ok, false);
});

test("existing v0.2 manifests remain readable", () => {
  const legacy = completedManifest();
  legacy.nva_version = "0.2";
  delete legacy.profile;
  delete legacy.speech_clips;
  legacy.animations.talk = { clip: "clips/talk.webm", loop: true, can_talk: true };
  assert.equal(validateManifest(legacy).ok, true);
  assert.equal(derive(legacy).talkKey, "talk");
});

test("v0.2 accepts the legacy speech locale alias but v0.3 requires language", () => {
  const legacy = completedManifest();
  legacy.nva_version = "0.2";
  delete legacy.profile;
  legacy.animations.talk = { clip: "clips/talk.webm", loop: true, can_talk: true };
  legacy.speech_clips.hello.locale = legacy.speech_clips.hello.language;
  delete legacy.speech_clips.hello.language;
  assert.equal(validateManifest(legacy).ok, true);

  legacy.speech_clips.hello.locale = "not a tag!";
  assert.ok(validateManifest(legacy).errors.some((e) => e.startsWith("speech_clips.hello.locale")));

  const current = completedManifest();
  current.speech_clips.hello.locale = current.speech_clips.hello.language;
  delete current.speech_clips.hello.language;
  const validation = validateManifest(current);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /speech_clips\.hello\.language/);
});

test("scenario and pose helpers preserve deterministic playback order", () => {
  const manifest = completedManifest();
  assert.equal(isTransition(manifest.animations.raise), true);
  assert.deepEqual(findTransitionPath(manifest, "standing", "waving"), ["raise"]);
  assert.deepEqual(findTransitionPath(manifest, "standing", "standing"), []);
  assert.equal(findTransitionPath(manifest, "waving", "missing"), null);
  assert.equal(listScenarios(manifest).length, 1);
  assert.deepEqual(scenarioPlayOrder(manifest).map((item) => item.animation), ["idle"]);
});

test("v0.2 manifest with a single non-looping action stays valid (backward compatible)", () => {
  const result = validateManifest({
    nva_version: "0.2",
    meta: { name: "legacy" },
    canvas: { width: 720, height: 1280 },
    background: { type: "transparent" },
    animations: { wave: { clip: "clips/wave.webm", loop: false } },
  });
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("v0.2 manifest ignores unknown extension keys in root, meta, and animations", () => {
  const legacy = {
    nva_version: "0.2",
    meta: { name: "legacy", x_ext_b: 42 },
    canvas: { width: 720, height: 1280, fps: 25 },
    background: { type: "transparent" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, x_ext_c: "val" },
      talk: { clip: "clips/talk.webm", loop: true, can_talk: true },
      wave: { clip: "clips/wave.webm", loop: false, can_talk: false },
    },
    x_ext_a: "custom",
  };
  const result = validateManifest(legacy);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.warnings.length, 0, result.warnings.join("; "));
});

test("examples/demo.nva manifest passes validation and derives idle and talking keys", async () => {
  const demoUrl = new URL("../../examples/demo.nva/manifest.json", import.meta.url);
  const demoManifest = JSON.parse(await readFile(demoUrl, "utf8"));
  const result = validateManifest(demoManifest);
  assert.equal(result.ok, true, result.errors.join("; "));
  const derived = derive(demoManifest);
  assert.equal(derived.idleKey, "stand_idle");
  assert.equal(derived.talkKey, "stand_talk");
});

test("Studio v0.2 profile manifest validates prop actions, derive excludes props, and propActions returns entries", () => {
  const manifest = {
    nva_version: "0.2",
    canvas: { width: 720, height: 1280, fps: 25 },
    background: { type: "transparent" },
    expressions: { neutral: "idle", listening: "idle", speaking: "talking" },
    thumbnail: "thumbnail.png",
    meta: { name: "StudioAvatar", tagline: "Tagline", persona: "Persona", voice: "ko-KR-Standard-A" },
    speech_set: { version: "1.0", items: [] },
    animations: {
      idle: {
        clip: "clips/idle.webm", loop: true, can_talk: false, label: "대기",
        loop_crossfade_frames: 5, sha256: "abc", frames: 50, duration_s: 2.0,
      },
      talking: {
        clip: "clips/talking.webm", loop: true, can_talk: true, label: "말하기",
        loop_crossfade_frames: 5, sha256: "def", frames: 50, duration_s: 2.0,
        face_bbox: [0.2, 0.1, 0.6, 0.8],
      },
      strum: {
        clip: "clips/strum.webm", loop: true, can_talk: false, label: "연주",
        loop_crossfade_frames: 0, sha256: "ghi", frames: 60, duration_s: 2.4,
        prop_sequence: { enter: "strum__enter", exit: "strum__exit" },
      },
      strum__enter: {
        clip: "clips/strum_enter.webm", loop: false, can_talk: false, label: "연주 시작",
        role: "prop_enter", parent: "strum",
        loop_crossfade_frames: 0, sha256: "jkl", frames: 25, duration_s: 1.0,
      },
      strum__exit: {
        clip: "clips/strum_exit.webm", loop: false, can_talk: false, label: "연주 종료",
        role: "prop_exit", parent: "strum",
        loop_crossfade_frames: 0, sha256: "mno", frames: 25, duration_s: 1.0,
      },
      wave: {
        clip: "clips/wave.webm", loop: true, can_talk: false, label: "손흔들기",
        loop_crossfade_frames: 0, sha256: "pqr", frames: 40, duration_s: 1.6,
        prop_sequence: {},
      },
      gesture_a: { clip: "clips/nod.webm", loop: false, can_talk: false, label: "동작" },
      gesture_b: { clip: "clips/shake.webm", loop: false, can_talk: false, label: "동작" },
    },
  };

  const result = validateManifest(manifest);
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((w) => w.includes("중복")));

  const derived = derive(manifest);
  assert.equal(derived.idleKey, "idle");
  assert.equal(derived.talkKey, "talking");
  assert.equal("strum" in derived.events, false);
  assert.equal("strum__enter" in derived.events, false);
  assert.equal("strum__exit" in derived.events, false);
  assert.equal("wave" in derived.events, false);

  assert.deepEqual(propActions(manifest), [
    { key: "strum", label: "연주", enter: "strum__enter", exit: "strum__exit" },
    { key: "wave", label: "손흔들기", enter: null, exit: null },
  ]);
});

test("v0.2 prop_sequence with missing enter/exit keys produces warnings and null actions", () => {
  const manifest = {
    nva_version: "0.2",
    canvas: { width: 720, height: 1280 },
    background: { type: "transparent" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, label: "Idle" },
      prop_missing: {
        clip: "clips/prop.webm", loop: true, can_talk: false, label: "Prop",
        prop_sequence: { enter: "nonexistent_enter", exit: "nonexistent_exit" },
      },
    },
  };
  const result = validateManifest(manifest);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.includes("nonexistent_enter")));
  assert.ok(result.warnings.some((w) => w.includes("nonexistent_exit")));
  assert.deepEqual(propActions(manifest), [
    { key: "prop_missing", label: "Prop", enter: null, exit: null },
  ]);
});

test("v0.3 manifest with duplicate labels is rejected with an error", () => {
  const current = completedManifest();
  current.animations.wave.label = "Wave";
  current.animations.gesture = { clip: "clips/gesture.webm", loop: false, label: "Wave" };
  const result = validateManifest(current);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("중복")));
});

