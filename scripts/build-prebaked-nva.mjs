#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "../src/main/nva-core.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NAIA_SHELL_14 = [
  "ko-KR",
  "en-US",
  "ja-JP",
  "zh-CN",
  "fr-FR",
  "de-DE",
  "ru-RU",
  "es-ES",
  "ar-SA",
  "hi-IN",
  "bn-BD",
  "pt-BR",
  "id-ID",
  "vi-VN",
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

function runQuiet(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed\n${r.stderr}`);
  return r.stdout.trim();
}

function extractZip(zipPath, outDir) {
  if (process.platform === "win32") {
    const safeZip = zipPath.replaceAll("'", "''");
    const safeOut = outDir.replaceAll("'", "''");
    run("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${safeZip}' -DestinationPath '${safeOut}' -Force`]);
    return;
  }
  run("unzip", ["-o", zipPath, "-d", outDir]);
}

function listFilesText(root, maxDepth = 2) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, depth + 1);
      else out.push(p);
    }
  };
  walk(root, 0);
  return out.join("\n");
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function inferCharacter(source) {
  const s = source.toLowerCase();
  if (s.includes("naia")) return "naia";
  if (s.includes("alpha")) return "alpha";
  return "osarang";
}

function copyRequiredExpressionAssets(expressionSourceDir, expressionDir, expressions) {
  if (!expressionSourceDir) {
    throw new Error("real expression assets required: pass --expression-dir with neutral/happy/sad/angry/surprised/thinking PNG files");
  }
  const srcDir = resolve(ROOT, expressionSourceDir);
  for (const [key] of expressions) {
    const src = join(srcDir, `${key}.png`);
    if (!existsSync(src)) throw new Error(`missing expression asset: ${src}`);
    cpSync(src, join(expressionDir, `${key}.png`));
  }
}

function copyRequiredStateAssets(stateSourceDir, clipsDir, expressions, visemes) {
  if (!stateSourceDir) {
    throw new Error("real state video assets required: pass --state-asset-dir with {state}/idle.webm, {state}/talking-body.webm, and {state}/head-{viseme}.webm");
  }
  const srcDir = resolve(ROOT, stateSourceDir);
  for (const [key] of expressions) {
    const stateDir = join(clipsDir, key);
    mkdirSync(stateDir, { recursive: true });
    for (const name of ["idle.webm", "talking-body.webm", ...visemes.map((v) => `head-${v}.webm`)]) {
      const src = join(srcDir, key, name);
      if (!existsSync(src)) throw new Error(`missing state video asset: ${src}`);
      cpSync(src, join(stateDir, name));
    }
  }
}

function characterConfig(key) {
  if (key === "naia") {
    return {
      displayName: "Naia (VRM??????NVA)",
      ownerLine: "Naia",
      defaultLocale: "ko-KR",
      generatedLocales: ["ko-KR", "en-US"],
      utterances: [
        ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "???????€??????e???? ?????????????????????k?????????.", "en-US": "Hello. I am Naia." }],
        ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "????????????????????? ??????????????", "en-US": "What shall we work on together?" }],
        ["local_privacy", "guiding", "a", "guide", { "ko-KR": "???????????????????????€?????????????????????????????????T?????????????????????????????k????", "en-US": "I will keep supported work safely on this computer." }],
        ["thinking_wait", "thinking", "eu", "thinking", { "ko-KR": "?????????????€?????????? ??????????????????????????????????????€?????", "en-US": "One moment. I am checking the context." }],
        ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "???????????? ??????????????????€????? ???????????????????????????????????????????????????", "en-US": "That part can be frustrating. I will sort it out step by step." }],
        ["thanks_close", "happy", "o", "closing", { "ko-KR": "??????€??? ????????????????????????T??????????????????????????????????????????????", "en-US": "Good. I can continue whenever you need help." }],
      ],
    };
  }
  if (key === "alpha") {
    return {
      displayName: "Alpha (VRM??????NVA)",
      ownerLine: "Alpha",
      defaultLocale: "ko-KR",
      generatedLocales: ["ko-KR", "en-US"],
      utterances: [
        ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "???????€??????e???? ??????????????????", "en-US": "Hello. I am Alpha." }],
        ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "??????????????????k????", "en-US": "What should I inspect?" }],
        ["analysis", "thinking", "eu", "thinking", { "ko-KR": "???????????????????????????????????????????????????????€???????????????????????.", "en-US": "I will break down the situation and set priorities." }],
        ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "????????????????????????€???????????????????????????????????????", "en-US": "I will check the concerning part first." }],
        ["thanks_close", "happy", "o", "closing", { "ko-KR": "????????????????????????. ?????T???????????????????????????????????????????", "en-US": "Confirmed. I will move to the next step." }],
      ],
    };
  }
  return {
    displayName: "????????(VRM??????NVA)",
    ownerLine: "Osarang",
    defaultLocale: "ko-KR",
    generatedLocales: ["ko-KR", "en-US"],
    utterances: [
      ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "???????€??????e???? ?????????€m??????????????????????????????????????.", "en-US": "Hello. I am Osarang, your Gangnam-gu office guide." }],
      ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "????????????????????????????????", "en-US": "How may I help you?" }],
      ["office_location", "guiding", "a", "guide", { "ko-KR": "??????????? ???????? 2????????€????????????????.", "en-US": "The civil affairs office is on the second floor of the main building." }],
      ["thinking_wait", "thinking", "eu", "thinking", { "ko-KR": "?????????????€?????????????????????????? ????????????????????????????", "en-US": "Please wait a moment. I will check that for you." }],
      ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "?????????????????€??????????????? ??? ????????????????????????????????????????????????????", "en-US": "I am sorry for the inconvenience. I will guide you step by step." }],
      ["thanks_close", "happy", "o", "closing", { "ko-KR": "??????????????????? ??????€? ???????????????????????????", "en-US": "Thank you. Have a good day." }],
    ],
  };
}


function main() {
  const source = resolve(ROOT, arg("--source", "examples/osarang.nva.zip"));
  const outDir = resolve(ROOT, arg("--out", "examples/osarang-prebaked.nva"));
  const character = arg("--character", inferCharacter(source));
  const config = characterConfig(character);
  const expressionSourceDir = arg("--expression-dir", null);
  const stateSourceDir = arg("--state-asset-dir", null);
  const generatedLocales = (arg("--locales", config.generatedLocales.join(",")) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const force = process.argv.includes("--force");

  if (!existsSync(source)) throw new Error(`source not found: ${source}`);
  if (existsSync(outDir)) {
    if (!force) throw new Error(`out exists: ${outDir} (use --force)`);
    rmSync(outDir, { recursive: true, force: true });
  }

  const tmp = join(outDir, ".tmp");
  const clips = join(outDir, "clips");
  const expressionDir = join(outDir, "expressions");
  mkdirSync(clips, { recursive: true });
  mkdirSync(expressionDir, { recursive: true });
  mkdirSync(tmp, { recursive: true });

  if (source.endsWith(".zip")) extractZip(source, tmp);
  else cpSync(source, tmp, { recursive: true });
  const baseManifest = JSON.parse(readFileSync(join(tmp, "manifest.json"), "utf8"));
  const bodyClip = arg("--body", baseManifest.animations?.speak?.clip || baseManifest.animations?.idle?.clip);
  if (!bodyClip) throw new Error("body clip not found: pass --body clips/name.webm");
  const bodySrc = join(tmp, bodyClip);
  const bodyOut = join(clips, "body.webm");
  cpSync(bodySrc, bodyOut);
  const sourceIdleClip = baseManifest.animations?.idle?.clip || bodyClip;
  const sourceIdleSrc = join(tmp, sourceIdleClip);
  const sourceIdleRel = `clips/${basename(sourceIdleClip || "source-idle.webm")}`;
  if (sourceIdleClip && existsSync(sourceIdleSrc)) cpSync(sourceIdleSrc, join(outDir, sourceIdleRel));

  const expressions = [
    ["neutral", "neutral", "0x1f2937", "calm"],
    ["happy", "happy", "0x16a34a", "joy"],
    ["thinking", "thinking", "0x2563eb", "thinking"],
    ["surprised", "surprised", "0xdc2626", "surprise"],
    ["sad", "sad", "0x334155", "sad"],
    ["angry", "angry", "0xb91c1c", "angry"],
  ];
  const prosodyMap = {
    laughing: { state: "happy", mode: "talking" },
    laugh: { state: "happy", mode: "talking" },
    laughter: { state: "happy", mode: "talking" },
    chuckle: { state: "happy", mode: "talking" },
    giggle: { state: "happy", mode: "talking" },
    cheer: { state: "happy", mode: "talking" },
    sigh: { state: "sad", mode: "talking" },
    exhale: { state: "sad", mode: "talking" },
    cry: { state: "sad", mode: "talking" },
    sob: { state: "sad", mode: "talking" },
    hesitation: { state: "thinking", mode: "talking" },
    pause: { state: "thinking", mode: "talking" },
    hum: { state: "thinking", mode: "talking" },
    gasp: { state: "surprised", mode: "talking" },
    shout: { state: "angry", mode: "talking" },
    whisper: { state: "neutral", mode: "talking", voice: "soft" },
    breath: { state: "neutral", mode: "talking" },
    inhale: { state: "neutral", mode: "talking" },
    cough: { state: "neutral", mode: "talking" },
    sneeze: { state: "neutral", mode: "talking" },
    sniff: { state: "neutral", mode: "talking" },
    yawn: { state: "neutral", mode: "talking" },
    moan: { state: "neutral", mode: "talking" },
  };
  copyRequiredExpressionAssets(expressionSourceDir, expressionDir, expressions);
  const prototypeHeadKeys = ["sil", "a", "i", "u", "e", "o"];
  copyRequiredStateAssets(stateSourceDir, clips, expressions, prototypeHeadKeys);
  const faceBbox = [0.32, 0.07, 0.36, 0.2];
  const engineStates = expressions.map(([key, label]) => [key, label]);
  const stateEngine = {
    version: "0.1",
    default_state: "neutral",
    visemes: prototypeHeadKeys,
    states: Object.fromEntries(
      engineStates.map(([key, label]) => [
        key,
        {
          label,
          idle: `clips/${key}/idle.webm`,
          talking_body: `clips/${key}/talking-body.webm`,
          face_bbox: faceBbox.length === 4 ? faceBbox : [faceBbox[0], faceBbox[1], faceBbox[2], faceBbox[2]],
          face_preview: `expressions/${key}.png`,
          talking_head_crop: true,
          talking_heads: Object.fromEntries(prototypeHeadKeys.map((v) => [v, `clips/${key}/head-${v}.webm`])),
          sync: {
            default_hold_ms: 160,
            heads: Object.fromEntries(prototypeHeadKeys.map((v) => [v, {
              fps: 25,
              duration_ms: 1200,
              loopable: true,
              hold_min_ms: 80,
              hold_max_ms: 240,
              mouth_peak_ms: v === "sil" ? 0 : 120,
            }])),
          },
        },
      ]),
    ),
  };
  const animations = {
    idle: {
      clip: sourceIdleRel,
      loop: true,
      can_talk: false,
      face_bbox: faceBbox,
      label: "idle",
      description: "Original source idle loop preserved separately from generated state speech assets.",
      state: "neutral",
      expression_image: "expressions/neutral.png",
    },
    speak: {
      clip: "clips/body.webm",
      loop: true,
      can_talk: false,
      face_bbox: faceBbox,
      label: "legacy speak",
      description: "Legacy compatibility entry. The held speech prototype uses state_engine talking-head assets.",
      state: "neutral",
      expression_image: "expressions/neutral.png",
    },
  };

  for (const [key, label] of expressions.slice(1)) {
    animations[`state-${key}`] = {
      clip: "clips/body.webm",
      loop: true,
      can_talk: false,
      face_bbox: faceBbox,
      label,
      description: `${label} state preview. The held speech prototype uses state_engine.`,
      state: key,
      expression_image: `expressions/${key}.png`,
    };
  }
  for (const [key, anim] of Object.entries(baseManifest.animations || {})) {
    if (!key.startsWith("gesture-") || !anim?.clip) continue;
    const src = join(tmp, anim.clip);
    const dstRel = `clips/${basename(anim.clip)}`;
    if (existsSync(src)) cpSync(src, join(outDir, dstRel));
    animations[key] = {
      clip: dstRel,
      loop: false,
      can_talk: false,
      label: anim.label || key,
      description: anim.description || "Original gesture preserved separately from generated states.",
    };
  }
  const vrmSlots = {
    profile: {
      model: "nva-vrm-slots-0.1",
      compatibility: "VRM-style expression/viseme/motion slots. The held speech prototype uses state_engine talking-head assets.",
      generation_mode: "state_engine_pronunciation_video_cache",
      default_locale: config.defaultLocale,
      available_locales: generatedLocales,
      default_expression: "neutral",
      default_motion: "idle",
    },
    expressions: Object.fromEntries(
      expressions.map(([key, label, , mood]) => [
        key,
        {
          label,
          mood,
          type: "expression",
          preview_image: `expressions/${key}.png`,
          animation: key === "neutral" ? "idle" : `state-${key}`,
        },
      ]),
    ),
    motions: {
      idle: {
        label: "idle",
        type: "idle",
        clip: sourceIdleRel,
        loop: true,
        expression: "neutral",
      },
      talking: {
        label: "legacy talking",
        type: "talking",
        clip: "clips/body.webm",
        loop: true,
        expression: "neutral",
      },
      ...Object.fromEntries(
        Object.entries(animations)
          .filter(([key, anim]) => key.startsWith("gesture-") && anim?.clip)
          .map(([key, anim]) => [key, {
            label: anim.label || key,
            type: "gesture",
            clip: anim.clip,
            loop: false,
          }]),
      ),
    },
  };
  const manifest = {
    ...baseManifest,
    meta: {
      ...baseManifest.meta,
      name: config.displayName,
      note:
        "VRM??expression/viseme/motion/speech ?????webm ??????????????????????NVA ??????? ??????? ?????? ??? AI ????????????????????????????webm??????????????",
    },
    animations,
    state_engine: stateEngine,
    prosody_map: prosodyMap,
    vrm_slots: vrmSlots,
    expression_states: Object.fromEntries(
      expressions.map(([key, label, , mood]) => [
        key,
        { label, mood, image: `expressions/${key}.png`, animation: key === "neutral" ? "idle" : `state-${key}` },
      ]),
    ),
    scenario: {
      nodes: {
        start: { type: "start", label: "start" },
        n0: { type: "scene", animation: "idle", label: "idle" },
      },
      edges: [{ from: "start", to: "n0" }],
    },
  };

  writeJson(join(outDir, "manifest.json"), manifest);
  const result = validateManifest(manifest);
  if (!result.ok) throw new Error(`generated manifest invalid:\n${result.errors.join("\n")}`);
      writeFileSync(
        join(outDir, "README.md"),
        `# ${config.ownerLine} NVA State Engine Prototype Bundle\n\nGenerated from \`${basename(source)}\`.\n\n- Preview/editor: \`/src/main/editor.html\`\n- State resource hierarchy: \`manifest.state_engine\`\n- State clips: \`clips/{state}/idle.webm\` and \`clips/{state}/talking-body.webm\`\n- Held talking-head prototype clips: \`clips/{state}/head-{sil|a|i|u|e|o}.webm\`\n- Expression previews: \`expressions/{state}.png\`\n- Gestures: preserved as single motion clips under \`manifest.animations.gesture-*\` and \`manifest.vrm_slots.motions.gesture-*\`\n\nThis held bundle preserves the six standalone mouth-shape videos used by the prototype. Runtime TTS audio is not cached in NVA. The final talking-head transition contract will be selected after RTX 3090 cascade benchmarking.\n`,
      );
  rmSync(tmp, { recursive: true, force: true });

  const rel = outDir.replace(`${ROOT}/`, "");
  console.log(`OK ${rel}`);
  console.log(listFilesText(outDir, 2));
}

main();
