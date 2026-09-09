// Student attempts API — one document per (question, student) in the `attempts`
// collection; re-submitting overwrites.
//
// GET  /api/attempts?questionId=&studentEmail=  -> { ok, attempt }   (single)
// GET  /api/attempts?questionId=                -> { ok, attempts }  (per question)
// GET  /api/attempts?studentEmail=              -> { ok, attempts }  (per student)
// POST /api/attempts  { questionId, questionName, module, studentEmail, answers }

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { deepUploadDataUrls } from "@/lib/gridfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "attempts";
const strip = <T extends { _id?: unknown }>(doc: T) => {
  const { _id, ...rest } = doc;
  return rest;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const questionId = url.searchParams.get("questionId");
    const studentEmail = url.searchParams.get("studentEmail");
    const db = await getDb();
    const col = db.collection(COLLECTION);

    if (questionId && studentEmail) {
      const doc = await col.findOne({ questionId, studentEmail });
      return NextResponse.json({ ok: true, attempt: doc ? strip(doc) : null });
    }
    const filter = questionId ? { questionId } : studentEmail ? { studentEmail } : {};
    const docs = await col.find(filter).sort({ submittedAt: -1 }).toArray();
    return NextResponse.json({ ok: true, attempts: docs.map(strip) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { questionId, questionName, module, studentEmail, answers } = body;
    if (!questionId || !studentEmail) {
      return NextResponse.json(
        { ok: false, error: "questionId and studentEmail are required" },
        { status: 400 },
      );
    }
    const db = await getDb();
    const col = db.collection(COLLECTION);
    const submittedAt = new Date().toISOString();
    const id = `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    // Large binaries (e.g. speaking recordings) are moved to GridFS so the
    // attempt document stays small; values become /api/files/<id> refs.
    const uploaded = await deepUploadDataUrls(db, answers ?? {});
    await col.updateOne(
      { questionId, studentEmail },
      {
        $set: { questionName, module, answers: uploaded, submittedAt },
        $setOnInsert: { _id: id as never, questionId, studentEmail },
      },
      { upsert: true },
    );
    const doc = await col.findOne({ questionId, studentEmail });
    return NextResponse.json({ ok: true, attempt: doc ? strip(doc) : null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
