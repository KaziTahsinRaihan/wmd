// Question bank API — stores the bank directly in MongoDB (the bank is far too
// large for localStorage once audio/images are embedded). Two collections:
//   qb_folders   — folder tree per module
//   qb_questions — saved questions (and answer sheets), one document each
//
// GET  /api/questions                 -> { ok, folders, questions }
// POST /api/questions  { op, ... }     -> mutate (saveQuestion / createFolder /
//                                         deleteFolder / deleteQuestion)

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { collectFileUrls, deepUploadDataUrls, deleteFilesByUrls } from "@/lib/gridfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDERS = "qb_folders";
const QUESTIONS = "qb_questions";

const newId = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const pathEq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Drop Mongo's _id; our objects carry their own `id`.
function strip<T extends { _id?: unknown }>(doc: T) {
  const { _id, ...rest } = doc;
  return rest;
}

export async function GET() {
  try {
    const db = await getDb();
    const folders = await db.collection(FOLDERS).find({}).toArray();
    const questions = await db
      .collection(QUESTIONS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({
      ok: true,
      folders: folders.map(strip),
      questions: questions.map(strip),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();

    switch (body.op) {
      case "saveQuestion": {
        // Move any embedded audio/image (data: URLs) into GridFS so the
        // document stays well under MongoDB's 16MB limit.
        const payload = await deepUploadDataUrls(db, body.payload);
        const q = {
          id: newId("q"),
          module: body.module,
          folderPath: body.folderPath ?? [],
          name: (body.name || "").trim() || "Untitled question",
          createdAt: new Date().toISOString(),
          payload,
        };
        await db.collection(QUESTIONS).insertOne({ _id: q.id as never, ...q });
        return NextResponse.json({ ok: true, question: q });
      }

      case "createFolder": {
        const name = (body.name || "").trim();
        if (!name) return NextResponse.json({ ok: false, error: "Empty name" }, { status: 400 });
        const existing = await db.collection(FOLDERS).find({ module: body.module }).toArray();
        if (existing.some((f) => pathEq(f.path, body.path ?? []) && f.name === name)) {
          return NextResponse.json({ ok: true }); // already exists — no-op
        }
        const folder = {
          id: newId("folder"),
          module: body.module,
          path: body.path ?? [],
          name,
          createdAt: new Date().toISOString(),
        };
        await db.collection(FOLDERS).insertOne({ _id: folder.id as never, ...folder });
        return NextResponse.json({ ok: true, folder });
      }

      case "deleteFolder": {
        const path: string[] = body.path ?? [];
        const fullPath = [...path, body.name];
        const folders = await db.collection(FOLDERS).find({ module: body.module }).toArray();
        const questions = await db.collection(QUESTIONS).find({ module: body.module }).toArray();
        const folderIds = folders
          .filter(
            (f) =>
              (pathEq(f.path, path) && f.name === body.name) ||
              (f.path.length >= fullPath.length && pathEq(f.path.slice(0, fullPath.length), fullPath)),
          )
          .map((f) => f._id);
        const removedQuestions = questions.filter(
          (q) =>
            q.folderPath.length >= fullPath.length &&
            pathEq(q.folderPath.slice(0, fullPath.length), fullPath),
        );
        const questionIds = removedQuestions.map((q) => q._id);
        // Free the GridFS files belonging to the removed questions.
        await deleteFilesByUrls(db, removedQuestions.flatMap((q) => collectFileUrls(q.payload)));
        if (folderIds.length) await db.collection(FOLDERS).deleteMany({ _id: { $in: folderIds } });
        if (questionIds.length)
          await db.collection(QUESTIONS).deleteMany({ _id: { $in: questionIds } });
        return NextResponse.json({ ok: true });
      }

      case "updateQuestion": {
        const doc = await db.collection(QUESTIONS).findOne({ _id: body.id as never });
        if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
        const payload = await deepUploadDataUrls(db, body.payload);
        // Free GridFS files the new payload no longer references.
        const oldUrls = collectFileUrls(doc.payload);
        const newUrls = new Set(collectFileUrls(payload));
        await deleteFilesByUrls(db, oldUrls.filter((u) => !newUrls.has(u)));
        const name = (body.name || doc.name || "").trim() || "Untitled question";
        await db
          .collection(QUESTIONS)
          .updateOne({ _id: body.id as never }, { $set: { name, payload, updatedAt: new Date().toISOString() } });
        const updated = await db.collection(QUESTIONS).findOne({ _id: body.id as never });
        return NextResponse.json({ ok: true, question: strip(updated as never) });
      }

      case "deleteQuestion": {
        const doc = await db.collection(QUESTIONS).findOne({ _id: body.id as never });
        if (doc) await deleteFilesByUrls(db, collectFileUrls(doc.payload));
        await db.collection(QUESTIONS).deleteOne({ _id: body.id as never });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, error: "Unknown op" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
