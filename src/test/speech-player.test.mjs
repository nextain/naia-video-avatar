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

test("SpeechPlayer accepts an external browser TTS clock and restores ready state", async () => {
  const media = () => ({
    currentTime: 0, pause() {}, removeEventListener() {}, addEventListener() {},
    removeAttribute() {}, load() {}, async play() {},
  });
  let frameCallback = null;
  const player = new SpeechPlayer({
    audio: media(), canvas: { getContext: () => ({}) }, bodyVideo: media(),
    speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}),
    requestFrame: (callback) => { frameCallback = callback; return 1; },
    cancelFrame() {},
  });
  player.state = "ready";
  player.mode = "external";
  await player.playExternal(() => 0.25);
  assert.equal(player.state, "speaking");
  assert.equal(typeof frameCallback, "function");
  player.stop("complete");
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "complete");
});

test("SpeechPlayer reports asynchronous playback errors after restoring ready state", () => {
  const media = () => ({
    pause() {}, removeEventListener() {}, addEventListener() {}, removeAttribute() {}, load() {},
  });
  const failures = [];
  const player = new SpeechPlayer({
    audio: media(), canvas: { getContext: () => ({}) }, bodyVideo: media(),
    speechVideos: [media(), media()],
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    imageLoader: async () => ({}), requestFrame: () => 1, cancelFrame() {},
    onPlaybackError: (error) => failures.push(error.message),
  });
  player.state = "ready";
  player.token = player.playbackState.begin("speaking");
  player.onAudioError();
  assert.equal(player.state, "ready");
  assert.equal(player.playbackState.lastOutcome, "error");
  assert.deepEqual(failures, ["NVA audio playback failed"]);
  player.onAudioError();
  assert.equal(failures.length, 1);
});
