// Converts embedded `data:` URLs (images/audio pasted into the question
// builder) into real files on disk + a `files` row, mirroring the old
// GridFS-based lib/gridfs.ts helper but against MySQL + the local disk.

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");

// When the frontend is a static export hosted on a different origin than
// this API (the normal cPanel setup), file references embedded in question
// payloads / avatars must be absolute — a bare "/api/files/9" resolves
// against the frontend's own origin, not this server's. Leave PUBLIC_URL
// unset for local dev (Next's rewrite proxy makes relative URLs work fine
// there).
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
function fileUrl(id) {
  return `${PUBLIC_URL}/api/files/${id}`;
}

const EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// Upload one `data:<mime>;base64,<data>` URL; returns its serve URL.
async function saveDataUrl(pool, dataUrl, uploaderId) {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl;
  const header = dataUrl.slice(5, comma); // strip leading "data:"
  const data = dataUrl.slice(comma + 1);
  const isBase64 = header.includes(";base64");
  const mime = (header.split(";")[0] || "").trim() || "application/octet-stream";
  const buffer = isBase64 ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf8");

  const maxBytes = Number(process.env.MAX_UPLOAD_MB || 30) * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error(`Upload exceeds the ${process.env.MAX_UPLOAD_MB || 30}MB limit`);
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.join(UPLOAD_ROOT, yyyy, mm);
  await ensureDir(dir);
  const ext = EXT_BY_MIME[mime] || "bin";
  const filename = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  const storedPath = [yyyy, mm, filename].join("/");

  const [result] = await pool.query(
    `INSERT INTO files (uploader_id, stored_path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)`,
    [uploaderId ?? null, storedPath, null, mime, buffer.length],
  );
  return fileUrl(result.insertId);
}

// Recursively replace every embedded `data:` URL inside a JSON-ish value with
// an uploaded file reference. Leaves everything else untouched.
async function deepUploadDataUrls(pool, value, uploaderId) {
  if (typeof value === "string") {
    return value.startsWith("data:") ? saveDataUrl(pool, value, uploaderId) : value;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) out.push(await deepUploadDataUrls(pool, v, uploaderId));
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await deepUploadDataUrls(pool, v, uploaderId);
    return out;
  }
  return value;
}

// Collect every "/api/files/<id>" reference inside a JSON-ish value (used to
// clean up orphaned files when a question is updated/deleted). Matches both
// relative (dev) and absolute (PUBLIC_URL-prefixed, production) forms.
function collectFileUrls(value, acc = []) {
  if (typeof value === "string") {
    if (fileIdFromUrl(value) != null) acc.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectFileUrls(v, acc));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectFileUrls(v, acc));
  }
  return acc;
}

function fileIdFromUrl(url) {
  const m = /\/api\/files\/(\d+)/.exec(url);
  return m ? Number(m[1]) : null;
}

async function deleteFilesByIds(pool, ids) {
  const clean = [...new Set(ids)].filter((id) => Number.isInteger(id));
  if (!clean.length) return;
  const [rows] = await pool.query(`SELECT id, stored_path FROM files WHERE id IN (?)`, [clean]);
  for (const row of rows) {
    try {
      await fs.unlink(path.join(UPLOAD_ROOT, row.stored_path));
    } catch {
      /* already gone */
    }
  }
  await pool.query(`DELETE FROM files WHERE id IN (?)`, [clean]);
}

async function deleteFilesByUrls(pool, urls) {
  await deleteFilesByIds(pool, urls.map(fileIdFromUrl).filter((id) => id != null));
}

module.exports = {
  UPLOAD_ROOT,
  fileUrl,
  saveDataUrl,
  deepUploadDataUrls,
  collectFileUrls,
  fileIdFromUrl,
  deleteFilesByIds,
  deleteFilesByUrls,
};
