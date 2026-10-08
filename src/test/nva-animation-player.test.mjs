import test from "node:test";
import assert from "node:assert/strict";

import { NvaAnimationPlayer } from "../main/nva-animation-player.js";

function manifest() {
  return {
    nva_version: "0.3",
    profile: "completed-media",
    meta: { name: "test" },
    canvas: { width: 720, height: 1280 },
    background: { type: "color", value: "#000000" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, entry_pose: "stand", exit_pose: "stand" },
      wave: { clip: "clips/wave.webm", loop: false, entry_pose: "stand", exit_pose: "stand", label: "Wave" },
      sit: { clip: "clips/sit.webm", loop: false, entry_pose: "stand", exit_pose: "sit" },
    },
    speech_clips: {
      greeting: { clip: "speech/greeting.mp4", audio: "embedded", language: "ko-KR", label: "인사" },
    },
    scenario: {
      nodes: { start: { type: "start" }, idle: { type: "scene", animation: "idle" } },
      edges: [{ from: "start", to: "idle" }],
    },
  };
}

function video() {
  return {
    listeners: {}, src: "", currentTime: 0, played: 0, paused: 0,
    addEventListener(name, callback) { this.listeners[name] = callback; },
    removeEventListener(name, callback) {
      if (this.listeners[name] === callback) delete this.listeners[name];
    },
    load() { queueMicrotask(() => this.listeners.loadeddata?.()); },
    async play() { this.played += 1; },
    pause() { this.paused += 1; },
    removeAttribute(name) { if (name === "src") this.src = ""; },
  };
}

test("animation player lists actions and completed speech videos", async () => {
  const element = video();
  let nextUrl = 0;
  const revoked = [];
  const player = new NvaAnimationPlayer(element, {
    urlApi: {
      createObjectURL: () => `blob:${++nextUrl}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  const assets = new Map(paths.map((path) => [path, new Blob([path])]));
  const result = await player.load({ manifest: manifest(), assets });
  assert.deepEqual(result, {
    idle: "idle",
    idles: ["idle"],
    actions: [{ key: "wave", label: "Wave" }],
    speechClips: [{ key: "greeting", label: "인사" }],
    talking: null,
  });
  await assert.rejects(() => player.playTalking(), /NVA has no talking animation/);
  assert.equal(element.src, "blob:1");
  assert.equal(element.loop, true);
  assert.equal(element.muted, true);

  await player.playAction("wave");
  assert.equal(player.state, "action");
  assert.equal(element.loop, false);
  element.listeners.ended();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(player.state, "idle");
  assert.equal(element.loop, true);

  await player.playSpeech("greeting");
  assert.equal(player.state, "speech");
  assert.equal(element.loop, false);
  assert.equal(element.muted, false);
  element.listeners.ended();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(player.state, "idle");
  assert.equal(element.muted, true);

  await player.playSpeech("greeting");
  player.onError();
  assert.equal(player.state, "idle", "error recovery marks idle before loading fallback media");
  await new Promise((resolve) => setImmediate(resolve));

  player.dispose();
  assert.deepEqual(revoked.sort(), ["blob:1", "blob:2", "blob:3"]);
});

test("animation player rejects unknown actions", async () => {
  const player = new NvaAnimationPlayer(video(), {
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  await player.load({
    manifest: manifest(),
    assets: new Map(paths.map((path) => [path, new Blob([path])])),
  });
  await assert.rejects(() => player.playAction("missing"), /unknown NVA action/);
});

test("animation player never resumes stale playback after stop during media load", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: (() => { let n = 0; return () => `blob:${++n}`; })(), revokeObjectURL() {} },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  await player.load({ manifest: manifest(), assets: new Map(paths.map((path) => [path, new Blob([path])])) });
  const baseline = element.played;
  let release;
  element.load = () => { release = () => element.listeners.loadeddata?.(); };
  const pending = player.playSpeech("greeting");
  player.stop();
  release();
  await pending;
  assert.equal(element.played, baseline, "stale speech must not play");
  assert.equal(player.state, "ready");
  const action = player.playAction("wave");
  player.stop();
  release();
  await action;
  assert.equal(element.played, baseline, "stale action must not play");
});

function legacyManifest() {
  return {
    nva_version: "0.2",
    meta: { name: "test-legacy", x_ext_b: 1 },
    canvas: { width: 720, height: 1280 },
    background: { type: "transparent" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, entry_pose: "stand", exit_pose: "stand", x_ext_c: "anim" },
      talk: { clip: "clips/talk.webm", loop: true, can_talk: true, entry_pose: "stand", exit_pose: "stand" },
      wave: { clip: "clips/wave.webm", loop: false, can_talk: false, entry_pose: "stand", exit_pose: "stand", label: "Wave" },
    },
    x_ext_a: "root",
  };
}

test("animation player plays talking loop in v0.2, recovers from error, and respects stop generation", async () => {
  const element = video();
  let nextUrl = 0;
  const revoked = [];
  const player = new NvaAnimationPlayer(element, {
    urlApi: {
      createObjectURL: () => `blob:${++nextUrl}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  const paths = ["idle", "talk", "wave"].map((name) => `clips/${name}.webm`);
  const assets = new Map(paths.map((path) => [path, new Blob([path])]));
  const result = await player.load({ manifest: legacyManifest(), assets });
  assert.deepEqual(result, {
    idle: "idle",
    idles: ["idle"],
    actions: [{ key: "wave", label: "Wave" }],
    speechClips: [],
    talking: "talk",
  });
  assert.equal(element.src, "blob:1");
  assert.equal(element.loop, true);
  assert.equal(element.muted, true);

  await player.playTalking();
  assert.equal(player.state, "talking");
  assert.equal(element.src, "blob:2");
  assert.equal(element.loop, true);
  assert.equal(element.muted, true);

  player.onError();
  assert.equal(player.state, "idle");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(element.src, "blob:1");

  const baseline = element.played;
  let release;
  element.load = () => { release = () => element.listeners.loadeddata?.(); };
  const pending = player.playTalking();
  player.stop();
  release();
  await pending;
  assert.equal(element.played, baseline, "stale talking must not play after stop");
  assert.equal(player.state, "ready");
});

test("v0.2 manifest without talking animation rejects playTalking and returns talking as null", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  });
  const manifest = legacyManifest();
  delete manifest.animations.talk;
  const paths = ["idle", "wave"].map((name) => `clips/${name}.webm`);
  const assets = new Map(paths.map((path) => [path, new Blob([path])]));
  const result = await player.load({ manifest, assets });
  assert.equal(result.talking, null);
  assert.deepEqual(result.idles, ["idle"]);
  await assert.rejects(() => player.playTalking(), /NVA has no talking animation/);
});

