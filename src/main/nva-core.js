// nva-core ??naia video clip avatar ?袁⑤뾼???β돦裕뉐퐲?(??곗뒧???? + node ??얜???ESM) ??**nva v0.2**
//
// ?????嶺뚯쉳?닷퐲?IP: ???ч?????逾???熬곣뫀鍮??"???????熬곣뫚?꾢ㅇ???⑥쥓?鸚??戮?맋" = animations ?? + scenario ?잙갭梨???
// ??琉돠?0 (??戮?빢 JS). ???ｅ젆源놁??????椰꾨뗀竊?嶺뚯빘鍮볡뵳寃쇱쾸? ??ㅻ쾴????濡ル츎 NVA ??ｌ뫒??
//
// v0.2 嶺뚮ㅄ維??(states/transitions ?????:
//  - animations{}: ??筌???. ?????爰?= clip + entry/exit_pose + loop + can_talk + face_bbox.
//    ??リ턁筌?kind)???熬곣뫀援→뤆?쎛 ?熬곣뫀鍮??**?브퀗?ч뜮????????ル봾利?*:
//      嶺뚮씭???臾?= loop & can_talk / ???リ옇肄쏁뙴紐껉도??= loop & !can_talk / ??戮?츩嶺?= ????off
//      ?熬곥굦??  = entry_pose != exit_pose
//  - scenario{nodes,edges}: ?筌뤾퍓援??잙갭梨??? nodes[k]={type:"start"|"scene", animation, label, dwell_ms},
//    edges=[{from,to}]. start ?筌뤾퍓援→뤆?쎛 ?띠럾??洹먮뿪???嶺?scene = idle 嶺뚯쉳????
//  - ?꾩룇裕?? state_engine ?????깅さ嶺???⑤객臾띄솻?idle/body/head-viseme ???깅턄???餓???諛댁뎽 ??繹??類ｋ펲.
//    sentence-level speech clips are not canonical; state_engine drives speech.

export const NVA_VERSION = "0.2";
export const PRIMARY_GENERATED_STATES = ["neutral", "happy", "sad", "angry", "surprised", "thinking"];
// Held prototype only. The final talking-head transition keys are selected after RTX 3090 cascade benchmarking.
export const PROTOTYPE_HEAD_KEYS = ["sil", "a", "i", "u", "e", "o"];

// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// 0. ???臾??잙?裕??????
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
export function isTransition(a) {
  return (a?.entry_pose || "") !== (a?.exit_pose || "");
}

// ?브퀗?ч뜮? ????リ턁筌???怨뚮낵 (UI ??蹂β뵛??.
export function animKind(a) {
  if (isTransition(a)) return "transition";
  if (a.loop && a.can_talk) return "talking";
  if (a.loop) return "idle";
  return "gesture";
}

// scenario start ??嶺?scene ??ル봾鍮?(idle 嶺뚯쉳??????ルㅎ臾???⑥ろ맖??戮곕쭊).
export function scenarioStartAnim(m) {
  const nodes = m.scenario?.nodes || {};
  const edges = m.scenario?.edges || [];
  const sk = Object.keys(nodes).find((k) => nodes[k].type === "start");
  if (!sk) return null;
  const nx = edges.find((e) => e.from === sk)?.to;
  return nx && nodes[nx] ? nodes[nx].animation : null;
}

// ??뚮뿭援??β돦裕???筌뤿굞?????臾??熬곣뫀援?idle/talking/listening/events).
export function derive(m) {
  const anims = m.animations || {};
  const stateEngine = buildDefaultStatePlan(m);
  const isBase = (a) => a.loop && !isTransition(a);
  const start = scenarioStartAnim(m);
  const pick = (pred) => {
    if (start && anims[start] && pred(anims[start])) return start;
    return Object.keys(anims).find((k) => pred(anims[k])) || null;
  };
  const idleKey = pick((a) => isBase(a) && !a.can_talk);
  const talkKey = pick((a) => isBase(a) && a.can_talk);
  const events = Object.fromEntries(
    Object.entries(anims)
      .filter(([, a]) => !a.loop || isTransition(a))
      .map(([k, a]) => [k, a.clip]),
  );
  return {
    idleKey,
    talkKey,
    listeningKey: idleKey, // v0.2 ???곌랙?х뙴?listening ?띠룇裕????怨몃쾳 ??idle ??亦??
    events,
    idle: anims[idleKey],
    talking: anims[talkKey],
    stateEngine,
  };
}

export function buildDefaultStatePlan(m, stateKey = null) {
  const engine = m?.state_engine;
  const states = engine?.states || {};
  const key = stateKey && states[stateKey] ? stateKey : engine?.default_state;
  if (!key || !states[key]) return null;
  const state = states[key];
  return {
    state: key,
    idle: state.idle || "",
    talking_body: state.talking_body || "",
    face_bbox: state.face_bbox || null,
    face_preview: state.face_preview || "",
    talking_head_crop: !!state.talking_head_crop,
    talking_heads: { ...(state.talking_heads || {}) },
    sync: state.sync || engine.sync || {},
    visemes: Array.isArray(engine.visemes) && engine.visemes.length ? engine.visemes : Object.keys(state.talking_heads || {}),
  };
}

export function listStateEngineAssets(m) {
  const out = [];
  const states = m?.state_engine?.states || {};
  for (const [stateKey, state] of Object.entries(states)) {
    if (state.idle) out.push({ role: `state_engine.${stateKey}.idle`, path: state.idle });
    if (state.talking_body) out.push({ role: `state_engine.${stateKey}.talking_body`, path: state.talking_body });
    if (state.face_preview) out.push({ role: `state_engine.${stateKey}.face_preview`, path: state.face_preview });
    for (const [viseme, path] of Object.entries(state.talking_heads || {})) {
      if (path) out.push({ role: `state_engine.${stateKey}.talking_heads.${viseme}`, path });
    }
  }
  return out;
}

export function buildStateSpeechPlan(m, text = "", stateKey = null, timelineInput = {}) {
  const plan = buildDefaultStatePlan(m, stateKey);
  if (!plan || !plan.talking_body) return null;
  const required = plan.visemes.length ? plan.visemes : Object.keys(plan.talking_heads || {});
  if (!required.length) return null;
  const syncHeads = plan.sync?.heads || {};
  const missing = required.filter((v) => !plan.talking_heads[v] || !syncHeads[v]);
  if (missing.length) return null;
  const timeline = buildTtsVisemeTimeline({ ...timelineInput, text, visemes: required, sync: plan.sync });
  const sequence = timeline.map((item) => item.viseme);
  return { ...plan, text, sequence: sequence.length ? sequence : required, timeline };
}

export function extractProsodyTags(text = "") {
  const out = [];
  const re = /\[([a-z][a-z0-9_-]*)\]/gi;
  let m;
  while ((m = re.exec(String(text || "")))) {
    out.push({ tag: m[1].toLowerCase(), index: m.index, raw: m[0] });
  }
  return out;
}

export function stripProsodyTags(text = "") {
  return String(text || "").replace(/\[[a-z][a-z0-9_-]*\]/gi, "").replace(/\s+/g, " ").trim();
}

export function routeProsodyState(manifest, text = "", fallbackState = null) {
  const states = manifest?.state_engine?.states || {};
  const defaultState = fallbackState && states[fallbackState] ? fallbackState : manifest?.state_engine?.default_state;
  const cleanText = stripProsodyTags(text);
  for (const item of extractProsodyTags(text)) {
    const route = manifest?.prosody_map?.[item.tag];
    if (route?.state && states[route.state]) {
      return { state: route.state, tag: item.tag, route, cleanText };
    }
  }
  return { state: defaultState && states[defaultState] ? defaultState : Object.keys(states)[0] || null, tag: null, route: null, cleanText };
}

export function textToViseme(ch, visemes) {
  const available = new Set(visemes || []);
  const map = {
    a: "a", i: "i", u: "u", e: "e", o: "o",
    "\uC544": "a", "\uC774": "i", "\uC6B0": "u", "\uC73C": "u",
    "\uC5D0": "e", "\uC560": "e", "\uC624": "o", "\uC5B4": "o",
  };
  const v = map[String(ch || "").toLowerCase()];
  if (v && available.has(v)) return v;
  return available.has("sil") ? "sil" : [...available][0] || "sil";
}

export function buildTtsVisemeTimeline(input = {}) {
  const text = String(input.text || "");
  const visemes = Array.isArray(input.visemes) && input.visemes.length ? input.visemes : ["sil", "a", "i", "u", "e", "o"];
  const sync = input.sync || {};
  const defaultHold = Number(sync.default_hold_ms || 160);
  const timeline = [];
  if (Array.isArray(input.phonemes) && input.phonemes.length) {
    for (const p of input.phonemes) {
      const t = Number(p.t_ms ?? p.time_ms ?? p.start_ms ?? 0);
      const v = p.viseme || textToViseme(p.phoneme || p.value || "", visemes);
      if (visemes.includes(v)) timeline.push({ t_ms: Math.max(0, t), viseme: v, source: "phoneme" });
    }
  } else if (Array.isArray(input.boundaries) && input.boundaries.length) {
    for (const b of input.boundaries) {
      const index = Number(b.charIndex ?? b.char_index ?? b.index ?? 0);
      const t = Number(b.elapsedTimeMs ?? b.elapsed_ms ?? b.t_ms ?? (Number(b.elapsedTime || 0) * 1000));
      timeline.push({ t_ms: Math.max(0, t), viseme: textToViseme(text.charAt(index), visemes), source: "boundary" });
    }
  } else {
    let t = 0;
    if (visemes.includes("sil")) timeline.push({ t_ms: 0, viseme: "sil", source: "text" });
    t += defaultHold;
    for (const ch of text) {
      const v = textToViseme(ch, visemes);
      if (v !== "sil" || !timeline.length) {
        timeline.push({ t_ms: t, viseme: v, source: "text" });
        t += defaultHold;
      }
    }
    if (timeline.length < 3) {
      for (const v of visemes.filter((x) => x !== "sil").slice(0, 5)) {
        timeline.push({ t_ms: t, viseme: v, source: "fallback" });
        t += defaultHold;
      }
    }
    if (visemes.includes("sil")) timeline.push({ t_ms: t, viseme: "sil", source: "text" });
  }
  timeline.sort((a, b) => a.t_ms - b.t_ms);
  return timeline.length ? timeline : [{ t_ms: 0, viseme: visemes[0] || "sil", source: "fallback" }];
}

export function visemeAtTime(timeline, elapsedMs) {
  const list = Array.isArray(timeline) ? timeline : [];
  let cur = list[0]?.viseme || "sil";
  for (const item of list) {
    if (Number(item.t_ms || 0) > elapsedMs) break;
    cur = item.viseme || cur;
  }
  return cur;
}
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// 1. v0.1 ??v0.2 ???吏?嶺뚮씭??議용돥筌뤾퍔???怨력?(??.nva ??????筌뤿굞??
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
export function migrateToV02(m) {
  if (!m || m.nva_version === "0.2") return m;
  if (m.nva_version !== "0.1") return m; // ???????⑸츎 ?뺢퀗???? ?잙갭梨???

  const animations = {};
  for (const [k, s] of Object.entries(m.states || {})) {
    animations[k] = {
      clip: s.clip,
      entry_pose: s.entry_pose,
      exit_pose: s.exit_pose,
      loop: !!s.loop,
      can_talk: !!s.can_talk,
      // face_bbox = [x,y,w,h] 嶺뚯쉳??쾮?μ쾸?雅?굝??? ?誘⑹굡????⑤챶?? ???裕?[x,y,l] ?筌먦끆?€뤆???瑜곷쭊?筌뤿굞?? ???잙갭梨????곌랜???
      ...(Array.isArray(s.face_bbox) ? { face_bbox: s.face_bbox } : {}),
      label: s.label || k,
    };
  }
  for (const [k, t] of Object.entries(m.transitions || {})) {
    animations[k] = {
      clip: t.clip,
      entry_pose: t.entry_pose,
      exit_pose: t.exit_pose,
      loop: false,
      can_talk: false,
      label: t.label || k,
    };
  }

  // scenarios(steps) ??scenario(nodes/edges): 嶺???類?룎?洹먮봿沅????ル쪇援??잙갭梨??熬곣뫁夷?
  const nodes = { start: { type: "start", label: "start" } };
  const edges = [];
  const firstScn = Object.values(m.scenarios || {})[0];
  let prev = "start";
  let i = 0;
  if (firstScn) {
    for (const st of firstScn.steps || []) {
      const anim = st.goto || st.event;
      if (!anim) continue;
      const nid = "n" + i++;
      nodes[nid] = {
        type: "scene",
        animation: anim,
        label: st.say || anim,
        ...(st.dwell_ms ? { dwell_ms: st.dwell_ms } : {}),
      };
      edges.push({ from: prev, to: nid });
      prev = nid;
    }
  } else if (m.initial) {
    nodes["n0"] = { type: "scene", animation: m.initial, label: "idle" };
    edges.push({ from: "start", to: "n0" });
  }

  const out = {
    nva_version: "0.2",
    meta: m.meta || {},
    canvas: m.canvas || { width: 720, height: 1280, fps: 25 },
    background: m.background || { type: "transparent" },
    poses: m.poses || [],
    animations,
    scenario: { nodes, edges },
  };
  if (m.chroma_key) out.chroma_key = m.chroma_key;
  return out;
}

// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// 2. ?롪틵?嶺?(validator)
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
export function validateManifest(m, opts = {}) {
  const errors = [];
  const warnings = [];
  const assetPaths = new Set(opts.clipFiles || opts.assetFiles || []);
  const E = (s) => errors.push(s);
  const W = (s) => warnings.push(s);

  if (!m || typeof m !== "object") return { ok: false, errors: ["manifest must be an object"], warnings };
  if (m.nva_version !== "0.2") E(`nva_version must be 0.2 (current: ${m.nva_version})`);
  if (!m.canvas || !(m.canvas.width > 0) || !(m.canvas.height > 0)) E("canvas.width/height required");

  const anims = m.animations || {};
  const animKeys = Object.keys(anims);
  if (animKeys.length === 0) E("animations required");
  const poses = new Set(m.poses || []);
  const useVocab = poses.size > 0;
  const checkPose = (where, p) => {
    if (!p) return;
    if (useVocab && !poses.has(p)) W(`${where}: pose '${p}' not in poses`);
  };
  for (const [k, a] of Object.entries(anims)) {
    if (!a.clip) E(`animation ${k}: clip required`);
    if (a.entry_pose) checkPose(`animation ${k}.entry_pose`, a.entry_pose);
    if (a.exit_pose) checkPose(`animation ${k}.exit_pose`, a.exit_pose);
    if (a.can_talk) {
      if (!Array.isArray(a.face_bbox) || (a.face_bbox.length !== 3 && a.face_bbox.length !== 4)) E(`animation ${k}: face_bbox required when can_talk=true`);
      else if (a.face_bbox.some((v) => v < 0 || v > 1)) E(`animation ${k}: face_bbox must be 0..1`);
    }
    if (assetPaths.size && a.clip && !assetPaths.has(a.clip)) E(`animation ${k}: missing asset ${a.clip}`);
  }
  const seenLabels = new Map();
  for (const [k, a] of Object.entries(anims)) {
    const lb = (a.label || "").trim();
    if (!lb) continue;
    if (seenLabels.has(lb)) E(`animation ${k}: duplicate label '${lb}' with ${seenLabels.get(lb)}`);
    else seenLabels.set(lb, k);
  }
  const hasIdle = Object.values(anims).some((a) => a.loop && !isTransition(a) && !a.can_talk);
  const hasTalk = Object.values(anims).some((a) => a.loop && !isTransition(a) && a.can_talk);

  if (animKeys.length && !hasIdle) W("legacy idle loop missing");
  if (animKeys.length && !hasTalk && !m.state_engine) W("legacy talking loop missing");

  if (m["prebaked" + "_speech"]) E("sentence-level speech cache is not allowed in portable NVA");
  if (m.vrm_slots?.["speech"]) E("legacy speech slot map is not allowed in portable NVA");
  if (m["viseme" + "_clips"]) E("top-level viseme clip map is not allowed in portable NVA");
  if (m["audio" + "_path"]) E("cached audio path is not allowed in portable NVA");

  const slots = m.vrm_slots;
  if (slots) {
    const allowedSlotKeys = new Set(["idle", "talk", "listening", "events", "profile", "expressions", "motions"]);
    for (const key of Object.keys(slots)) if (!allowedSlotKeys.has(key)) E(`vrm_slots.${key} is not allowed in portable NVA`);
    const expressions = slots.expressions || {};
    const motions = slots.motions || {};
    const profile = slots.profile || {};
    const availableLocales = new Set(profile.available_locales || profile.locales || []);
    if (profile.default_expression && !expressions[profile.default_expression]) E(`vrm_slots.profile.default_expression missing: ${profile.default_expression}`);
    if (profile.default_motion && !motions[profile.default_motion]) E(`vrm_slots.profile.default_motion missing: ${profile.default_motion}`);
    if (profile.default_locale && availableLocales.size && !availableLocales.has(profile.default_locale)) E(`vrm_slots.profile.default_locale not available: ${profile.default_locale}`);
    for (const [k, v] of Object.entries(expressions)) if (v.animation && !anims[v.animation]) E(`vrm_slots.expressions.${k}: animation missing ${v.animation}`);
    if (slots["visemes"]) E("legacy viseme slot map is not allowed in portable NVA; use state_engine pronunciation heads");
  }

  const engine = m.state_engine;
  if (!engine) {
    E("state_engine required");
  } else {
    const states = engine.states || {};
    const visemes = PROTOTYPE_HEAD_KEYS;
    const defaultState = engine.default_state || Object.keys(states)[0];
    const generatedPrimarySet = !!m.asset_quality || m.vrm_slots?.profile?.generation_mode === "state_engine_pronunciation_video_cache" || opts.requirePrimaryStateSet;
    if (!defaultState || !states[defaultState]) E(`state_engine.default_state missing: ${defaultState}`);
    if (!Array.isArray(engine.visemes) || PROTOTYPE_HEAD_KEYS.some((v) => !engine.visemes.includes(v))) E(`held prototype state_engine.visemes must include: ${PROTOTYPE_HEAD_KEYS.join("/")}`);
    if (generatedPrimarySet) {
      const actualStates = Object.keys(states).sort();
      const expectedStates = [...PRIMARY_GENERATED_STATES].sort();
      for (const stateKey of expectedStates) if (!states[stateKey]) E(`state_engine.states.${stateKey}: primary generated state required`);
      for (const stateKey of actualStates) if (!PRIMARY_GENERATED_STATES.includes(stateKey)) E(`state_engine.states.${stateKey}: not allowed in primary generated state set`);
    }
    for (const [stateKey, state] of Object.entries(states)) {
      if (!state.idle) E(`state_engine.states.${stateKey}: idle required`);
      if (!state.talking_body) E(`state_engine.states.${stateKey}: talking_body required`);
      if (!state.face_preview) E(`state_engine.states.${stateKey}: face_preview required`);
      if (!state.talking_heads || typeof state.talking_heads !== "object") E(`state_engine.states.${stateKey}: talking_heads required`);
      else for (const viseme of visemes) if (!state.talking_heads[viseme]) E(`state_engine.states.${stateKey}.talking_heads.${viseme}: clip required`);
      if (!state.sync || typeof state.sync !== "object") E(`state_engine.states.${stateKey}: sync required`);
      else {
        if (!(Number(state.sync.default_hold_ms) > 0)) E(`state_engine.states.${stateKey}.sync.default_hold_ms required`);
        const heads = state.sync.heads || {};
        for (const viseme of visemes) {
          const meta = heads[viseme];
          if (!meta || typeof meta !== "object") E(`state_engine.states.${stateKey}.sync.heads.${viseme} required`);
          else {
            if (!(Number(meta.fps) > 0)) E(`state_engine.states.${stateKey}.sync.heads.${viseme}.fps required`);
            if (!(Number(meta.duration_ms) > 0)) E(`state_engine.states.${stateKey}.sync.heads.${viseme}.duration_ms required`);
            if (typeof meta.loopable !== "boolean") E(`state_engine.states.${stateKey}.sync.heads.${viseme}.loopable required`);
          }
        }
      }
      if (!Array.isArray(state.face_bbox) || state.face_bbox.length !== 4) E(`state_engine.states.${stateKey}: face_bbox [x,y,w,h] required`);
      else if (state.face_bbox.some((v) => v < 0 || v > 1)) E(`state_engine.states.${stateKey}: face_bbox must be 0..1`);
      if (opts.requireStateSpecificAssets && state.idle === state.talking_body) E(`state_engine.states.${stateKey}: idle and talking_body must be separate assets`);
    }
    if (assetPaths.size) {
      for (const asset of listStateEngineAssets(m)) if (asset.path && !assetPaths.has(asset.path)) E(`${asset.role}: missing asset ${asset.path}`);
    }
  }
  for (const [tag, route] of Object.entries(m.prosody_map || {})) {
    if (!route || typeof route !== "object") E(`prosody_map.${tag}: route object required`);
    else if (route.state && !m.state_engine?.states?.[route.state]) E(`prosody_map.${tag}: state missing ${route.state}`);
  }

  const scen = m.scenario || {};
  const nodes = scen.nodes || {};
  const nodeKeys = Object.keys(nodes);
  if (nodeKeys.length) {
    let starts = 0;
    for (const [k, n] of Object.entries(nodes)) {
      if (n.type === "start") starts++;
      else if (!n.animation) E(`scenario node ${k}: animation required`);
      else if (!anims[n.animation]) E(`scenario node ${k}: animation missing ${n.animation}`);
    }
    if (starts === 0) W("scenario start node missing");
    if (starts > 1) E("scenario must have at most one start node");
    for (const e of scen.edges || []) {
      if (!e.from || !e.to) E("scenario edge from/to required");
      else {
        if (!nodes[e.from]) E(`scenario edge from missing ${e.from}`);
        if (!nodes[e.to]) E(`scenario edge to missing ${e.to}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
export function listScenarios(m) {
  const scen = m.scenario;
  if (!scen || !scen.nodes) return [];
  const scenes = Object.values(scen.nodes).filter((n) => n.type !== "start").length;
  return [{ id: "scenario", label: "scenario", steps: scenes }];
}

// scenario ?잙갭梨??熬? start ?遊붋??edge ??⑤벡逾???ル쪇援??꾩렮維뽪룇 ??戮?맋????轅명돦??(亦껋꼶梨?怨?돦??⒱뵛 ??繹??.
export function scenarioPlayOrder(m) {
  const nodes = m.scenario?.nodes || {};
  const edges = m.scenario?.edges || [];
  const start = Object.keys(nodes).find((k) => nodes[k].type === "start");
  if (!start) return [];
  const order = [];
  const seen = new Set();
  let cur = start;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const n = nodes[cur];
    if (n && n.type !== "start" && n.animation)
      order.push({ animation: n.animation, say: n.label, dwell_ms: n.dwell_ms });
    cur = edges.find((e) => e.from === cur)?.to;
  }
  return order;
}

// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// 4. ??繹????궰?????嶺뚮ㅄ維싷쭗???ル봾鍮띶슖??띠럾????熬곥굦?????吏?????엷 (??藥???⑥リ틭??.
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

// entry/exit pose ???熬곥굦????ル봾鍮?is_transition) ??BFS. fromPose ??toPose 嶺뚣끉裕???????궰???
export function findTransitionPath(m, fromPose, toPose) {
  if (fromPose === toPose) return [];
  const trans = Object.entries(m.animations || {}).filter(([, a]) => isTransition(a));
  const queue = [[fromPose, []]];
  const seen = new Set([fromPose]);
  while (queue.length) {
    const [pose, path] = queue.shift();
    for (const [key, a] of trans) {
      if (a.entry_pose !== pose || seen.has(a.exit_pose)) continue;
      const next = [...path, key];
      if (a.exit_pose === toPose) return next;
      seen.add(a.exit_pose);
      queue.push([a.exit_pose, next]);
    }
  }
  return null;
}

// ???????⑤객臾?誘⑹굣?????熬곣뫗????ル봾鍮??exit_pose ?????嶺뚮ㅄ維싷쭗???ル봾鍮??entry_pose ???熬곥굦????ｌ뫓??
export class NvaRuntime {
  constructor(manifest) {
    this.m = manifest;
    const d = derive(manifest);
    this.current = d.idleKey || Object.keys(manifest.animations || {})[0] || null;
  }

  anim(key = this.current) {
    return this.m.animations?.[key];
  }

  // 嶺뚮ㅄ維싷쭗???ル봾鍮띶슖??띠럾?????ｌ뫓?? { transitions:[key...], target }. ?釉띾쐝?嶺?null.
  plan(targetKey) {
    const cur = this.anim(this.current);
    const tgt = this.anim(targetKey);
    if (!tgt) return null;
    const path = findTransitionPath(this.m, cur?.exit_pose ?? tgt.entry_pose, tgt.entry_pose);
    if (path === null) return null;
    return { transitions: path, target: targetKey };
  }

  commit(targetKey) {
    this.current = targetKey;
  }
}

// ??ｌ뫓????(????? loop, can_talk, face_bbox) ???궰??? player ?띠럾? ?잙갭梨?????繹?
export function buildPlaybackSequence(m, plan) {
  const seq = [];
  for (const tk of plan.transitions) {
    const a = m.animations[tk];
    seq.push({ key: tk, clip: a.clip, loop: false, can_talk: false, face_bbox: null });
  }
  const a = m.animations[plan.target];
  seq.push({
    key: plan.target,
    clip: a.clip,
    loop: !!a.loop,
    can_talk: !!a.can_talk,
    face_bbox: a.face_bbox || null,
  });
  return seq;
}

// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
// 5. CLI ??븐슜??
// ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
export function summarize(result) {
  const lines = [];
  lines.push(result.ok ? "VALID" : "INVALID");
  for (const e of result.errors) lines.push("  ERROR  " + e);
  for (const w of result.warnings) lines.push("  WARN   " + w);
  return lines.join("\n");
}
