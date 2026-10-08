const DEFAULT_MAX_CATALOG_BYTES = 64 * 1024;
const DEFAULT_MAX_NVA_BYTES = 200 * 1024 * 1024;
const MAX_SAMPLES = 32;
const MAX_LABEL_LENGTH = 80;

function sameOriginHttpUrl(value, baseUrl, pageUrl) {
  const resolved = new URL(value, baseUrl);
  const page = new URL(pageUrl);
  if (!/^https?:$/.test(resolved.protocol) || resolved.origin !== page.origin
      || resolved.username || resolved.password || resolved.hash) {
    throw new Error("sample URLs must use the Player's HTTP origin");
  }
  return resolved;
}

function contentLength(response, limit) {
  const raw = response.headers?.get?.("content-length");
  if (raw === null || raw === undefined || raw === "") return;
  const bytes = Number(raw);
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > limit)
    throw new Error(`response exceeds the ${limit}-byte limit`);
}

async function boundedBytes(response, limit) {
  contentLength(response, limit);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > limit) throw new Error(`response exceeds the ${limit}-byte limit`);
  return bytes;
}

function checkedResponseUrl(response, requested, pageUrl) {
  if (!response.ok) throw new Error(`request failed with HTTP ${response.status}`);
  return sameOriginHttpUrl(response.url || requested.href, requested, pageUrl);
}

export function validateSampleCatalog(value, { catalogUrl, pageUrl }) {
  const catalog = sameOriginHttpUrl(catalogUrl, pageUrl, pageUrl);
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== "1"
      || !Array.isArray(value.samples) || value.samples.length > MAX_SAMPLES) {
    throw new Error("invalid NVA sample catalog");
  }
  const labels = new Set();
  return value.samples.map((sample) => {
    if (!sample || typeof sample !== "object" || Array.isArray(sample)
        || Object.keys(sample).some((key) => !["label", "url"].includes(key))
        || typeof sample.label !== "string" || !sample.label.trim()
        || sample.label.length > MAX_LABEL_LENGTH || typeof sample.url !== "string"
        || sample.url.length > 512) {
      throw new Error("invalid NVA sample catalog entry");
    }
    const label = sample.label.trim();
    if (labels.has(label)) throw new Error(`duplicate sample label: ${label}`);
    labels.add(label);
    return { label, url: sameOriginHttpUrl(sample.url, catalog, pageUrl).href };
  });
}

export async function loadSampleCatalog(catalogUrl, {
  pageUrl = globalThis.location?.href,
  fetchImpl = globalThis.fetch,
  maxBytes = DEFAULT_MAX_CATALOG_BYTES,
  signal,
} = {}) {
  if (!pageUrl || typeof fetchImpl !== "function") throw new Error("catalog loading is unavailable");
  const requested = sameOriginHttpUrl(catalogUrl, pageUrl, pageUrl);
  const response = await fetchImpl(requested.href, {
    credentials: "same-origin", cache: "no-store", redirect: "error", signal,
  });
  const finalUrl = checkedResponseUrl(response, requested, pageUrl);
  const bytes = await boundedBytes(response, maxBytes);
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("sample catalog is not valid UTF-8 JSON");
  }
  return validateSampleCatalog(value, { catalogUrl: finalUrl.href, pageUrl });
}

export async function fetchNvaSample(sampleUrl, {
  pageUrl = globalThis.location?.href,
  fetchImpl = globalThis.fetch,
  maxBytes = DEFAULT_MAX_NVA_BYTES,
  signal,
} = {}) {
  if (!pageUrl || typeof fetchImpl !== "function") throw new Error("sample loading is unavailable");
  const requested = sameOriginHttpUrl(sampleUrl, pageUrl, pageUrl);
  const response = await fetchImpl(requested.href, {
    credentials: "same-origin", cache: "no-store", redirect: "error", signal,
  });
  checkedResponseUrl(response, requested, pageUrl);
  const bytes = await boundedBytes(response, maxBytes);
  if (!bytes.byteLength) throw new Error("sample NVA is empty");
  return new File([bytes], requested.pathname.split("/").pop() || "sample.nva", {
    type: "application/zip",
  });
}
