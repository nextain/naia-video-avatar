#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const video = process.argv[2];
const reportPath = process.argv[3] || "ditto-av-sync-report.json";
const roi = process.argv[4] || process.env.DITTO_SYNC_ROI || "iw*0.12:ih*0.05:iw*0.44:ih*0.19";

if (!video) {
  console.error("Usage: node scripts/check-ditto-av-sync.mjs <video.mp4|webm> [report.json]");
  process.exit(2);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: opts.encoding ?? "utf8", maxBuffer: 1024 * 1024 * 200 });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")}\n${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

function probe(path) {
  return JSON.parse(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height",
    "-of", "json",
    path,
  ]));
}

const info = probe(video);
let duration = Number(info.format?.duration || 0);
const videoStream = info.streams?.find((s) => s.codec_type === "video");
const audioStream = info.streams?.find((s) => s.codec_type === "audio");
if (!videoStream || !audioStream) {
  throw new Error("Video must contain both audio and video streams.");
}

const fps = 25;
const roiW = 96;
const roiH = 64;
const audioRate = 16000;
const samplesPerFrame = Math.round(audioRate / fps);

const rawVideo = spawnSync("ffmpeg", [
  "-v", "error",
  "-i", video,
  "-vf", `fps=${fps},crop=${roi},scale=${roiW}:${roiH},format=gray`,
  "-f", "rawvideo",
  "-pix_fmt", "gray",
  "pipe:1",
], { encoding: "buffer", maxBuffer: 1024 * 1024 * 300 });
if (rawVideo.status !== 0) throw new Error(rawVideo.stderr.toString());

const frameSize = roiW * roiH;
const frameCount = Math.floor(rawVideo.stdout.length / frameSize);
const motion = [];
let prev = null;
for (let i = 0; i < frameCount; i += 1) {
  const frame = rawVideo.stdout.subarray(i * frameSize, (i + 1) * frameSize);
  if (!prev) {
    motion.push(0);
  } else {
    let diff = 0;
    for (let p = 0; p < frameSize; p += 1) diff += Math.abs(frame[p] - prev[p]);
    motion.push(diff / frameSize);
  }
  prev = Buffer.from(frame);
}

const rawAudio = spawnSync("ffmpeg", [
  "-v", "error",
  "-i", video,
  "-ac", "1",
  "-ar", String(audioRate),
  "-f", "f32le",
  "pipe:1",
], { encoding: "buffer", maxBuffer: 1024 * 1024 * 100 });
if (rawAudio.status !== 0) throw new Error(rawAudio.stderr.toString());
const decodedAudioDuration = rawAudio.stdout.length / 4 / audioRate;
if (!duration) duration = decodedAudioDuration;

const audioFrames = Math.floor(rawAudio.stdout.length / 4 / samplesPerFrame);
const rms = [];
for (let i = 0; i < audioFrames; i += 1) {
  let sum = 0;
  const base = i * samplesPerFrame * 4;
  for (let s = 0; s < samplesPerFrame; s += 1) {
    const v = rawAudio.stdout.readFloatLE(base + s * 4);
    sum += v * v;
  }
  rms.push(Math.sqrt(sum / samplesPerFrame));
}

const n = Math.min(motion.length, rms.length);
const m = motion.slice(0, n);
const a = rms.slice(0, n);

function normalize(xs) {
  const mean = xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, xs.length);
  const sd = Math.sqrt(variance) || 1;
  return xs.map((x) => (x - mean) / sd);
}

function corrAtLag(xs, ys, lagFrames) {
  const x0 = Math.max(0, lagFrames);
  const y0 = Math.max(0, -lagFrames);
  const len = Math.min(xs.length - x0, ys.length - y0);
  if (len < fps) return 0;
  let sum = 0;
  for (let i = 0; i < len; i += 1) sum += xs[x0 + i] * ys[y0 + i];
  return sum / len;
}

const znMotion = normalize(m);
const znAudio = normalize(a);
let best = { lagFrames: 0, correlation: -Infinity };
for (let lag = -10; lag <= 10; lag += 1) {
  const c = corrAtLag(znMotion, znAudio, lag);
  if (c > best.correlation) best = { lagFrames: lag, correlation: c };
}

const meanMotion = m.reduce((s, x) => s + x, 0) / Math.max(1, m.length);
const sortedMotion = [...m].sort((x, y) => x - y);
const p90Motion = sortedMotion[Math.floor(sortedMotion.length * 0.9)] || 0;
const durationDeltaSec = Math.abs(duration - decodedAudioDuration);
const lagMs = Math.round((best.lagFrames / fps) * 1000);

const report = {
  video,
  duration_sec: Number(duration.toFixed(3)),
  streams: {
    video: { codec: videoStream.codec_name, width: videoStream.width, height: videoStream.height },
    audio: { codec: audioStream.codec_name },
  },
  analysis: {
    fps,
    frames_analyzed: n,
    roi: `crop=${roi}`,
    mean_motion: Number(meanMotion.toFixed(4)),
    p90_motion: Number(p90Motion.toFixed(4)),
    best_audio_motion_correlation: Number(best.correlation.toFixed(4)),
    best_lag_ms: lagMs,
    duration_delta_sec: Number(durationDeltaSec.toFixed(4)),
  },
  pass: {
    has_audio_video: true,
    mouth_roi_moves: p90Motion > 0.75,
    lag_within_240ms: Math.abs(lagMs) <= 240,
    positive_audio_motion_correlation: best.correlation > 0.03,
  },
  note: "This is an objective proxy. Final quality still needs a short visual review of the saved sample.",
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
