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
  const listeners = {};
  return {
    listeners, src: "", currentTime: 0, played: 0, paused: 0,
    addEventListener(name, callback) {
      listeners[name] = callback;
      (this._allListeners ??= {})[name] ??= [];
      this._allListeners[name].push(callback);
    },
    removeEventListener(name, callback) {
      if (listeners[name] === callback) delete listeners[name];
      if (this._allListeners?.[name]) {
        this._allListeners[name] = this._allListeners[name].filter((cb) => cb !== callback);
      }
    },
    dispatchEvent(name) {
      const list = [...(this._allListeners?.[name] || [])];
      for (const cb of list) cb();
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

test("superseded play request swallowing AbortError when generation changes via stop or new request", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: (() => { let n = 0; return () => `blob:${++n}`; })(), revokeObjectURL() {} },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  await player.load({ manifest: manifest(), assets: new Map(paths.map((path) => [path, new Blob([path])])) });

  // 1. Generation changed via stop()
  let rejectPlayA;
  const playCalledA = new Promise((resolve) => {
    element.play = () => new Promise((_, reject) => {
      rejectPlayA = reject;
      resolve();
    });
  });
  const pendingA = player.playSpeech("greeting");
  await playCalledA;
  player.stop();
  const abortErrA = new Error("The play() request was interrupted by a new load request.");
  abortErrA.name = "AbortError";
  rejectPlayA(abortErrA);
  await pendingA;

  // 2. Generation changed via another play request
  let rejectPlayB;
  const playCalledB = new Promise((resolve) => {
    element.play = () => new Promise((_, reject) => {
      rejectPlayB = reject;
      resolve();
    });
  });
  const pendingB = player.playAction("wave");
  await playCalledB;
  element.play = async () => {};
  const pendingC = player.playIdle();
  const abortErrB = new Error("The play() request was interrupted by a new load request.");
  abortErrB.name = "AbortError";
  rejectPlayB(abortErrB);
  await pendingB;
  await pendingC;
});

test("AbortError rejected when generation unchanged, non-AbortError rejected even if generation changed", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: (() => { let n = 0; return () => `blob:${++n}`; })(), revokeObjectURL() {} },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  await player.load({ manifest: manifest(), assets: new Map(paths.map((path) => [path, new Blob([path])])) });

  // 1. Generation unchanged: AbortError is rethrown
  const abortErr = new Error("The play() request was aborted");
  abortErr.name = "AbortError";
  element.play = async () => { throw abortErr; };
  await assert.rejects(() => player.playSpeech("greeting"), (err) => err === abortErr);

  // 2. Non-AbortError (e.g. NotAllowedError) is rethrown even if generation changed
  let rejectPlay;
  const playCalled = new Promise((resolve) => {
    element.play = () => new Promise((_, reject) => {
      rejectPlay = reject;
      resolve();
    });
  });
  const notAllowedErr = new Error("Play not allowed");
  notAllowedErr.name = "NotAllowedError";
  const pending = player.playSpeech("greeting");
  await playCalled;
  player.stop();
  rejectPlay(notAllowedErr);
  await assert.rejects(() => pending, (err) => err === notAllowedErr);
});

test("clip decode error rejects with NVA animation decode failed despite onError advancing generation", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: (() => { let n = 0; return () => `blob:${++n}`; })(), revokeObjectURL() {} },
  });
  const paths = ["idle", "wave", "sit"].map((name) => `clips/${name}.webm`).concat("speech/greeting.mp4");
  await player.load({ manifest: manifest(), assets: new Map(paths.map((path) => [path, new Blob([path])])) });

  element.load = () => {}; // wait for media without auto-resolving loadeddata
  const pending = player.playSpeech("greeting");
  element.dispatchEvent("error");
  await assert.rejects(() => pending, /NVA animation decode failed/);
  assert.equal(player.state, "idle");
});

function propManifest() {
  return {
    nva_version: "0.2",
    meta: { name: "prop-test" },
    canvas: { width: 720, height: 1280 },
    background: { type: "transparent" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, label: "Idle" },
      strum: {
        clip: "clips/strum.webm", loop: true, can_talk: false, label: "연주",
        prop_sequence: { enter: "strum__enter", exit: "strum__exit" },
      },
      strum__enter: {
        clip: "clips/strum_enter.webm", loop: false, can_talk: false, label: "연주 시작",
        role: "prop_enter", parent: "strum",
      },
      strum__exit: {
        clip: "clips/strum_exit.webm", loop: false, can_talk: false, label: "연주 종료",
        role: "prop_exit", parent: "strum",
      },
      wave: {
        clip: "clips/wave.webm", loop: true, can_talk: false, label: "손흔들기",
        prop_sequence: {},
      },
      act1: { clip: "clips/act1.webm", loop: false, can_talk: false, label: "인사" },
      act2: { clip: "clips/act2.webm", loop: false, can_talk: false, label: "인사" },
    },
  };
}

test("animation player handles prop sequence, duplicate labels, cancellation, and error recovery", async () => {
  const element = video();
  let nextUrl = 0;
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: () => `blob:${++nextUrl}`, revokeObjectURL() {} },
  });
  const paths = [
    "clips/idle.webm", "clips/strum.webm", "clips/strum_enter.webm",
    "clips/strum_exit.webm", "clips/wave.webm", "clips/act1.webm", "clips/act2.webm",
  ];
  const assets = new Map(paths.map((p) => [p, new Blob([p])]));
  const result = await player.load({ manifest: propManifest(), assets });

  // 1. Actions list hides aux clips, appends prop actions, disambiguates duplicate labels
  assert.deepEqual(result.actions, [
    { key: "act1", label: "인사 (act1)" },
    { key: "act2", label: "인사 (act2)" },
    { key: "strum", label: "연주" },
    { key: "wave", label: "손흔들기" },
  ]);

  // 2. Prop sequence with enter and exit: enter -> X -> X -> exit -> idle
  // States: prop -> prop -> prop -> action -> idle
  const states = [];
  await player.playAction("strum");
  states.push(player.state);
  assert.equal(element.src, "blob:2"); // strum_enter
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  states.push(player.state);
  assert.equal(element.src, "blob:3"); // strum 1st
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  states.push(player.state);
  assert.equal(element.src, "blob:3"); // strum 2nd
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  states.push(player.state);
  assert.equal(element.src, "blob:4"); // strum_exit (last step: state is action)
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  states.push(player.state);
  assert.equal(element.src, "blob:1"); // idle restored
  assert.equal(element.loop, true);
  assert.deepEqual(states, ["prop", "prop", "prop", "action", "idle"]);

  // 3. Prop sequence without enter/exit: X 2회 -> idle
  // States: prop -> action -> idle
  const waveStates = [];
  await player.playAction("wave");
  waveStates.push(player.state);
  assert.equal(element.src, "blob:5"); // wave 1st
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  waveStates.push(player.state);
  assert.equal(element.src, "blob:5"); // wave 2nd (last step: state is action)
  assert.equal(element.loop, false);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  waveStates.push(player.state);
  assert.equal(element.src, "blob:1"); // idle restored
  assert.equal(element.loop, true);
  assert.deepEqual(waveStates, ["prop", "action", "idle"]);

  // 4. stop() cancels active prop sequence
  await player.playAction("strum");
  assert.equal(player.state, "prop");
  player.stop();
  assert.equal(player.state, "ready");
  const playCount = element.played;
  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  assert.equal(element.played, playCount, "stopped prop sequence must not advance");

  // 5. another playAction cancels active prop sequence
  await player.playAction("strum");
  assert.equal(player.state, "prop");
  await player.playAction("act1");
  assert.equal(player.state, "action");
  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  assert.equal(player.state, "idle");

  // 6. error during sequence restores idle
  await player.playAction("strum");
  assert.equal(player.state, "prop");
  element.dispatchEvent("error");
  assert.equal(player.state, "idle");
  await new Promise((r) => setImmediate(r));
  assert.equal(element.src, "blob:1");

  // 7. failure during step advance in ended restores idle without unhandled rejection
  await player.playAction("strum");
  assert.equal(player.state, "prop");
  element.play = async () => { throw new Error("Step play failed"); };
  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  assert.equal(player.state, "idle");
});

test("prop action playback rejection on first step recovers to idle", async () => {
  const element = video();
  let nextUrl = 0;
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: () => `blob:${++nextUrl}`, revokeObjectURL() {} },
  });
  const paths = [
    "clips/idle.webm", "clips/strum.webm", "clips/strum_enter.webm",
    "clips/strum_exit.webm", "clips/wave.webm", "clips/act1.webm", "clips/act2.webm",
  ];
  const assets = new Map(paths.map((p) => [p, new Blob([p])]));
  await player.load({ manifest: propManifest(), assets });
  assert.equal(element.src, "blob:1");

  const notAllowed = new Error("Play not allowed");
  notAllowed.name = "NotAllowedError";
  element.play = async () => {
    if (element.src !== "blob:1") throw notAllowed;
  };

  await assert.rejects(() => player.playAction("strum"), (err) => err === notAllowed);
  assert.equal(player.state, "idle");
  assert.equal(element.src, "blob:1");
});

test("invalid play request during prop sequence rejects without breaking sequence progression", async () => {
  const element = video();
  let nextUrl = 0;
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: () => `blob:${++nextUrl}`, revokeObjectURL() {} },
  });
  const paths = [
    "clips/idle.webm", "clips/strum.webm", "clips/strum_enter.webm",
    "clips/strum_exit.webm", "clips/wave.webm", "clips/act1.webm", "clips/act2.webm",
  ];
  const assets = new Map(paths.map((p) => [p, new Blob([p])]));
  await player.load({ manifest: propManifest(), assets });

  await player.playAction("strum");
  assert.equal(player.state, "prop");
  assert.equal(element.src, player.urls.get("clips/strum_enter.webm"));

  await assert.rejects(() => player.playTalking(), /NVA has no talking animation/);
  await assert.rejects(() => player.playSpeech("missing"), /unknown packaged speech video/);

  element.dispatchEvent("ended");
  await new Promise((r) => setImmediate(r));
  assert.equal(player.state, "prop");
  assert.equal(element.src, player.urls.get("clips/strum.webm"));
});

test("duplicate action label disambiguation does not collide with existing labels", async () => {
  const element = video();
  const player = new NvaAnimationPlayer(element, {
    urlApi: { createObjectURL: (() => { let n = 0; return () => `blob:${++n}`; })(), revokeObjectURL() {} },
  });
  const manifest = {
    nva_version: "0.2",
    meta: { name: "dedup-test" },
    canvas: { width: 720, height: 1280 },
    background: { type: "transparent" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, label: "Idle" },
      strum: { clip: "clips/strum.webm", loop: false, can_talk: false, label: "Guitar" },
      wave: { clip: "clips/wave.webm", loop: false, can_talk: false, label: "Guitar" },
      clap: { clip: "clips/clap.webm", loop: false, can_talk: false, label: "Guitar (strum)" },
    },
  };
  const paths = ["clips/idle.webm", "clips/strum.webm", "clips/wave.webm", "clips/clap.webm"];
  const assets = new Map(paths.map((p) => [p, new Blob([p])]));
  const result = await player.load({ manifest, assets });

  const labels = result.actions.map((a) => a.label);
  const uniqueLabels = new Set(labels);
  assert.equal(uniqueLabels.size, 3, "all three action labels must be distinct");
  assert.equal(result.actions.find((a) => a.key === "clap")?.label, "Guitar (strum)");
  assert.equal(result.actions.find((a) => a.key === "strum")?.label, "Guitar (strum) 2");
  assert.equal(result.actions.find((a) => a.key === "wave")?.label, "Guitar (wave)");
});

