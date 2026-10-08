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

test("(가) speech_motion 없는 기존 예시 번들 검증 결과가 바뀌지 않음", async () => {
  const demoUrl = new URL("../../examples/demo.nva/manifest.json", import.meta.url);
  const demoManifest = JSON.parse(await readFile(demoUrl, "utf8"));
  assert.equal(demoManifest.speech_motion, undefined);
  const result = validateManifest(demoManifest);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);

  const v3 = completedManifest();
  assert.equal(v3.speech_motion, undefined);
  const v3Result = validateManifest(v3, {
    clipFiles: ["clips/idle.webm", "clips/wave.webm", "clips/raise.webm", "speech/hello.mp4"],
  });
  assert.equal(v3Result.ok, true);
  assert.deepEqual(v3Result.errors, []);
});

test("(나) speech_motion 이 있는 번들 승인", () => {
  const v3 = completedManifest();
  v3.speech_motion = {
    version: "1",
    representation: "whole-head-layer",
    region: [100, 100, 200, 200],
    inventory_version: "1.0.0",
    inventory: [
      "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
      "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round",
    ],
    neutral_head: "speech/neutral-head.png",
    atlas: "speech/atlas.bin",
    atlas_index: "speech/atlas-index.json",
    validation_report: "speech/validation-report.json",
    quality_report: "speech/quality-report.json",
    provenance: "speech/generation-result.json",
  };
  const clipFiles = [
    "clips/idle.webm", "clips/wave.webm", "clips/raise.webm", "speech/hello.mp4",
    "speech/neutral-head.png", "speech/atlas.bin", "speech/atlas-index.json",
    "speech/validation-report.json", "speech/quality-report.json", "speech/generation-result.json",
  ];
  const result = validateManifest(v3, { clipFiles });
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("(다) 영수증 자산 해시가 다른 번들 거부", async () => {
  const { verifySpeechMotionBundle, speechMotionFromGenerationResult } = await import("../main/speech-bundle.js");
  const sha = "a".repeat(64);
  const fakeResult = {
    version: "1",
    job_id: "job_01JINA2Y7Q0M8T6R4P2N",
    assets: [
      { role: "neutral_head", path: "speech/neutral-head.png", sha256: sha, bytes: 10 },
      { role: "speech_atlas", path: "speech/atlas.bin", sha256: sha, bytes: 10 },
      { role: "speech_atlas_index", path: "speech/atlas-index.json", sha256: sha, bytes: 10 },
      { role: "validation_report", path: "speech/validation-report.json", sha256: sha, bytes: 10 },
      { role: "quality_report", path: "speech/quality-report.json", sha256: sha, bytes: 10 },
    ],
    provenance: {
      generator: { kind: "ditto", version: "test" },
      representation: "whole-head-layer",
      region: [100, 100, 200, 200],
      input_sha256: sha, settings_sha256: sha,
      inventory_version: "1.0.0",
      inventory: [
        "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
        "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round",
      ],
      validation: { status: "passed", report_sha256: sha },
    },
    quality: {
      report_sha256: sha,
      sync: { status: "not_evaluated" },
      continuity: { status: "not_evaluated" },
      naturalness: { status: "not_evaluated" },
      performance: { status: "not_evaluated" },
      bundle: { status: "not_evaluated" },
    },
    source_deleted_at: null,
    source_retention: "local-operator-file",
  };
  const motion = speechMotionFromGenerationResult(fakeResult);
  const assets = new Map();
  const badBlob = new Blob(["mismatched content"]);
  for (const asset of fakeResult.assets) {
    assets.set(asset.path, badBlob);
  }
  assets.set("speech/generation-result.json", new Blob([JSON.stringify(fakeResult)]));
  await assert.rejects(
    () => verifySpeechMotionBundle(motion, assets),
    /generated asset (size|hash) mismatch/
  );
});

test("스키마와 코어 일치: (가) speech_motion 있고 speech_clips 없는 번들 둘 다 승인, (나) 둘 다 없는 v0.3 번들 둘 다 거부", async () => {
  const schemaPath = new URL("../main/nva-schema.json", import.meta.url);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));

  function evaluateSchema(manifest) {
    const errors = [];
    if (Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (manifest[req] === undefined) errors.push(`missing required root field '${req}'`);
      }
    }
    if (Array.isArray(schema.anyOf)) {
      const satisfied = schema.anyOf.some((sub) => {
        if (Array.isArray(sub.required)) {
          return sub.required.every((r) => manifest[r] !== undefined);
        }
        return false;
      });
      if (!satisfied) errors.push("none of anyOf requirements satisfied");
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const k of Object.keys(manifest)) {
        if (!allowed.has(k)) errors.push(`unknown root field '${k}'`);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  // (가) speech_motion 있고 speech_clips 없는 번들
  const bundleWithMotionOnly = completedManifest();
  delete bundleWithMotionOnly.speech_clips;
  bundleWithMotionOnly.speech_motion = {
    version: "1",
    representation: "whole-head-layer",
    region: [100, 100, 200, 200],
    inventory_version: "1.0.0",
    inventory: [
      "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar",
      "palatal", "velar", "glottal", "vowel-open", "vowel-mid", "vowel-spread", "vowel-round",
    ],
    neutral_head: "speech/neutral-head.png",
    atlas: "speech/atlas.bin",
    atlas_index: "speech/atlas-index.json",
    validation_report: "speech/validation-report.json",
    quality_report: "speech/quality-report.json",
    provenance: "speech/generation-result.json",
  };
  const clipFiles = [
    "clips/idle.webm", "clips/wave.webm", "clips/raise.webm",
    "speech/neutral-head.png", "speech/atlas.bin", "speech/atlas-index.json",
    "speech/validation-report.json", "speech/quality-report.json", "speech/generation-result.json",
  ];
  const schemaResultA = evaluateSchema(bundleWithMotionOnly);
  assert.equal(schemaResultA.ok, true, `Schema should accept motion-only: ${schemaResultA.errors.join("; ")}`);
  const coreResultA = validateManifest(bundleWithMotionOnly, { clipFiles });
  assert.equal(coreResultA.ok, true, `Core should accept motion-only: ${coreResultA.errors.join("; ")}`);

  // (나) 둘 다 없는 v0.3 번들
  const bundleWithoutBoth = completedManifest();
  delete bundleWithoutBoth.speech_clips;
  assert.equal(bundleWithoutBoth.speech_motion, undefined);
  const schemaResultB = evaluateSchema(bundleWithoutBoth);
  assert.equal(schemaResultB.ok, false, "Schema should reject when both speech_clips and speech_motion are absent");
  const coreResultB = validateManifest(bundleWithoutBoth, { clipFiles });
  assert.equal(coreResultB.ok, false, "Core should reject when both speech_clips and speech_motion are absent");
  assert.match(coreResultB.errors.join("; "), /speech_clips가 최소 1개 필요함/);
});

