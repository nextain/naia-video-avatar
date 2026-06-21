// nva-core — naia video clip avatar 코어 로직 (브라우저 + node 양용 ESM)
//
// 포맷의 진짜 IP: 비디오 파일이 아니라 "클립의 위치·조합·순서" = 상태머신/포즈 그래프.
// 의존 0 (순수 JS). 뷰어·에디터·검증기가 공유.
//
// 개념:
//  - state: 안정/동작 단위. kind=talking(말하기 가능 안정 포즈) | animation(동작).
//  - transition: 포즈 간 이동 클립. entry_pose(from) → exit_pose(to).
//  - 포즈 연속성: A→B 가능 ⟺ A.exit_pose == B.entry_pose, 아니면 둘을 잇는 transition 체인 필요.

// ─────────────────────────────────────────────────────────────────────────────
// 1. 검증 (validator) — 유효성 체크
// ─────────────────────────────────────────────────────────────────────────────
export function validateManifest(m, opts = {}) {
  const errors = [];
  const warnings = [];
  const E = (s) => errors.push(s);
  const W = (s) => warnings.push(s);

  if (!m || typeof m !== "object") return { ok: false, errors: ["manifest가 객체가 아님"], warnings };

  if (m.nva_version !== "0.1") E(`nva_version은 "0.1"이어야 함 (현재: ${m.nva_version})`);
  if (!m.canvas || !(m.canvas.width > 0) || !(m.canvas.height > 0))
    E("canvas.width/height 필수(양수)");

  const states = m.states || {};
  const stateKeys = Object.keys(states);
  if (stateKeys.length === 0) E("states가 비어있음 (최소 1개)");

  if (!m.initial) E("initial 없음");
  else if (!states[m.initial]) E(`initial '${m.initial}'에 해당하는 state 없음`);

  const poses = new Set(m.poses || []);
  const usePoseVocab = poses.size > 0;

  const checkPose = (where, p) => {
    if (!p) { E(`${where}: pose 없음`); return; }
    if (usePoseVocab && !poses.has(p)) W(`${where}: pose '${p}'가 poses 어휘에 없음`);
  };

  for (const [k, s] of Object.entries(states)) {
    if (s.kind !== "talking" && s.kind !== "animation") E(`state ${k}: kind는 talking|animation`);
    if (!s.clip) E(`state ${k}: clip 없음`);
    checkPose(`state ${k}.entry_pose`, s.entry_pose);
    checkPose(`state ${k}.exit_pose`, s.exit_pose);
    if (s.can_talk) {
      if (!Array.isArray(s.face_bbox) || s.face_bbox.length !== 4)
        E(`state ${k}: can_talk=true면 face_bbox[x,y,w,h] 필수`);
      else if (s.face_bbox.some((v) => v < 0 || v > 1))
        E(`state ${k}: face_bbox 값은 0~1 범위`);
    }
    if (s.kind === "talking" && !s.can_talk)
      W(`state ${k}: talking인데 can_talk=false (의도된 것인지 확인)`);
  }

  for (const [k, t] of Object.entries(m.transitions || {})) {
    if (!t.clip) E(`transition ${k}: clip 없음`);
    checkPose(`transition ${k}.entry_pose`, t.entry_pose);
    checkPose(`transition ${k}.exit_pose`, t.exit_pose);
  }

  // 연결성: initial에서 모든 talking state로 도달 가능?
  if (m.initial && states[m.initial]) {
    const reachable = reachableStates(m, m.initial);
    for (const [k, s] of Object.entries(states)) {
      if (s.kind === "talking" && !reachable.has(k))
        W(`state ${k}(talking): initial '${m.initial}'에서 도달 불가 (포즈 경로 없음)`);
    }
  }

  // 클립 참조 존재 (번들 파일 목록이 주어질 때만)
  if (opts.clipFiles) {
    const files = new Set(opts.clipFiles);
    const refs = [
      ...Object.values(states).map((s) => s.clip),
      ...Object.values(m.transitions || {}).map((t) => t.clip),
    ];
    for (const r of refs) if (r && !files.has(r)) E(`클립 참조 '${r}' 번들에 없음`);
  }

  // 시나리오: steps 의 goto/event 가 state 에 존재해야
  for (const [sk, sc] of Object.entries(m.scenarios || {})) {
    if (!sc.label) W(`scenario ${sk}: label 없음`);
    if (!Array.isArray(sc.steps) || sc.steps.length === 0) { E(`scenario ${sk}: steps 비어있음`); continue; }
    sc.steps.forEach((st, i) => {
      if (st.goto && !states[st.goto]) E(`scenario ${sk} step${i}: goto '${st.goto}' state 없음`);
      if (st.event && states[st.event]?.kind !== "animation")
        W(`scenario ${sk} step${i}: event '${st.event}'가 animation state 아님`);
      if (!st.goto && !st.event && !st.say) W(`scenario ${sk} step${i}: goto/event/say 모두 없음(빈 단계)`);
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

// 시나리오 목록 (뷰어 드롭다운용).
export function listScenarios(m) {
  return Object.entries(m.scenarios || {}).map(([id, sc]) => ({ id, label: sc.label || id, steps: sc.steps.length }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 포즈 그래프 — "앞뒤로 붙을 수 있는" 연속성
// ─────────────────────────────────────────────────────────────────────────────

// 포즈 노드 간 transition 엣지로 BFS. fromPose → toPose 의 transition 키 시퀀스(최단).
// 같은 포즈면 [] (전환 불요). 경로 없으면 null.
export function findTransitionPath(m, fromPose, toPose) {
  if (fromPose === toPose) return [];
  const transitions = Object.entries(m.transitions || {});
  const queue = [[fromPose, []]];
  const seen = new Set([fromPose]);
  while (queue.length) {
    const [pose, path] = queue.shift();
    for (const [key, t] of transitions) {
      if (t.entry_pose !== pose || seen.has(t.exit_pose)) continue;
      const next = [...path, key];
      if (t.exit_pose === toPose) return next;
      seen.add(t.exit_pose);
      queue.push([t.exit_pose, next]);
    }
  }
  return null;
}

// initial state에서 (포즈 경로로) 도달 가능한 state 키 집합.
export function reachableStates(m, startKey) {
  const states = m.states || {};
  const start = states[startKey];
  const reached = new Set();
  if (!start) return reached;
  // 시작 포즈에서 도달 가능한 모든 포즈 집합
  const poseReach = new Set([start.exit_pose, start.entry_pose]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of Object.values(m.transitions || {})) {
      if (poseReach.has(t.entry_pose) && !poseReach.has(t.exit_pose)) {
        poseReach.add(t.exit_pose);
        grew = true;
      }
    }
  }
  // entry_pose가 도달 가능 포즈에 있는 state = 도달 가능
  for (const [k, s] of Object.entries(states)) {
    if (poseReach.has(s.entry_pose)) reached.add(k);
  }
  reached.add(startKey);
  return reached;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 상태머신 — 런타임 (연출: 목표 state로 가는 transition 시퀀스 자동 계획)
// ─────────────────────────────────────────────────────────────────────────────
export class NvaStateMachine {
  constructor(manifest) {
    this.m = manifest;
    this.current = manifest.initial;
  }

  state(key = this.current) {
    return this.m.states[key];
  }

  // 목표 state로 가는 계획: { transitions: [transitionKey...], target }. 불가면 null.
  plan(targetKey) {
    const cur = this.m.states[this.current];
    const tgt = this.m.states[targetKey];
    if (!cur || !tgt) return null;
    const path = findTransitionPath(this.m, cur.exit_pose, tgt.entry_pose);
    if (path === null) return null;
    return { transitions: path, target: targetKey };
  }

  // 계획을 적용해 현재 state 갱신 (실제 재생은 player가 담당).
  commit(targetKey) {
    this.current = targetKey;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 재생 시퀀스 빌더 — 계획 → (클립, 종류) 목록. player가 그대로 재생.
// ─────────────────────────────────────────────────────────────────────────────
export function buildPlaybackSequence(m, plan) {
  const seq = [];
  for (const tk of plan.transitions) {
    const t = m.transitions[tk];
    seq.push({ kind: "transition", key: tk, clip: t.clip, loop: false });
  }
  const s = m.states[plan.target];
  seq.push({
    kind: s.kind,
    key: plan.target,
    clip: s.clip,
    loop: !!s.loop,
    can_talk: !!s.can_talk,
    face_bbox: s.face_bbox || null,
  });
  return seq;
}

// node CLI 검증용 (브라우저에선 무시).
export function summarize(result) {
  const lines = [];
  lines.push(result.ok ? "✅ VALID" : "❌ INVALID");
  for (const e of result.errors) lines.push("  ERROR  " + e);
  for (const w of result.warnings) lines.push("  WARN   " + w);
  return lines.join("\n");
}
