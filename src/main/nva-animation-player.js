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
    this.onEnded = () => { if (this.state === "action") void this.playIdle(); };
    this.onError = () => { if (this.state === "action") void this.playIdle(); };
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
    this.state = "ready";
    await this.#show(this.idleKey, true, false);
    return { idle: this.idleKey, actions: [...this.actions] };
  }

  async playIdle() {
    if (!this.manifest || this.state === "disposed") throw new Error("animation player is not ready");
    await this.#show(this.idleKey, true, true);
    this.state = "idle";
  }

  async playAction(key) {
    if (!this.actions?.some((action) => action.key === key)) throw new Error(`unknown NVA action: ${key}`);
    await this.#show(key, false, true);
    this.state = "action";
  }

  stop() {
    this.video.pause();
    if (this.manifest && this.state !== "disposed") this.state = "ready";
  }

  dispose() {
    this.stop();
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
    const source = this.#urlFor(animation.clip);
    const changed = this.video.src !== source;
    this.video.loop = loop;
    this.video.muted = true;
    this.video.playsInline = true;
    if (changed) {
      this.video.src = source;
      await waitForMedia(this.video);
    } else {
      this.video.currentTime = 0;
    }
    if (autoplay) await this.video.play();
  }

  #releaseUrls() {
    for (const url of this.urls.values()) this.urlApi.revokeObjectURL(url);
    this.urls.clear();
  }
}
