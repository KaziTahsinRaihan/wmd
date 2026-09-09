// Key/value persistence API backed by MongoDB. Each app storage key is stored
// as one document { _id: key, value: <raw JSON string>, updatedAt } in the
// `kv` collection. The client (lib/mongo-sync) hydrates localStorage from here
// on load and mirrors every write back, so all app data lives in MongoDB while
// the existing synchronous module code is left untouched.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "kv";

type KvDoc = { _id: string; value: string; updatedAt?: Date };

// GET /api/kv            -> { ok, data: { [key]: value } } for every stored key
// GET /api/kv?key=foo    -> { ok, value } for a single key (null if missing)
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const col = db.collection<KvDoc>(COLLECTION);
    const key = new URL(req.url).searchParams.get("key");

    if (key) {
      const doc = await col.findOne({ _id: key });
      return NextResponse.json({ ok: true, value: doc?.value ?? null });
    }

    const docs = await col.find({}).toArray();
    const data: Record<string, string> = {};
    for (const d of docs) data[d._id] = d.value;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

// PUT /api/kv  body: { key: string, value: string }  -> upsert one key
export async function PUT(req: Request) {
  try {
    const { key, value } = (await req.json()) as { key?: string; value?: string };
    if (typeof key !== "string" || typeof value !== "string") {
      return NextResponse.json(
        { ok: false, error: "Expected { key: string, value: string }" },
        { status: 400 },
      );
    }
    const db = await getDb();
    await db
      .collection<KvDoc>(COLLECTION)
      .updateOne(
        { _id: key },
        { $set: { value, updatedAt: new Date() } },
        { upsert: true },
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

// DELETE /api/kv?key=foo  -> remove one key
export async function DELETE(req: Request) {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ ok: false, error: "Missing key" }, { status: 400 });
    }
    const db = await getDb();
    await db.collection<KvDoc>(COLLECTION).deleteOne({ _id: key });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
