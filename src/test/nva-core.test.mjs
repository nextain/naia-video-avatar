// nva-core 단위 테스트 (v0.3) — 검증·파생·포즈그래프·런타임·시나리오·마이그레이션
// 실행: node src/test/nva-core.test.mjs  (CI: for t in src/test/*.test.mjs; do node "$t"; done)
import { readFileSync } from "fs";
import {
  validateManifest, findTransitionPath, derive, animKind, isTransition,
  listScenarios, scenarioPlayOrder, NvaRuntime, buildPlaybackSequence, migrateToV03,
} from "../main/nva-core.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log("  ✓", m); else { console.error("  ✗", m); fail = 1; } };
const demo = JSON.parse(readFileSync(new URL("../../examples/demo.nva/manifest.json", import.meta.url)));

console.log("[validateManifest v0.3]");
const r = validateManifest(demo);
ok(r.ok && r.errors.length === 0, "demo.nva(v0.3) = VALID (errors 0)");
ok(demo.nva_version === "0.3", "demo 는 v0.3");
ok(!validateManifest({ nva_version: "0.2", canvas: { width: 1, height: 1 }, animations: {} }).ok, "빈 animations → INVALID");
ok(!validateManifest({ nva_version: "0.2", canvas: { width: 1, height: 1 }, animations: { a: { clip: "c", entry_pose: "p", exit_pose: "p", loop: true, can_talk: true } } }).ok, "can_talk인데 face_bbox 없음 → INVALID");
ok(!validateManifest({ nva_version: "0.1", canvas: { width: 1, height: 1 }, animations: { a: { clip: "c", entry_pose: "p", exit_pose: "p" } } }).ok, "nva_version 0.1 → INVALID");

console.log("[종류 유도(조합)]");
ok(animKind({ loop: true, can_talk: true, entry_pose: "s", exit_pose: "s" }) === "talking", "loop+can_talk = talking");
ok(animKind({ loop: true, can_talk: false, entry_pose: "s", exit_pose: "s" }) === "idle", "loop = idle");
ok(animKind({ loop: false, can_talk: false, entry_pose: "s", exit_pose: "s" }) === "gesture", "off = gesture");
ok(animKind({ loop: false, can_talk: false, entry_pose: "s", exit_pose: "t" }) === "transition", "entry≠exit = transition");
ok(isTransition({ entry_pose: "a", exit_pose: "b" }) === true, "isTransition a→b");

console.log("[포즈 그래프 (전환 애니 BFS)]");
ok(findTransitionPath(demo, "standing", "sitting") !== null, "standing→sitting 경로 존재");
ok(findTransitionPath(demo, "standing", "standing").length === 0, "같은 포즈 = []");
ok(findTransitionPath(demo, "standing", "flying") === null, "경로 없음 = null");

console.log("[파생 (cascade 규칙)]");
const d = derive(demo);
ok(d.talkKey != null, "말하기 base 유도됨");
ok(typeof d.events === "object", "events 맵 유도");

console.log("[런타임]");
const rt = new NvaRuntime(demo);
ok(rt.current != null, "런타임 current 초기화됨");
const anyTalk = d.talkKey;
if (anyTalk) {
const plan = rt.plan(anyTalk);
ok(plan && plan.target === anyTalk, "plan(target) 계획 생성");
ok(rt.plan("missing-animation") === null, "알 수 없는 target 계획은 null");
  const seq = buildPlaybackSequence(demo, plan);
  ok(seq.length >= 1 && seq[seq.length - 1].key === anyTalk, "재생 시퀀스 마지막 = target");
}

console.log("[시나리오 그래프]");
ok(listScenarios(demo).length === 1, "v0.2 = 단일 scenario");
ok(scenarioPlayOrder(demo).length >= 1, "scenarioPlayOrder ≥ 1 (start→scene)");
ok(!validateManifest({ ...demo, scenario: { nodes: { s: { type: "start" }, x: { type: "scene", animation: "nope" } }, edges: [] } }).ok, "scene animation 미존재 → INVALID");

console.log("[v0.1 → v0.3 마이그레이션]");
const v1 = { nva_version: "0.1", canvas: { width: 720, height: 1280 }, initial: "a",
  states: { a: { kind: "talking", clip: "clips/a.webm", entry_pose: "standing", exit_pose: "standing", loop: true, can_talk: true, face_bbox: [0.4, 0.1, 0.2, 0.16] } },
  transitions: {}, scenarios: { welcome: { label: "w", steps: [{ goto: "a", say: "hi", dwell_ms: 1000 }] } } };
const v3 = migrateToV03(v1);
ok(v3.nva_version === "0.3", "마이그레이션 → 0.3");
ok(v3.character_states.neutral, "legacy 상태→character_states");
ok(v3.scenario === undefined, "legacy scenario는 portable state 계약과 분리");
ok(validateManifest(v3).ok, "마이그레이션 결과 = VALID");

console.log(fail ? "\n❌ FAIL" : "\n✅ ALL PASS");
process.exit(fail);
