import { animKind, derive, isPropExcluded, propActions, validateManifest } from "./nva-core.js";

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
    this.sequence = 0;
    this.activePropSequence = null;
    this.onEnded = () => {
      if (this.state === "prop" && this.activePropSequence?.token === this.sequence) {
        this.activePropSequence.advance();
        return;
      }
      if (["action", "speech"].includes(this.state)) void this.playIdle();
    };
    this.onError = () => { if (["action", "speech", "talking", "prop"].includes(this.state)) void this.playIdle(); };
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
    this.talkKey = (manifest.nva_version === "0.2" && derived.talkKey) ? derived.talkKey : null;

    const regularActions = Object.entries(manifest.animations)
      .filter(([key, animation]) => animKind(animation) === "gesture" && !isPropExcluded(manifest, key, animation))
      .map(([key, animation]) => ({ key, label: animation.label || key }));

    const props = propActions(manifest);
    this.propMap = new Map(props.map((p) => [p.key, p]));

    const combinedActions = [
      ...regularActions,
      ...props.map((p) => ({ key: p.key, label: p.label })),
    ];

    const labelCounts = new Map();
    for (const a of combinedActions) {
      labelCounts.set(a.label, (labelCounts.get(a.label) || 0) + 1);
    }
    const used = new Set();
    for (const a of combinedActions) {
      if (labelCounts.get(a.label) === 1) {
        used.add(a.label);
      }
    }
    this.actions = combinedActions.map((a) => {
      if (labelCounts.get(a.label) === 1) {
        return { key: a.key, label: a.label };
      }
      const base = `${a.label} (${a.key})`;
      let candidate = base;
      let counter = 2;
      while (used.has(candidate)) {
        candidate = `${base} ${counter++}`;
      }
      used.add(candidate);
      return { key: a.key, label: candidate };
    });

    this.speechClips = Object.entries(manifest.speech_clips || {})
      .map(([key, speech]) => ({ key, label: speech.label || key }));
    this.state = "ready";
    await this.#show(this.idleKey, true, false);
    return {
      idle: this.idleKey,
      idles: [this.idleKey],
      actions: [...this.actions],
      speechClips: [...this.speechClips],
      talking: this.talkKey,
    };
  }

  async playIdle() {
    this.sequence += 1;
    if (!this.manifest || this.state === "disposed") throw new Error("animation player is not ready");
    this.state = "idle";
    await this.#show(this.idleKey, true, true);
  }

  async playAction(key) {
    if (!this.actions?.some((action) => action.key === key)) throw new Error(`unknown NVA action: ${key}`);
    const seqToken = ++this.sequence;
    const prop = this.propMap?.get(key);
    if (prop) {
      const steps = [];
      if (prop.enter) steps.push(prop.enter);
      steps.push(key, key);
      if (prop.exit) steps.push(prop.exit);

      let stepIndex = 0;
      const advance = async () => {
        if (seqToken !== this.sequence || this.state === "disposed") return;
        const isLast = stepIndex === steps.length - 1;
        this.state = isLast ? "action" : "prop";
        const currentKey = steps[stepIndex++];
        await this.#show(currentKey, false, true);
      };

      this.activePropSequence = {
        token: seqToken,
        advance: () => {
          if (seqToken !== this.sequence || this.state === "disposed") return;
          advance().catch((_err) => {
            if (seqToken === this.sequence && this.state !== "disposed") {
              void this.playIdle().catch(() => {});
            }
          });
        },
      };

      const isLast = steps.length === 1;
      this.state = isLast ? "action" : "prop";
      const firstKey = steps[stepIndex++];
      try {
        await this.#show(firstKey, false, true);
      } catch (error) {
        if (seqToken === this.sequence && this.state !== "disposed") {
          await this.playIdle().catch(() => {});
        }
        throw error;
      }
      return;
    }

    this.state = "action";
    await this.#show(key, false, true);
  }

  async playTalking() {
    if (this.manifest?.nva_version !== "0.2" || !this.talkKey) throw new Error("NVA has no talking animation");
    this.sequence += 1;
    this.state = "talking";
    await this.#show(this.talkKey, true, true);
  }

  async playSpeech(key) {
    const speech = this.manifest?.speech_clips?.[key];
    if (!speech) throw new Error(`unknown packaged speech video: ${key}`);
    this.sequence += 1;
    this.state = "speech";
    await this.#showPath(speech.clip, false, true, false);
  }

  stop() {
    this.generation += 1;
    this.sequence += 1;
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
    if (autoplay) {
      try {
        await this.video.play();
      } catch (error) {
        if (error?.name === "AbortError" && (generation !== this.generation || this.state === "disposed")) {
          return;
        }
        throw error;
      }
    }
  }

  #releaseUrls() {
    for (const url of this.urls.values()) this.urlApi.revokeObjectURL(url);
    this.urls.clear();
  }
}
