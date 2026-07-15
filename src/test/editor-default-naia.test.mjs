import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const html = readFileSync(new URL("../main/editor.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(
  new URL("../../examples/naia.nva/manifest.json", import.meta.url), "utf8"));

assert.doesNotMatch(html, /id="loadDemo"/, "editor must not expose the box demo button");
assert.doesNotMatch(html, /status\.loadDemo|btn\.loadDemo/, "removed box demo has no stale UI strings");
assert.match(html, /const base="\.\.\/\.\.\/examples\/naia\.nva"/, "Naia button loads canonical example");
assert.deepEqual([manifest.canvas.width, manifest.canvas.height], [720, 1280]);
assert.equal(manifest.animations.speak.head_image, "clips/speak_head.png");
assert.deepEqual(manifest.animations.speak.ditto_region, [104, 113, 512, 512]);

console.log("editor default Naia preset: PASS");
