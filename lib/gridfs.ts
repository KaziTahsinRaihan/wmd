// GridFS helpers — store large binaries (audio, images) outside the question
// document, which is capped at 16MB. Embedded `data:` URLs are uploaded to a
// GridFS bucket and replaced with a small `/api/files/<id>` reference, so the
// rest of the app keeps using the value as an <audio>/<img> src unchanged.

import { GridFSBucket, ObjectId, type Db } from "mongodb";

const BUCKET = "files";

// Upload a `data:<mime>;base64,<data>` URL into GridFS; returns its serve URL.
async function uploadDataUrl(db: Db, dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl;
  const header = dataUrl.slice(5, comma); // strip leading "data:"
  const data = dataUrl.slice(comma + 1);
  const isBase64 = header.includes(";base64");
  const contentType = header.split(";")[0] || "application/octet-stream";
  const buffer = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf8");

  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const stream = bucket.openUploadStream("upload", { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });
  return `/api/files/${stream.id.toString()}`;
}

// Recursively replace every embedded `data:` URL in a payload with an uploaded
// GridFS reference. Leaves everything else untouched.
export async function deepUploadDataUrls(db: Db, value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    return value.startsWith("data:") ? uploadDataUrl(db, value) : value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) out.push(await deepUploadDataUrls(db, v));
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await deepUploadDataUrls(db, v);
    return out;
  }
  return value;
}

// Read a stored file back into memory for serving.
export async function getFile(
  db: Db,
  id: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return null;
  }
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = await bucket.find({ _id }).toArray();
  if (files.length === 0) return null;
  const f = files[0] as { contentType?: string; metadata?: { contentType?: string } };
  const contentType = f.contentType || f.metadata?.contentType || "application/octet-stream";
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const s = bucket.openDownloadStream(_id);
    s.on("data", (c: Buffer) => chunks.push(c));
    s.on("error", reject);
    s.on("end", () => resolve());
  });
  return { buffer: Buffer.concat(chunks), contentType };
}

// Collect every `/api/files/<id>` reference inside a payload (used to clean up
// GridFS when a question is deleted).
export function collectFileUrls(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.startsWith("/api/files/")) acc.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectFileUrls(v, acc));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectFileUrls(v, acc));
  }
  return acc;
}

export async function deleteFilesByUrls(db: Db, urls: string[]) {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  for (const u of urls) {
    const m = /\/api\/files\/([a-f0-9]{24})/.exec(u);
    if (!m) continue;
    try {
      await bucket.delete(new ObjectId(m[1]));
    } catch {
      /* already gone */
    }
  }
}
