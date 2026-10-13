import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  ESPEAK_NG_ENGINE,
  ESPEAK_VOICES,
  PHONE_MAP,
  REMOVE_MODIFIERS,
  REMOVE_TOKENS,
  SORTED_TOKEN_UNIT_PAIRS,
  SpeechUnitsError,
  createEspeakSpeechUnits,
  loadEspeakNgEngine,
  speechUnitsFromEspeakOutput,
  textToSpeechUnits,
} from "../main/speech-units-espeak.js";

// Expected values come from the gateway's own generate_speech_plan_units (nextain/any-llm 975b8294)
// run against the real eSpeak NG 1.52.0 — see fixture.source for the commands. The engine here is
// the real eSpeak NG (npm @echogarden/espeak-ng-emscripten 0.3.5) loaded in Node; nothing is mocked.
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/espeak-speech-units-gateway-975b8294.json", import.meta.url), "utf8"),
);
const engineDir = new URL("../main/espeak-ng/", import.meta.url);
const readEngineFile = async (name) => readFileSync(new URL(name, engineDir));
const importEngine = async () => import(new URL("espeak-ng.js", engineDir).href);

let enginePromise;
const realEngine = () => (enginePromise ??= loadEspeakNgEngine({ readFile: readEngineFile, importModule: importEngine }));

async function run(engine, text, language) {
  try {
    return { words: await textToSpeechUnits(engine, text, language) };
  } catch (error) {
    if (!(error instanceof SpeechUnitsError)) throw error;
    return { error_code: error.code, message: error.message };
  }
}

test("the frozen phone map and normalisation tables equal the gateway's at 975b8294", () => {
  const gateway = fixture.gateway_tables;
  assert.deepEqual(PHONE_MAP, gateway.PHONE_MAP);
  assert.deepEqual([...REMOVE_TOKENS].sort(), [...gateway.REMOVE_TOKENS].sort());
  assert.deepEqual([...REMOVE_MODIFIERS].sort(), [...gateway.REMOVE_MODIFIERS].sort());
  assert.deepEqual(SORTED_TOKEN_UNIT_PAIRS, gateway.SORTED_TOKEN_UNIT_PAIRS);
  assert.deepEqual(Object.keys(ESPEAK_VOICES).sort(), Object.keys(fixture.cases.reduce((all, c) => ({ ...all, [c.language]: 1 }), {})).sort());
});

test("the engine files are the pinned package bytes (version check) and listed as third_party", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../vendor-manifest.json", import.meta.url), "utf8"));
  for (const [name, expected] of Object.entries(ESPEAK_NG_ENGINE.files)) {
    const bytes = readFileSync(new URL(name, engineDir));
    assert.equal(bytes.length, expected.size, name);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256, name);
    assert.deepEqual(manifest.third_party.files[`espeak-ng/${name}`], { sha256: expected.sha256, size: expected.size });
  }
  const copying = readFileSync(new URL("COPYING", engineDir));
  assert.equal(manifest.third_party.files["espeak-ng/COPYING"].sha256, createHash("sha256").update(copying).digest("hex"));
  assert.equal(manifest.third_party.package, ESPEAK_NG_ENGINE.package);
  assert.equal(manifest.third_party.version, ESPEAK_NG_ENGINE.package_version);
  assert.equal(manifest.third_party.upstream, "https://github.com/espeak-ng/espeak-ng");
});

test("an engine file that differs from the pinned bytes is refused", async () => {
  const tampered = async (name) => {
    const bytes = new Uint8Array(await readEngineFile(name));
    if (name === "espeak-ng.js") bytes[bytes.length - 1] ^= 1;
    return bytes;
  };
  await assert.rejects(loadEspeakNgEngine({ readFile: tampered, importModule: importEngine }), (error) => error.code === "engine_mismatch");
});

test(`real eSpeak NG output equals the gateway for all ${fixture.cases.length} fixture sentences`, { timeout: 600_000 }, async () => {
  const engine = await realEngine();
  const mismatches = [];
  for (const sample of fixture.cases) {
    const actual = await run(engine, sample.text, sample.language);
    try {
      assert.deepEqual(actual, sample.expected);
    } catch {
      mismatches.push({ id: sample.id, expected: sample.expected, actual });
    }
  }
  assert.deepEqual(mismatches, []);
});

test("ja and zh return one whole-sentence item; other languages return word spans in UTF-16", async () => {
  const engine = await realEngine();
  for (const sample of fixture.cases.filter((c) => c.expected.words)) {
    const words = await textToSpeechUnits(engine, sample.text, sample.language);
    if (sample.language === "ja" || sample.language === "zh") {
      assert.equal(words.length, 1, sample.id);
      assert.deepEqual([words[0].char_start, words[0].char_end], [0, sample.text.length], sample.id);
    }
    for (const word of words) assert.deepEqual(Object.keys(word), ["char_start", "char_end", "units"], sample.id);
  }
});

test("lazy loader loads the engine on the first call only", async () => {
  let loads = 0;
  const speechUnits = createEspeakSpeechUnits({
    readFile: async (name) => {
      if (name === "espeak-ng.js") loads++;
      return readEngineFile(name);
    },
    importModule: importEngine,
  });
  assert.equal(loads, 0);
  const sample = fixture.cases.find((c) => c.id === "fixture-en");
  assert.deepEqual(await speechUnits(sample.text, "en"), sample.expected.words);
  assert.deepEqual(await speechUnits(sample.text, "en"), sample.expected.words);
  assert.equal(loads, 1);
  await assert.rejects(speechUnits("hello", "xx"), (error) => error.code === "unsupported_language");
});

test("rule edges follow the gateway: language-switch marker, empty text, unsupported language", () => {
  const events = [[1, 1, 5, null], [7, 1, 0, "h"]];
  assert.throws(() => speechUnitsFromEspeakOutput("hello", "en", { ipa: "(en)h_ə", events }), (e) => e.code === "alignment_failed");
  assert.throws(() => speechUnitsFromEspeakOutput("  ", "en", { ipa: "", events }), (e) => e.code === "alignment_failed");
  assert.throws(() => speechUnitsFromEspeakOutput("hello", "xx", { ipa: "", events }), (e) => e.code === "unsupported_language");
  assert.throws(() => speechUnitsFromEspeakOutput("hello", "en", { ipa: "", events: [[1, 1, 5, null], [7, 1, 0, "ɗ"]] }), (e) => e.code === "alignment_failed");
});
