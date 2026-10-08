import test from "node:test";
import assert from "node:assert/strict";

import {
  AlternatingSpeechDecoder,
  drawBlendedFactorizedSpeechFrame,
  drawBlendedWholeHeadSpeechFrame,
  drawFactorizedSpeechFrame,
} from "../main/speech-browser-runtime.js";

test("factorized compositor draws neutral head before speech difference layer", () => {
  const calls = [];
  const context = {
    globalCompositeOperation: "copy",
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    drawImage: (image, ...rect) => calls.push([image.id, ...rect]),
  };
  drawFactorizedSpeechFrame(context, { id: "neutral" }, { id: "layer" }, [10, 20, 512, 512]);
  assert.deepEqual(calls, ["save", ["neutral", 10, 20, 512, 512], ["layer", 10, 20, 512, 512], "restore"]);
  assert.equal(context.globalCompositeOperation, "copy");
});

test("factorized compositor blends no more than two transition layers over one neutral head", () => {
  const calls = [];
  const context = {
    globalCompositeOperation: "copy", globalAlpha: 0.25,
    save: () => calls.push("save"), restore: () => calls.push("restore"),
    drawImage: (item) => calls.push([item.id, context.globalAlpha]),
  };
  drawBlendedFactorizedSpeechFrame(context, { id: "neutral" }, [
    { image: { id: "left" }, opacity: 0.75 },
    { image: { id: "right" }, opacity: 0.25 },
  ], [0, 0, 512, 512]);
  assert.deepEqual(calls, ["save", ["neutral", 1], ["left", 0.75], ["right", 0.25], "restore"]);
  assert.equal(context.globalCompositeOperation, "copy");
  assert.equal(context.globalAlpha, 0.25);
});

test("whole-head compositor draws first layer opaque (alpha 1) and second layer with its opacity over neutral head", () => {
  const calls = [];
  const context = {
    globalCompositeOperation: "copy", globalAlpha: 0.25,
    save: () => calls.push("save"), restore: () => calls.push("restore"),
    drawImage: (item) => calls.push([item.id, context.globalAlpha]),
  };
  drawBlendedWholeHeadSpeechFrame(context, { id: "neutral" }, [
    { image: { id: "first" }, opacity: 0.75 },
    { image: { id: "second" }, opacity: 0.25 },
  ], [280, 70, 158, 242]);
  assert.deepEqual(calls, ["save", ["neutral", 1], ["first", 1], ["second", 0.25], "restore"]);
  assert.equal(context.globalCompositeOperation, "copy");
  assert.equal(context.globalAlpha, 0.25);
});

test("decoder alternates two video elements and revokes replaced URLs", async () => {
  const videos = [0, 1].map(() => ({
    listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    removeEventListener(name) { delete this.listeners[name]; },
    load() { queueMicrotask(() => this.listeners.loadeddata?.()); },
  }));
  let nextUrl = 0;
  const revoked = [];
  const decoder = new AlternatingSpeechDecoder(videos, {
    createObjectURL: () => `blob:${++nextUrl}`,
    revokeObjectURL: (url) => revoked.push(url),
  });
  assert.equal((await decoder.load(new Blob(["a"]))).slot, 0);
  assert.equal((await decoder.load(new Blob(["b"]))).slot, 1);
  assert.equal((await decoder.load(new Blob(["c"]))).slot, 0);
  assert.deepEqual(revoked, ["blob:1"]);
  decoder.dispose();
  assert.deepEqual(revoked, ["blob:1", "blob:3", "blob:2"]);
});
