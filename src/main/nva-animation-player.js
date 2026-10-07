import { animKind, derive, validateManifest } from "./nva-core.js";

function requiredAsset(assets, path) {
  const blob = assets?.get?.(path);
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error(`missing NVA asset: ${path}`);
  return blob;
}

function waitForMedia(video) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", loaded);
      video.removeEventListener("error", failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("NVA animation decode failed")); };
    video.addEventListener("loadeddata", loaded, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.load();
  });
}

export class NvaAnimationPlayer {
  constructor(video, { urlApi = globalThis.URL } = {}) {
    if (!video || typeof video.play !== "function" || typeof video.pause !== "function")
      throw new TypeError("video element is required");
    if (typeof urlApi?.createObjectURL !== "function" || typeof urlApi?.revokeObjectURL !== "function")
      throw new TypeError("object URL API is required");
    this.video = video;
    this.urlApi = urlApi;
    this.urls = new Map();
    this.state = "empty";
    this.generation = 0;
    this.onEnded = () => { if (["action", "speech"].includes(this.state)) void this.playIdle(); };
    this.onError = () => { if (["action", "speech"].includes(this.state)) void this.playIdle(); };
    video.addEventListener("ended", this.onEnded);
    video.addEventListener("error", this.onError);
  }

  async load({ manifest, assets }) {
    this.stop();
    this.#releaseUrls();
    const validation = validateManifest(manifest, { clipFiles: [...assets.keys()] });
    if (!validation.ok) throw new TypeError(`invalid NVA: ${validation.errors.join("; ")}`);
    const derived = derive(manifest);
    if (!derived.idleKey || !derived.idle) throw new Error("NVA requires an idle animation");
    this.manifest = manifest;
    this.assets = assets;
    this.idleKey = derived.idleKey;
    this.actions = Object.entries(manifest.animations)
      .filter(([, animation]) => animKind(animation) === "gesture")
      .map(([key, animation]) => ({ key, label: animation.label || key }));
    this.speechClips = Object.entries(manifest.speech_clips || {})
      .map(([key, speech]) => ({ key, label: speech.label || key }));
    this.state = "ready";
    await this.#show(this.idleKey, true, false);
    return { idle: this.idleKey, actions: [...this.actions], speechClips: [...this.speechClips] };
  }

  async playIdle() {
    if (!this.manifest || this.state === "disposed") throw new Error("animation player is not ready");
    this.state = "idle";
    await this.#show(this.idleKey, true, true);
  }

  async playAction(key) {
    if (!this.actions?.some((action) => action.key === key)) throw new Error(`unknown NVA action: ${key}`);
    this.state = "action";
    await this.#show(key, false, true);
  }

  async playSpeech(key) {
    const speech = this.manifest?.speech_clips?.[key];
    if (!speech) throw new Error(`unknown packaged speech video: ${key}`);
    this.state = "speech";
    await this.#showPath(speech.clip, false, true, false);
  }

  stop() {
    this.generation += 1;
    this.video.pause();
    if (this.manifest && this.state !== "disposed") this.state = "ready";
  }

  dispose() {
    this.stop();
    this.state = "disposed";
    this.video.removeEventListener("ended", this.onEnded);
    this.video.removeEventListener("error", this.onError);
    this.video.removeAttribute?.("src");
    this.video.load?.();
    this.#releaseUrls();
    this.state = "disposed";
  }

  #urlFor(path) {
    if (!this.urls.has(path)) this.urls.set(path, this.urlApi.createObjectURL(requiredAsset(this.assets, path)));
    return this.urls.get(path);
  }

  async #show(key, loop, autoplay) {
    const animation = this.manifest.animations[key];
    if (!animation) throw new Error(`missing NVA animation: ${key}`);
    await this.#showPath(animation.clip, loop, autoplay, true);
  }

  async #showPath(path, loop, autoplay, muted) {
    const generation = ++this.generation;
    const source = this.#urlFor(path);
    const changed = this.video.src !== source;
    this.video.loop = loop;
    this.video.muted = muted;
    this.video.playsInline = true;
    if (changed) {
      this.video.src = source;
      await waitForMedia(this.video);
    } else {
      this.video.currentTime = 0;
    }
    // A stop(), load(), dispose() or newer play request during the await
    // supersedes this one; never resume stale video or audio.
    if (generation !== this.generation || this.state === "disposed") return;
    if (autoplay) await this.video.play();
  }

  #releaseUrls() {
    for (const url of this.urls.values()) this.urlApi.revokeObjectURL(url);
    this.urls.clear();
  }
}
