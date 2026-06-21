// nva-core 단위 테스트 — 검증·포즈그래프·상태머신·시나리오 (자체 assert, exit code)
// 실행: node src/test/nva-core.test.mjs  (CI: for t in src/test/*.test.mjs; do node "$t"; done)
import { readFileSync } from "fs";
import {
  validateManifest, findTransitionPath, reachableStates,
  listScenarios, NvaStateMachine, buildPlaybackSequence,
} from "../main/nva-core.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log("  ✓", m); else { console.error("  ✗", m); fail = 1; } };
const demo = JSON.parse(readFileSync(new URL("../../examples/demo.nva/manifest.json", import.meta.url)));

console.log("[validateManifest]");
const r = validateManifest(demo);
ok(r.ok && r.errors.length === 0, "demo.nva = VALID (errors 0)");
ok(r.warnings.length === 0, "demo.nva = 경고 0");
ok(!validateManifest({ nva_version: "0.1", canvas: { width: 1, height: 1 }, states: {} }).ok, "빈 states → INVALID");
ok(!validateManifest({ nva_version: "0.1", canvas: { width: 1, height: 1 }, states: { a: { kind: "talking", clip: "c", entry_pose: "p", exit_pose: "p", can_talk: true } }, initial: "a" }).ok, "can_talk인데 face_bbox 없음 → INVALID");
ok(!validateManifest({ ...demo, initial: "nope" }).ok, "initial 미존재 → INVALID");

console.log("[포즈 그래프]");
ok(JSON.stringify(findTransitionPath(demo, "standing", "sitting")) === JSON.stringify(["sit_down"]), "standing→sitting = [sit_down]");
ok(JSON.stringify(findTransitionPath(demo, "sitting", "standing")) === JSON.stringify(["stand_up"]), "sitting→standing = [stand_up]");
ok(findTransitionPath(demo, "standing", "standing").length === 0, "같은 포즈 = 전환 불요 []");
ok(findTransitionPath(demo, "standing", "flying") === null, "경로 없음 = null");
ok(reachableStates(demo, "stand_talk").has("sit_talk"), "stand_talk에서 sit_talk 도달 가능");

console.log("[상태머신]");
const sm = new NvaStateMachine(demo);
ok(sm.current === "stand_talk", "initial = stand_talk");
ok(JSON.stringify(sm.plan("sit_talk").transitions) === JSON.stringify(["sit_down"]), "plan(sit_talk) = sit_down 삽입");
ok(sm.plan("dance").transitions.length === 0, "plan(dance) = 직접(standing 동일)");
const seq = buildPlaybackSequence(demo, sm.plan("sit_talk"));
ok(seq.length === 2 && seq[0].kind === "transition" && seq[1].key === "sit_talk", "재생 시퀀스 = [transition, target]");

console.log("[시나리오]");
ok(listScenarios(demo).length === 4, "시나리오 4개 (민원/길/환영/작별)");
ok(listScenarios(demo).every(s => s.steps > 0), "모든 시나리오 steps ≥ 1");
ok(!validateManifest({ ...demo, scenarios: { x: { label: "x", steps: [{ goto: "nope" }] } } }).ok, "scenario goto 미존재 state → INVALID");
ok(validateManifest({ ...demo, scenarios: { x: { label: "x", steps: [{ goto: "stand_talk", say: "hi", dwell_ms: 1000 }] } } }).ok, "정상 시나리오 step = VALID");

console.log(fail ? "\n❌ FAIL" : "\n✅ ALL PASS");
process.exit(fail);
