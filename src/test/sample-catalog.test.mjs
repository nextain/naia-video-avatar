import assert from "node:assert/strict";
import test from "node:test";

import { loadSampleCatalog, validateSampleCatalog } from "../main/sample-catalog.js";

const PAGE = "http://127.0.0.1:8099/src/main/viewer.html";

test("catalog resolves samples relative to the catalog URL", () => {
  assert.deepEqual(validateSampleCatalog({
    version: "1",
    samples: [{ label: " Jina ", url: "sample-01.nva" }],
  }, { catalogUrl: "http://127.0.0.1:8099/examples/.local/catalog.json", pageUrl: PAGE }), [{
    label: "Jina", url: "http://127.0.0.1:8099/examples/.local/sample-01.nva",
  }]);
});

test("catalog rejects cross-origin URLs, credentials, fragments and duplicates", () => {
  for (const url of [
    "https://example.com/avatar.nva", "http://user:pass@127.0.0.1:8099/a.nva", "a.nva#part",
  ]) {
    assert.throws(() => validateSampleCatalog({
      version: "1", samples: [{ label: "sample", url }],
    }, { catalogUrl: "http://127.0.0.1:8099/catalog.json", pageUrl: PAGE }), /Player's HTTP origin/);
  }
  assert.throws(() => validateSampleCatalog({
    version: "1", samples: [{ label: "same", url: "a.nva" }, { label: "same", url: "b.nva" }],
  }, { catalogUrl: "http://127.0.0.1:8099/catalog.json", pageUrl: PAGE }), /duplicate/);
});

test("catalog fetch applies response budget and rejects redirects away from origin", async () => {
  const oversized = new Uint8Array(65 * 1024);
  await assert.rejects(loadSampleCatalog("/catalog.json", {
    pageUrl: PAGE,
    fetchImpl: async () => new Response(oversized, { status: 200 }),
  }), /limit/);

  await assert.rejects(loadSampleCatalog("/catalog.json", {
    pageUrl: PAGE,
    fetchImpl: async () => ({
      ok: true, status: 200, url: "https://example.com/catalog.json",
      headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0),
    }),
  }), /Player's HTTP origin/);
});

test("catalog loader returns validated entries", async () => {
  const payload = JSON.stringify({ version: "1", samples: [{ label: "Naia", url: "naia.nva" }] });
  const samples = await loadSampleCatalog("/examples/catalog.json", {
    pageUrl: PAGE,
    fetchImpl: async () => new Response(payload, {
      status: 200,
      headers: { "content-length": String(new TextEncoder().encode(payload).byteLength) },
    }),
  });
  assert.equal(samples[0].url, "http://127.0.0.1:8099/examples/naia.nva");
});
