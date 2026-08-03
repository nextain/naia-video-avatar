import test from "node:test";
import assert from "node:assert/strict";

import { SpeechAtlasSource } from "../main/speech-atlas-source.js";

test("local atlas reads use Blob.slice without a network dependency", async () => {
  const source = new SpeechAtlasSource(new Blob(["abcdefghij"]));
  assert.equal(await (await source.read(2, 5)).text(), "cde");
});

test("HTTP atlas requests an inclusive byte range", async () => {
  const calls = [];
  const source = new SpeechAtlasSource("https://cdn.example/atlas.bin", async (url, init) => {
    calls.push({ url, init });
    return new Response("cde", { status: 206, headers: { "Content-Range": "bytes 2-4/10" } });
  });
  assert.equal(await (await source.read(2, 5)).text(), "cde");
  assert.equal(calls[0].init.headers.Range, "bytes=2-4");
});

test("a range-unsupported server is cached once and sliced locally", async () => {
  let calls = 0;
  const source = new SpeechAtlasSource("https://cdn.example/atlas.bin", async () => {
    calls++;
    return new Response("abcdefghij", { status: 200 });
  });
  assert.equal(await (await source.read(2, 5)).text(), "cde");
  assert.equal(await (await source.read(5, 8)).text(), "fgh");
  assert.equal(calls, 1);
  assert.equal(source.rangeSupported, false);
});

test("invalid ranges and mismatched 206 payloads fail closed", async () => {
  const source = new SpeechAtlasSource("https://cdn.example/atlas.bin", async () =>
    new Response("too-long", { status: 206, headers: { "Content-Range": "bytes 0-7/8" } }));
  await assert.rejects(() => source.read(0, 3), /range response/);
  await assert.rejects(() => source.read(-1, 3), /invalid byte range/);
});
