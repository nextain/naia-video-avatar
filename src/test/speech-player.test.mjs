import test from "node:test";
import assert from "node:assert/strict";

import { SpeechPlayer } from "../main/speech-player.js";

test("SpeechPlayer rejects incomplete browser dependencies before touching media", () => {
  assert.throws(() => new SpeechPlayer({}), /audio, canvas, and bodyVideo/);
  assert.throws(() => new SpeechPlayer({
    audio: {}, canvas: {}, bodyVideo: {}, speechVideos: [{}, {}],
  }), /canvas must expose/);
});

test("SpeechPlayer exposes a read-only lifecycle and restores its ready state", () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener() {}, removeAttribute() {}, load() {},
  });
  const player = new SpeechPlayer({
    audio: media(),
    canvas: { getContext: () => ({}) },
    bodyVideo: media(), speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}), requestFrame: () => 1, cancelFrame() {},
  });
  player.state = "ready";
  player.token = player.playbackState.begin("speaking");
  player.stop("cancel");
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "cancel");
  player.dispose();
  assert.equal(player.state, "disposed");
});

test("SpeechPlayer restores ready state when browser media play rejects", async () => {
  const media = () => ({
    currentTime: 3, pause() {}, removeEventListener() {}, addEventListener() {}, removeAttribute() {}, load() {},
  });
  const audio = media(); audio.play = async () => { throw new Error("blocked"); };
  const body = media(); body.play = async () => {};
  const player = new SpeechPlayer({
    audio, canvas: { getContext: () => ({}) }, bodyVideo: body,
    speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}), requestFrame: () => 1, cancelFrame() {},
  });
  player.state = "ready";
  await assert.rejects(() => player.play(), /blocked/);
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "error");
  assert.equal(audio.currentTime, 0);
  assert.equal(body.currentTime, 0);
});

test("default browser frame functions retain their global invocation context", () => {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let cancelled = null;
  globalThis.requestAnimationFrame = function (callback) {
    assert.equal(this, globalThis);
    assert.equal(typeof callback, "function");
    return 41;
  };
  globalThis.cancelAnimationFrame = function (handle) {
    assert.equal(this, globalThis);
    cancelled = handle;
  };
  const media = () => ({ pause() {}, removeEventListener() {}, addEventListener() {}, load() {} });
  try {
    const player = new SpeechPlayer({
      audio: media(), canvas: { getContext: () => ({}) }, bodyVideo: media(),
      speechVideos: [media(), media()], imageLoader: async () => ({}),
    });
    assert.equal(player.requestFrame(() => {}), 41);
    player.cancelFrame(41);
    assert.equal(cancelled, 41);
  } finally {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});
