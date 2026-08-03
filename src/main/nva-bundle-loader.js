const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_FILES = 512;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function safePath(path) {
  if (typeof path !== "string" || !path || path.includes("\\") || path.startsWith("/")
      || /^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  return path.split("/").every((part) => part && part !== "." && part !== "..");
}

function mimeType(path) {
  if (/\.webm$/i.test(path)) return "video/webm";
  if (/\.mp4$/i.test(path)) return "video/mp4";
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  if (/\.json$/i.test(path)) return "application/json";
  if (/\.wav$/i.test(path)) return "audio/wav";
  return "application/octet-stream";
}

function findEocd(view) {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset--) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("NVA ZIP end record is missing");
}

async function inflate(method, compressed) {
  if (method === 0) return compressed;
  if (method !== 8) throw new Error(`unsupported NVA ZIP compression method: ${method}`);
  if (typeof DecompressionStream !== "function")
    throw new Error("this browser cannot decompress NVA ZIP entries");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function loadNvaBundle(file, {
  maxBytes = MAX_ARCHIVE_BYTES,
  maxFiles = MAX_FILES,
} = {}) {
  if (!(file instanceof Blob) || file.size <= 0 || file.size > maxBytes)
    throw new Error("NVA bundle exceeds the 100 MiB limit");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(view);
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const filesOnDisk = view.getUint16(eocd + 8, true);
  const fileCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || filesOnDisk !== fileCount || fileCount > maxFiles)
    throw new Error("NVA ZIP file table is invalid");
  if (centralOffset + centralSize > bytes.length || fileCount === 0)
    throw new Error("NVA ZIP central directory is invalid");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = [];
  const paths = new Set();
  let expandedBytes = 0;
  let cursor = centralOffset;
  for (let index = 0; index < fileCount; index++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== CENTRAL_SIGNATURE)
      throw new Error("NVA ZIP central entry is invalid");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length || flags & 1 || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff)
      throw new Error("NVA ZIP entry metadata is invalid");
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor = end;
    if (path.endsWith("/")) continue;
    if (!safePath(path) || paths.has(path)) throw new Error("NVA ZIP file table is invalid");
    paths.add(path);
    expandedBytes += uncompressedSize;
    if (!Number.isSafeInteger(expandedBytes) || expandedBytes > maxBytes)
      throw new Error("expanded NVA assets exceed the 100 MiB limit");
    if (path === "manifest.json" && uncompressedSize > MAX_MANIFEST_BYTES)
      throw new Error("NVA manifest exceeds the 1 MiB limit");
    entries.push({ path, method, compressedSize, uncompressedSize, localOffset });
  }

  const assets = new Map();
  let manifest = null;
  for (const entry of entries) {
    const offset = entry.localOffset;
    if (offset + 30 > bytes.length || view.getUint32(offset, true) !== LOCAL_SIGNATURE)
      throw new Error(`invalid local ZIP entry: ${entry.path}`);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > bytes.length) throw new Error(`truncated NVA ZIP entry: ${entry.path}`);
    const inflated = await inflate(entry.method, bytes.subarray(dataStart, dataEnd));
    if (inflated.byteLength !== entry.uncompressedSize)
      throw new Error(`NVA ZIP size mismatch: ${entry.path}`);
    if (entry.path === "manifest.json") {
      manifest = JSON.parse(decoder.decode(inflated));
    } else {
      assets.set(entry.path, new Blob([inflated], { type: mimeType(entry.path) }));
    }
  }
  if (!manifest) throw new Error("manifest.json is missing");
  return { manifest, assets, files: entries.length, bytes: expandedBytes };
}
