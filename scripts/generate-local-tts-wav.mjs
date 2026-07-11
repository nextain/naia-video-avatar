#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "../src/main/nva-core.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

function espeakVoice(locale) {
  const table = {
    "ko-KR": "ko",
    "en-US": "en-us",
    "ja-JP": "ja",
    "zh-CN": "cmn",
    "fr-FR": "fr-fr",
    "de-DE": "de",
    "ru-RU": "ru",
    "es-ES": "es",
    "ar-SA": "ar",
    "hi-IN": "hi",
    "bn-BD": "bn",
    "pt-BR": "pt-br",
    "id-ID": "id",
    "vi-VN": "vi",
  };
  return table[locale] || locale.slice(0, 2);
}

function main() {
  const nvaDir = resolve(ROOT, arg("--nva", "examples/osarang-prebaked.nva"));
  const force = process.argv.includes("--force");
  const manifestPath = join(nvaDir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  for (const [speechId, slot] of Object.entries(manifest.vrm_slots?.speech || {})) {
    for (const [locale, localized] of Object.entries(slot.by_locale || {})) {
      const text = localized.text || slot.text;
      if (!text) continue;
      const audioRel = `audio/${locale}/say-${speechId}.wav`;
      const audioPath = join(nvaDir, audioRel);
      mkdirSync(dirname(audioPath), { recursive: true });
      if (force || !existsSync(audioPath)) {
        run("espeak-ng", ["-v", espeakVoice(locale), "-s", locale === "ko-KR" ? "135" : "150", "-w", audioPath, text]);
      }
      localized.audio = audioRel;
      localized.tts = { engine: "espeak-ng", voice: espeakVoice(locale), local: true };
    }
  }

  const result = validateManifest(manifest);
  if (!result.ok) throw new Error(`manifest invalid:\n${result.errors.join("\n")}`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`OK ${nvaDir.replace(`${ROOT}/`, "")}`);
}

main();
