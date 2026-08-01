import { validateGenerationJob } from "./generation-contract.js";

const SOURCE_ID = /^src_[A-Za-z0-9]{12,64}$/;
const JOB_ID = /^job_[A-Za-z0-9]{12,64}$/;
const SOURCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const JOB_STATUSES = new Set(["queued", "running", "completed", "failed", "cancelled"]);
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;

async function jsonResponse(response) {
  let body;
  try { body = await response.json(); }
  catch {
    const error = new Error("generation service request failed");
    error.code = "GENERATION_SERVICE_ERROR";
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error("generation service request failed");
    error.code = "GENERATION_SERVICE_ERROR";
    error.status = response.status;
    throw error;
  }
  return body;
}

export class GenerationClient {
  constructor(baseUrl, fetchImplementation = globalThis.fetch, accessToken = null) {
    if (typeof baseUrl !== "string" || !/^https:\/\//.test(baseUrl))
      throw new TypeError("generation service requires an HTTPS base URL");
    if (typeof fetchImplementation !== "function") throw new TypeError("fetch implementation is required");
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetch = fetchImplementation;
    this.accessToken = accessToken;
  }

  async uploadSource(imageBlob) {
    if (!(imageBlob instanceof Blob) || !SOURCE_TYPES.has(imageBlob.type)
      || imageBlob.size <= 0 || imageBlob.size > MAX_SOURCE_BYTES)
      throw new TypeError("source must be an image Blob");
    const body = await jsonResponse(await this.fetch.call(globalThis, `${this.baseUrl}/v1/sources`, {
      method: "POST",
      headers: await this.#headers({ "Content-Type": imageBlob.type }),
      body: imageBlob,
    }));
    if (!SOURCE_ID.test(body.source_asset_id || "")) throw new Error("service returned an invalid source_asset_id");
    return { source_asset_id: body.source_asset_id };
  }

  async createJob(job) {
    const validation = validateGenerationJob(job);
    if (!validation.ok) throw new TypeError(`invalid GenerationJob: ${validation.errors.join("; ")}`);
    const body = await jsonResponse(await this.fetch.call(globalThis, `${this.baseUrl}/v1/generation/jobs`, {
      method: "POST",
      headers: await this.#headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(job),
    }));
    if (!JOB_ID.test(body.job_id || "")) throw new Error("service returned an invalid job_id");
    return { job_id: body.job_id };
  }

  async getJob(jobId) {
    this.#assertJobId(jobId);
    const body = await jsonResponse(await this.fetch.call(globalThis, `${this.baseUrl}/v1/generation/jobs/${jobId}`, {
      headers: await this.#headers(),
    }));
    if (!JOB_STATUSES.has(body.status)
      || (body.progress !== undefined && (!Number.isFinite(body.progress) || body.progress < 0 || body.progress > 1)))
      throw new Error("service returned an invalid job state");
    return {
      status: body.status,
      ...(Number.isFinite(body.progress) ? { progress: body.progress } : {}),
    };
  }

  async cancelJob(jobId) {
    this.#assertJobId(jobId);
    const body = await jsonResponse(await this.fetch.call(globalThis, `${this.baseUrl}/v1/generation/jobs/${jobId}/cancel`, {
      method: "POST",
      headers: await this.#headers(),
    }));
    if (!JOB_STATUSES.has(body.status)) throw new Error("service returned an invalid job state");
    return { status: body.status };
  }

  bundleUrl(jobId) {
    this.#assertJobId(jobId);
    return `${this.baseUrl}/v1/generation/jobs/${jobId}/bundle`;
  }

  async downloadBundle(jobId) {
    const response = await this.fetch.call(globalThis, this.bundleUrl(jobId), {
      headers: await this.#headers(),
    });
    if (!response.ok) await jsonResponse(response);
    const blob = await response.blob();
    if (blob.size <= 0 || blob.size > MAX_BUNDLE_BYTES)
      throw new Error("service returned an invalid generation bundle");
    return blob;
  }

  async #headers(base = {}) {
    const token = typeof this.accessToken === "function" ? await this.accessToken() : this.accessToken;
    return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base };
  }

  #assertJobId(jobId) {
    if (!JOB_ID.test(jobId || "")) throw new TypeError("invalid job_id");
  }
}
