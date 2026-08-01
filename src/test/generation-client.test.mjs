import test from "node:test";
import assert from "node:assert/strict";

import { GenerationClient } from "../main/generation-client.js";

const responses = [];
const fakeFetch = async (url, init = {}) => {
  responses.push({ url, init });
  if (url.endsWith("/v1/sources")) return Response.json({ source_asset_id: "src_01JINA2Y7Q0M8T6R4P2N" });
  if (url.endsWith("/v1/generation/jobs") && init.method === "POST")
    return Response.json({ job_id: "job_01JINA2Y7Q0M8T6R4P2N" });
  if (url.endsWith("/v1/generation/jobs/job_01JINA2Y7Q0M8T6R4P2N") && !init.method)
    return Response.json({ status: "running", progress: 0.5 });
  if (url.endsWith("/cancel")) return Response.json({ status: "cancelled" });
  return new Response("not found", { status: 404 });
};

test("client uploads source once then creates an opaque generation job", async () => {
  responses.length = 0;
  const client = new GenerationClient("https://naia.example", fakeFetch);
  const source = await client.uploadSource(new Blob(["image"], { type: "image/png" }));
  const job = await client.createJob({
    version: "1",
    source_asset_id: source.source_asset_id,
    representation: "factorized-difference-layer",
    inventory_version: "1.0.0",
  });
  assert.equal(job.job_id.startsWith("job_"), true);
  assert.equal(responses[0].init.headers["Content-Type"], "image/png");
  assert.equal(responses[1].init.body.includes("image"), false);
});

test("client exposes status and cancellation without provider details", async () => {
  const client = new GenerationClient("https://naia.example/", fakeFetch);
  assert.deepEqual(await client.getJob("job_01JINA2Y7Q0M8T6R4P2N"), { status: "running", progress: 0.5 });
  assert.deepEqual(await client.cancelJob("job_01JINA2Y7Q0M8T6R4P2N"), { status: "cancelled" });
});

test("client strips undeclared server fields from observable job state", async () => {
  const client = new GenerationClient("https://naia.example", async () => Response.json({
    status: "running", progress: 0.25, internal_source_path: "/private/jina.png",
  }));
  assert.deepEqual(await client.getJob("job_01JINA2Y7Q0M8T6R4P2N"), { status: "running", progress: 0.25 });
});

test("provider error details never cross the public client boundary", async () => {
  const client = new GenerationClient("https://naia.example", async () => Response.json({
    detail: "token=/private/model secret=abc",
  }, { status: 500 }));
  await assert.rejects(
    () => client.getJob("job_01JINA2Y7Q0M8T6R4P2N"),
    (error) => error.code === "GENERATION_SERVICE_ERROR" && !error.message.includes("private"),
  );
});

test("optional bearer credentials stay in headers and bundle download uses them", async () => {
  const calls = [];
  const client = new GenerationClient("https://naia.example", async (url, init) => {
    calls.push({ url, init });
    return new Response("zip", { status: 200, headers: { "Content-Type": "application/zip" } });
  }, () => "session-token");
  assert.equal(await (await client.downloadBundle("job_01JINA2Y7Q0M8T6R4P2N")).text(), "zip");
  assert.equal(calls[0].init.headers.Authorization, "Bearer session-token");
  assert.equal(calls[0].url.includes("session-token"), false);
  assert.equal(calls[0].init.body, undefined);
});

test("client enforces source, job-state, and final bundle bounds", async () => {
  const client = new GenerationClient("https://generation.example", async () => new Response(JSON.stringify({
    status: "mystery", progress: 2,
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  await assert.rejects(() => client.uploadSource(new Blob(["x"], { type: "image/gif" })), /image Blob/);
  await assert.rejects(() => client.getJob("job_01JINA2Y7Q0M8T6R4P2N"), /invalid job state/);

  const emptyBundle = new GenerationClient("https://generation.example", async () => new Response(new Blob([])));
  await assert.rejects(() => emptyBundle.downloadBundle("job_01JINA2Y7Q0M8T6R4P2N"), /invalid generation bundle/);
});
