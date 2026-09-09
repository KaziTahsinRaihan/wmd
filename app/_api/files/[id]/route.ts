// Serves a binary (audio/image) stored in GridFS by its id.
import { getDb } from "@/lib/mongodb";
import { getFile } from "@/lib/gridfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const file = await getFile(db, params.id);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        // Length + range support let <audio> report a finite duration.
        "Content-Length": String(file.buffer.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}
