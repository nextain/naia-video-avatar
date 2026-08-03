import test from "node:test";
import assert from "node:assert/strict";

import { NvaAnimationPlayer } from "../main/nva-animation-player.js";

function manifest() {
  return {
    nva_version: "0.2",
    meta: { name: "test" },
    canvas: { width: 720, height: 1280 },
    background: { type: "color", value: "#000000" },
    animations: {
      idle: { clip: "clips/idle.webm", loop: true, can_talk: false, entry_pose: "stand", exit_pose: "stand" },
      talking: { clip: "clips/talk.webm", loop: true, can_talk: true, entry_pose: "stand", exit_pose: "stand", face_bbox: [0.25, 0.05, 0.5, 0.4], ditto_region: [104, 0, 512, 512] },
      wave: { clip: "clips/wave.webm", loop: false, can_talk: false, entry_pose: "stand", exit_pose: "stand", label: "Wave" },
      sit: { clip: "clips/sit.webm", loop: false, can_talk: false, entry_pose: "stand", exit_pose: "sit" },
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

test("animation player lists gestures but not pose transitions", async () => {
  const element = video();
  let nextUrl = 0;
  const revoked = [];
  const player = new NvaAnimationPlayer(element, {
    urlApi: {
      createObjectURL: () => `blob:${++nextUrl}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  const paths = ["idle", "talk", "wave", "sit"].map((name) => `clips/${name}.webm`);
  const assets = new Map(paths.map((path) => [path, new Blob([path])]));
  const result = await player.load({ manifest: manifest(), assets });
  assert.deepEqual(result, { idle: "idle", actions: [{ key: "wave", label: "Wave" }] });
  assert.equal(element.src, "blob:1");
  assert.equal(element.loop, true);

  await player.playAction("wave");
  assert.equal(player.state, "action");
  assert.equal(element.loop, false);
  element.listeners.ended();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(player.state, "idle");
  assert.equal(element.loop, true);

  player.dispose();
  assert.deepEqual(revoked.sort(), ["blob:1", "blob:2"]);
});

test("animation player rejects unknown actions", async () => {
  const player = new NvaAnimationPlayer(video(), {
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  });
  const paths = ["idle", "talk", "wave", "sit"].map((name) => `clips/${name}.webm`);
  await player.load({
    manifest: manifest(),
    assets: new Map(paths.map((path) => [path, new Blob([path])])),
  });
  await assert.rejects(() => player.playAction("missing"), /unknown NVA action/);
});
