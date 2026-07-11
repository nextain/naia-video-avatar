#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function inferCharacter(source) {
  const s = source.toLowerCase();
  if (s.includes("naia")) return "naia";
  if (s.includes("alpha")) return "alpha";
  return "osarang";
}

function characterConfig(key) {
  if (key === "naia") {
    return {
      displayName: "Naia (VRM식 슬롯 NVA)",
      ownerLine: "Naia",
      defaultLocale: "ko-KR",
      generatedLocales: ["ko-KR", "en-US"],
      utterances: [
        ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "안녕하세요. 저는 나이아입니다.", "en-US": "Hello. I am Naia." }],
        ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "무엇을 함께 해볼까요?", "en-US": "What shall we work on together?" }],
        ["local_privacy", "guiding", "a", "guide", { "ko-KR": "가능한 처리는 이 컴퓨터 안에서 안전하게 진행할게요.", "en-US": "I will keep supported work safely on this computer." }],
        ["thinking_wait", "thinking", "eu", "thinking", { "ko-KR": "잠시만요. 맥락을 확인하고 있어요.", "en-US": "One moment. I am checking the context." }],
        ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "그 지점은 불편할 수 있어요. 차근차근 정리해볼게요.", "en-US": "That part can be frustrating. I will sort it out step by step." }],
        ["thanks_close", "happy", "o", "closing", { "ko-KR": "좋아요. 필요한 일이 있으면 바로 이어서 도울게요.", "en-US": "Good. I can continue whenever you need help." }],
      ],
    };
  }
  if (key === "alpha") {
    return {
      displayName: "Alpha (VRM식 슬롯 NVA)",
      ownerLine: "Alpha",
      defaultLocale: "ko-KR",
      generatedLocales: ["ko-KR", "en-US"],
      utterances: [
        ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "안녕하세요. 알파입니다.", "en-US": "Hello. I am Alpha." }],
        ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "무엇을 점검할까요?", "en-US": "What should I inspect?" }],
        ["analysis", "thinking", "eu", "thinking", { "ko-KR": "상황을 나누어 보고 우선순위를 정하겠습니다.", "en-US": "I will break down the situation and set priorities." }],
        ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "걱정되는 부분부터 확인해 보겠습니다.", "en-US": "I will check the concerning part first." }],
        ["thanks_close", "happy", "o", "closing", { "ko-KR": "확인했습니다. 다음 단계로 진행하겠습니다.", "en-US": "Confirmed. I will move to the next step." }],
      ],
    };
  }
  return {
    displayName: "오사랑 (VRM식 슬롯 NVA)",
    ownerLine: "Osarang",
    defaultLocale: "ko-KR",
    generatedLocales: ["ko-KR", "en-US"],
    utterances: [
      ["greeting", "neutral", "aiueo", "greeting", { "ko-KR": "안녕하세요. 강남구청 안내원 오사랑입니다.", "en-US": "Hello. I am Osarang, your Gangnam-gu office guide." }],
      ["ask_need", "guiding", "aiueo", "question", { "ko-KR": "무엇을 도와드릴까요?", "en-US": "How may I help you?" }],
      ["office_location", "guiding", "a", "guide", { "ko-KR": "민원실은 본관 2층에 있습니다.", "en-US": "The civil affairs office is on the second floor of the main building." }],
      ["thinking_wait", "thinking", "eu", "thinking", { "ko-KR": "잠시만 기다려 주세요. 확인해 보겠습니다.", "en-US": "Please wait a moment. I will check that for you." }],
      ["empathy_help", "empathy", "eo", "empathy", { "ko-KR": "불편하셨겠어요. 제가 차근차근 안내해 드릴게요.", "en-US": "I am sorry for the inconvenience. I will guide you step by step." }],
      ["thanks_close", "happy", "o", "closing", { "ko-KR": "감사합니다. 좋은 하루 보내세요.", "en-US": "Thank you. Have a good day." }],
    ],
  };
}

function ffmpegTextClip(src, out, label, color, seconds = 3.2) {
  const font = "/usr/share/fonts/google-noto/NotoSansCJK-Regular.ttc";
  const drawText = existsSync(font)
    ? `,drawtext=fontfile=${font}:text='${label.replaceAll("'", "\\'")}':x=(w-text_w)/2:y=h-92:fontsize=26:fontcolor=white:box=1:boxcolor=${color}@0.80:boxborderw=14`
    : "";
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    src,
    "-t",
    String(seconds),
    "-vf",
    `drawbox=x=0:y=h-132:w=iw:h=132:color=${color}@0.36:t=fill${drawText}`,
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuva420p",
    "-b:v",
    "0",
    "-crf",
    "33",
    out,
  ]);
}

function ffmpegStateImage(src, out, label, color, at = "1.0") {
  const font = "/usr/share/fonts/google-noto/NotoSansCJK-Regular.ttc";
  const drawText = existsSync(font)
    ? `,drawtext=fontfile=${font}:text='${label.replaceAll("'", "\\'")}':x=(w-text_w)/2:y=h-74:fontsize=30:fontcolor=white:box=1:boxcolor=${color}@0.82:boxborderw=14`
    : "";
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    at,
    "-i",
    src,
    "-frames:v",
    "1",
    "-vf",
    `drawbox=x=0:y=h-110:w=iw:h=110:color=${color}@0.38:t=fill${drawText}`,
    out,
  ]);
}

function main() {
  const source = resolve(ROOT, arg("--source", "examples/osarang.nva.zip"));
  const outDir = resolve(ROOT, arg("--out", "examples/osarang-prebaked.nva"));
  const character = arg("--character", inferCharacter(source));
  const config = characterConfig(character);
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

  if (source.endsWith(".zip")) run("unzip", ["-o", source, "-d", tmp]);
  else cpSync(source, tmp, { recursive: true });
  const baseManifest = JSON.parse(readFileSync(join(tmp, "manifest.json"), "utf8"));
  const bodyClip = arg("--body", baseManifest.animations?.speak?.clip || baseManifest.animations?.idle?.clip);
  if (!bodyClip) throw new Error("body clip not found: pass --body clips/name.webm");
  const bodySrc = join(tmp, bodyClip);
  const bodyOut = join(clips, "body.webm");
  run("cp", [bodySrc, bodyOut]);

  const expressions = [
    ["neutral", "중립", "0x1f2937", "calm"],
    ["happy", "기쁨", "0x16a34a", "joy"],
    ["thinking", "생각", "0x2563eb", "thinking"],
    ["surprised", "놀람", "0xdc2626", "surprise"],
    ["sad", "슬픔", "0x334155", "sad"],
    ["angry", "단호함", "0xb91c1c", "angry"],
    ["relaxed", "안정", "0x0f766e", "relaxed"],
    ["empathy", "공감", "0xbe185d", "empathy"],
    ["guiding", "안내", "0x7c3aed", "guide"],
  ];
  const utterances = config.utterances;
  const visemes = [
    ["sil", "무음", "0x111827"],
    ["a", "아", "0x0f766e"],
    ["i", "이", "0x0369a1"],
    ["u", "우", "0x4338ca"],
    ["e", "에", "0x9333ea"],
    ["o", "오", "0xc2410c"],
    ["eu", "으", "0x475569"],
    ["eo", "어", "0xbe123c"],
    ["aiueo", "아이우에오", "0x166534"],
  ];

  for (const [key, label, color] of expressions) {
    ffmpegStateImage(bodySrc, join(expressionDir, `${key}.png`), label, color);
  }
  for (const [key, label, color] of visemes) {
    ffmpegTextClip(bodySrc, join(clips, `viseme-${key}.webm`), label, color, 1.8);
  }
  for (const locale of generatedLocales) mkdirSync(join(clips, locale), { recursive: true });
  for (const [key, state, viseme, , texts] of utterances) {
    const stateColor = expressions.find((s) => s[0] === state)?.[2] || "0x1f2937";
    for (const locale of generatedLocales) {
      ffmpegTextClip(bodySrc, join(clips, locale, `say-${key}.webm`), texts[locale] || texts[config.defaultLocale], stateColor, 3.4);
    }
  }

  const faceBbox = baseManifest.animations?.speak?.face_bbox || [0.3, 0.03, 0.36, 0.26];
  const animations = {
    idle: {
      clip: "clips/body.webm",
      loop: true,
      can_talk: false,
      face_bbox: faceBbox,
      label: "대기",
      description: "기본 대기 상태. 사용자가 말하거나 시스템이 응답을 준비할 때 재생.",
      state: "neutral",
      expression_image: "expressions/neutral.png",
    },
    speak: {
      clip: "clips/body.webm",
      loop: true,
      can_talk: false,
      face_bbox: faceBbox,
      label: "말하기",
      description: "구형 런타임 호환용 발화 루프. 실제 발화는 vrm_slots.speech의 webm 클립을 재생.",
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
      description: `${label} 상태 프리셋. 사전 생성 발화 선택 전후에 상태값으로 사용.`,
      state: key,
      expression_image: `expressions/${key}.png`,
    };
  }
  for (const [key, state, viseme, intent, texts] of utterances) {
    const text = texts[config.defaultLocale];
    animations[`say-${key}`] = {
      clip: `clips/${config.defaultLocale}/say-${key}.webm`,
      loop: false,
      can_talk: false,
      face_bbox: faceBbox,
      label: text,
      description: `사전 생성 발화: ${text}`,
      state,
      intent,
      expression_image: `expressions/${state}.png`,
      prebaked: true,
      utterance_id: key,
      viseme,
    };
  }

  const vrmSlots = {
    profile: {
      model: "nva-vrm-slots-0.1",
      compatibility: "VRM-style expressions, visemes, motions, and speech slots backed by webm clips",
      generation_mode: "prebaked_webm_only",
      default_locale: config.defaultLocale,
      available_locales: generatedLocales,
      target_locale_sets: {
        naia_shell_14: NAIA_SHELL_14,
      },
      tts_capabilities: {
        voxcpm: {
          supported_language_count: 30,
          note: "Generation service can fill additional by_locale clips when VoxCPM locale support is enabled.",
        },
      },
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
    visemes: Object.fromEntries(
      visemes.map(([key, label]) => [
        key,
        {
          label,
          type: "viseme",
          clip: `clips/viseme-${key}.webm`,
        },
      ]),
    ),
    motions: {
      idle: {
        label: "대기",
        type: "idle",
        clip: "clips/body.webm",
        loop: true,
        expression: "neutral",
      },
      talking: {
        label: "발화 클립 선택",
        type: "talking",
        clip: "clips/body.webm",
        loop: true,
        expression: "neutral",
      },
    },
    speech: Object.fromEntries(
      utterances.map(([key, expression, viseme, intent, texts]) => [
        key,
        {
          text: texts[config.defaultLocale],
          intent,
          expression,
          viseme,
          clip: `clips/${config.defaultLocale}/say-${key}.webm`,
          by_locale: Object.fromEntries(
            generatedLocales.map((locale) => [
              locale,
              {
                text: texts[locale] || texts[config.defaultLocale],
                clip: `clips/${locale}/say-${key}.webm`,
                viseme,
              },
            ]),
          ),
        },
      ]),
    ),
  };

  const manifest = {
    ...baseManifest,
    meta: {
      ...baseManifest.meta,
      name: config.displayName,
      note:
        "VRM의 expression/viseme/motion/speech 슬롯을 webm 클립으로 구현한 NVA 샘플. 에디터와 런타임은 외부 AI 연결 없이 생성된 webm만 재생한다.",
    },
    animations,
    vrm_slots: vrmSlots,
    expression_states: Object.fromEntries(
      expressions.map(([key, label, , mood]) => [
        key,
        { label, mood, image: `expressions/${key}.png`, animation: key === "neutral" ? "idle" : `state-${key}` },
      ]),
    ),
    viseme_clips: Object.fromEntries(
      visemes.map(([key, label]) => [key, { label, clip: `clips/viseme-${key}.webm` }]),
    ),
    prebaked_speech: {
      mode: "clip_pool",
      selection: "utterance_id_or_state",
      fallback_animation: null,
      utterances: Object.fromEntries(
        utterances.map(([key, state, viseme, intent, texts]) => [
          key,
          {
            text: texts[config.defaultLocale],
            intent,
            state,
            viseme,
            clip: `clips/${config.defaultLocale}/say-${key}.webm`,
            by_locale: Object.fromEntries(
              generatedLocales.map((locale) => [
                locale,
                { text: texts[locale] || texts[config.defaultLocale], clip: `clips/${locale}/say-${key}.webm`, viseme },
              ]),
            ),
            expression_image: `expressions/${state}.png`,
          },
        ]),
      ),
    },
    scenario: {
      nodes: {
        start: { type: "start", label: "진입" },
        n0: { type: "scene", animation: "idle", label: "대기" },
      },
      edges: [{ from: "start", to: "n0" }],
    },
  };

  writeJson(join(outDir, "manifest.json"), manifest);
  const result = validateManifest(manifest);
  if (!result.ok) throw new Error(`generated manifest invalid:\n${result.errors.join("\n")}`);
  writeFileSync(
    join(outDir, "README.md"),
    `# ${config.ownerLine} VRM-Style Slot NVA\n\nGenerated from \`${basename(source)}\`.\n\n- Preview: \`/src/main/prebaked-player.html?nva=../../${outDir.replace(`${ROOT}/`, "")}\`\n- Canonical contract: \`manifest.vrm_slots\`\n- Speech clips: \`clips/say-*.webm\`\n- Viseme clips: \`clips/viseme-*.webm\`\n- Expression images: \`expressions/*.png\`\n\nThese sample webm files are service slots. The editor/runtime only play generated webm files; generation tools can replace files at the same paths.\n`,
  );
  rmSync(tmp, { recursive: true, force: true });

  const rel = outDir.replace(`${ROOT}/`, "");
  console.log(`OK ${rel}`);
  console.log(runQuiet("find", [outDir, "-maxdepth", "2", "-type", "f"]));
}

main();
