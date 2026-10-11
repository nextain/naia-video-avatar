// Browser-native TTS adapter for the serverless NVA Player.
// Web Speech does not expose PCM or phoneme timing, so this path is always
// approximate and uses a neutral speech-activity animation clock.

const APPROXIMATE_AUDIO_SHA256 = "0".repeat(64);
const ACTIVITY_UNITS = Object.freeze(["closed", "vowel-mid"]);

export function buildBrowserTtsPreviewPlan({
  durationUs = 120_000_000,
  stepUs = 160_000,
} = {}) {
  if (!Number.isSafeInteger(durationUs) || durationUs <= 0)
    throw new TypeError("durationUs must be a positive safe integer");
  if (!Number.isSafeInteger(stepUs) || stepUs < 40_000 || stepUs > durationUs)
    throw new TypeError("stepUs must be between 40000 and durationUs");

  const events = [];
  let startUs = 0;
  let index = 0;
  while (startUs < durationUs) {
    const endUs = Math.min(startUs + stepUs, durationUs);
    events.push({
      unit: ACTIVITY_UNITS[index % ACTIVITY_UNITS.length],
      start_us: startUs,
      end_us: endUs,
    });
    startUs = endUs;
    index += 1;
  }
  return {
    version: "1",
    text: "",
    audio: { sha256: APPROXIMATE_AUDIO_SHA256, duration_us: durationUs },
    quality_mode: "approximate",
    events,
  };
}

export class BrowserTts {
  constructor({
    synthesis = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    now = () => globalThis.performance.now(),
  } = {}) {
    if (!synthesis || typeof synthesis.speak !== "function" || typeof synthesis.cancel !== "function")
      throw new Error("Browser speech synthesis is not available");
    if (typeof Utterance !== "function") throw new Error("SpeechSynthesisUtterance is not available");
    if (typeof now !== "function") throw new TypeError("now must be a function");
    this.synthesis = synthesis;
    this.Utterance = Utterance;
    this.now = now;
    this.active = null;
  }

  voices() {
    const voices = this.synthesis.getVoices?.() || [];
    return [...voices].sort((left, right) =>
      `${left.lang}\u0000${left.name}`.localeCompare(`${right.lang}\u0000${right.name}`));
  }

  get speaking() {
    return this.active !== null;
  }

  currentTimeSeconds() {
    if (!this.active || this.active.startedAtMs === null) return 0;
    return Math.max(0, (this.now() - this.active.startedAtMs) / 1000);
  }

  speak({ text, voiceURI = "", lang = "", rate = 1, pitch = 1, onStart } = {}) {
    const value = String(text || "").trim();
    if (!value) throw new TypeError("text is required");
    if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) throw new TypeError("rate must be between 0.5 and 2");
    if (!Number.isFinite(pitch) || pitch < 0.5 || pitch > 2) throw new TypeError("pitch must be between 0.5 and 2");
    this.cancel();

    const utterance = new this.Utterance(value);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (lang) utterance.lang = lang;
    const voice = this.voices().find((candidate) => candidate.voiceURI === voiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    let resolveDone;
    let rejectDone;
    const done = new Promise((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    const active = {
      utterance,
      startedAtMs: null,
      settle: (outcome, error) => {
        if (this.active !== active) return;
        this.active = null;
        if (error) rejectDone(error);
        else resolveDone({ outcome });
      },
    };
    this.active = active;
    utterance.onstart = () => {
      if (this.active !== active) return;
      active.startedAtMs = this.now();
      onStart?.();
    };
    utterance.onend = () => active.settle("complete");
    utterance.onerror = (event) => {
      const reason = event?.error || "unknown";
      active.settle("error", new Error(`browser TTS failed: ${reason}`));
    };
    this.synthesis.speak(utterance);
    return done;
  }

  cancel() {
    const active = this.active;
    if (!active) return false;
    this.synthesis.cancel();
    active.settle("cancel");
    return true;
  }
}
