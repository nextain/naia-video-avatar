import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { loadNvaBundle } from "../main/nva-bundle-loader.js";
import { validateGenerationResult } from "../main/generation-contract.js";
import { verifySpeechMotionBundle, verifySpeechAtlasAssets } from "../main/speech-bundle.js";
import { buildSpeechSchedule } from "../main/speech-runtime.js";

// The canonical speech-set bundles are 56-158 MB and are not stored in this
// repository. Point NVA_CANONICAL_DIR at a folder of them to run this check.
const dir = process.env.NVA_CANONICAL_DIR;
const files = dir && existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".nva")).sort() : [];

// SoT 2: 13 fixed mouth units, 169 transition clips plus 64 context clips.
const UNITS = [
  "sil", "closed", "labiodental", "dental", "alveolar", "postalveolar", "palatal", "velar", "glottal",
  "vowel-open", "vowel-mid", "vowel-spread", "vowel-round",
];

test("canonical speech-set folder is optional", { skip: files.length > 0 }, () => {});

for (const name of files) {
  test(`canonical speech set ${name}: contract, 233 clips, every pair key schedulable`, async () => {
    const bundle = await loadNvaBundle(new Blob([readFileSync(join(dir, name))]));
    const motion = bundle.manifest.speech_motion;
    assert.ok(motion, "speech_motion is required");
    const receipt = JSON.parse(await bundle.assets.get(motion.provenance).text());
    const contract = validateGenerationResult(receipt);
    assert.deepEqual(contract.errors, []);
    await verifySpeechMotionBundle(motion, bundle.assets);

    const index = JSON.parse(await bundle.assets.get(motion.atlas_index).text());
    await verifySpeechAtlasAssets(bundle.assets.get(motion.atlas), index);
    const keys = Object.keys(index.entries);
    const pairs = keys.filter((key) => key.split(">").length === 2);
    const contexts = keys.filter((key) => key.split(">").length === 3);
    assert.equal(keys.length, 233);
    assert.equal(pairs.length, 169);
    assert.equal(contexts.length, 64);
    for (const key of keys) for (const unit of key.split(">")) assert.ok(UNITS.includes(unit), `${key} uses ${unit}`);
    for (const previous of UNITS) for (const current of UNITS)
      assert.ok(index.entries[`${previous}>${current}`], `missing pair ${previous}>${current}`);

    // A browser-timed plan that walks every ordered unit pair must schedule
    // against the bundle's own keys without a missing atlas unit.
    const sequence = ["sil"];
    for (const previous of UNITS) for (const current of UNITS) sequence.push(previous, current);
    sequence.push("sil");
    const events = sequence.map((unit, position) => ({
      unit, start_us: position * 100_000, end_us: (position + 1) * 100_000,
    }));
    const schedule = buildSpeechSchedule({
      version: "1", quality_mode: "browser-timed", text: "canonical coverage",
      audio: { duration_us: events.at(-1).end_us }, events,
    }, { availableKeys: keys });
    assert.equal(schedule.transitions.length, events.length - 1);
    const used = new Set(schedule.transitions.map((item) => item.key));
    assert.ok([...used].every((key) => index.entries[key]));
  });
}
