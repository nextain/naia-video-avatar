// Drift-trace patterns Luke named (SoT 3·4): the only file allowed to spell
// them out. lipsync-drift-guard.test.mjs scans the repository src with these.
export const SOUNDLESS_REPEAT = Object.freeze([
  ["talking loop", /playTalking|SPEECH_SEQUENCE|#show\(\s*this\.talkKey|motions\??\.talking\??\.clip|state\s*=\s*["']talking["']|talking[ _-]?loop/i],
]);

export const FORBIDDEN = Object.freeze([
  ["aiueo loop", /aiueo|a-i-u-e-o|아이우에오/i],
  ["volume threshold mouth", /createAnalyser|AnalyserNode|get(Byte|Float)(Frequency|TimeDomain)Data|\brms\b|volume[_-]?threshold|amplitude|loudness/i],
  ["drawn mouth", /draw[_-]?mouth|mouth[_-]?(open|shape|path|draw)|openness|\.ellipse\(|quadraticCurveTo|bezierCurveTo/i],
  ["approximate plan", /approximate/i],
  ...SOUNDLESS_REPEAT,
]);

export const SAMPLES = Object.freeze([
  "const AIUEO = ['a','i','u','e','o'];",
  "const analyser = ctx.createAnalyser();",
  "if (rms > volumeThreshold) open();",
  "drawMouth(ctx, openness);",
  "ctx.ellipse(x, y, w, h, 0, 0, 7);",
  "quality_mode: 'approximate'",
  "await player.playTalking();",
  "const SPEECH_SEQUENCE = [];",
  "await this.#show(this.talkKey, true, true);",
  "video.src = manifest.motions?.talking?.clip;",
  "this.state = \"talking\";",
  "<button id=\"talkingLoop\">",
]);

export const REPEAT_SAMPLES = Object.freeze(SAMPLES.slice(6));

export function scan(name, source, patterns = FORBIDDEN) {
  const hits = [];
  source.split("\n").forEach((line, index) => {
    for (const [label, pattern] of patterns) {
      if (pattern.test(line)) hits.push(`${name}:${index + 1} ${label}: ${line.trim().slice(0, 120)}`);
    }
  });
  return hits;
}
