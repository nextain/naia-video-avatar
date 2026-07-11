#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [input, output, delayArg = "240"] = process.argv.slice(2);
const videoDelayMs = Number(delayArg);

if (!input || !output || !Number.isFinite(videoDelayMs)) {
  console.error("Usage: node scripts/align-ditto-webm.mjs <input.webm|mp4> <output.webm> [videoDelayMs=240]");
  process.exit(2);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 200 });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")}\n${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

mkdirSync(dirname(output), { recursive: true });
run("ffmpeg", [
  "-y",
  "-v", "error",
  "-i", input,
  "-filter_complex", `[0:v]setpts=PTS+${videoDelayMs}/1000/TB[v];[0:a]asetpts=PTS-STARTPTS[a]`,
  "-map", "[v]",
  "-map", "[a]",
  "-c:v", "libvpx-vp9",
  "-deadline", "good",
  "-cpu-used", "4",
  "-b:v", "2M",
  "-row-mt", "1",
  "-c:a", "libopus",
  "-b:a", "160k",
  output,
]);

const reportPath = output.replace(/\.[^.]+$/, ".av-sync.json");
const report = run("node", ["scripts/check-ditto-av-sync.mjs", output, reportPath]);
process.stdout.write(report);
