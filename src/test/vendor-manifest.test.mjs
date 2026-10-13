import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// SoT 4: web and shell take the canonical player files byte for byte. This
// manifest is the value their vendor tests compare against.
const manifest = JSON.parse(readFileSync(new URL("../../vendor-manifest.json", import.meta.url), "utf8"));

test("vendor manifest matches the canonical player files", () => {
  assert.equal(manifest.source_directory, "src/main");
  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = readFileSync(new URL(`../main/${name}`, import.meta.url));
    assert.equal(bytes.length, expected.size, `${name} size`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256, `${name} sha256`);
  }
});
