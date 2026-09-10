// Question bank — instructor & admin only (student-facing read/attempt
// endpoints are a later phase). Mirrors the op-based contract the frontend's
// lib/authoring.ts already speaks to (saveQuestion / updateQuestion /
// deleteQuestion / createFolder / deleteFolder) so the client code needs no
// rewrite — just point it at this server.

const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { deepUploadDataUrls, collectFileUrls, deleteFilesByUrls, fileIdFromUrl } = require("../utils/files");

const router = express.Router();
const MODULES = ["listening", "reading", "writing", "speaking"];

router.use(requireAuth, requireRole("instructor", "admin"));

function canEdit(user, question) {
  return user.role === "admin" || question.author_id === user.id;
}

function toSaved(row) {
  return {
    id: String(row.id),
    module: row.module,
    name: row.name,
    createdAt: row.created_at,
    payload: row.payload,
  };
}

async function resolveFolderId(module, names, { create = false } = {}) {
  let parentId = null;
  for (const raw of names || []) {
    const name = String(raw).trim();
    if (!name) continue;
    const [rows] = await pool.query(
      parentId === null
        ? `SELECT id FROM question_folders WHERE module = ? AND name = ? AND parent_id IS NULL`
        : `SELECT id FROM question_folders WHERE module = ? AND name = ? AND parent_id = ?`,
      parentId === null ? [module, name] : [module, name, parentId],
    );
    if (rows[0]) {
      parentId = rows[0].id;
      continue;
    }
    if (!create) return null;
    const [ins] = await pool.query(`INSERT INTO question_folders (parent_id, module, name) VALUES (?, ?, ?)`, [
      parentId,
      module,
      name,
    ]);
    parentId = ins.insertId;
  }
  return parentId;
}

function foldersWithPaths(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r) => {
    const path = [];
    let cur = r.parent_id;
    while (cur != null) {
      const p = byId.get(cur);
      if (!p) break;
      path.unshift(p.name);
      cur = p.parent_id;
    }
    return { id: String(r.id), module: r.module, name: r.name, path, createdAt: r.created_at };
  });
}

router.get("/", async (req, res, next) => {
  try {
    const module = req.query.module;
    if (module && !MODULES.includes(module)) {
      return res.status(400).json({ ok: false, error: "Invalid module" });
    }
    const isAdmin = req.user.role === "admin";

    const qWhere = [];
    const qParams = [];
    if (!isAdmin) {
      qWhere.push("author_id = ?");
      qParams.push(req.user.id);
    }
    if (module) {
      qWhere.push("module = ?");
      qParams.push(module);
    }
    const [questions] = await pool.query(
      `SELECT * FROM questions ${qWhere.length ? "WHERE " + qWhere.join(" AND ") : ""} ORDER BY created_at DESC`,
      qParams,
    );

    const fWhere = module ? "WHERE module = ?" : "";
    const [folders] = await pool.query(`SELECT * FROM question_folders ${fWhere} ORDER BY name`, module ? [module] : []);

    res.json({ ok: true, folders: foldersWithPaths(folders), questions: questions.map(toSaved) });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const body = req.body || {};
  try {
    switch (body.op) {
      case "saveQuestion": {
        const { module, name, folderPath, payload } = body;
        if (!MODULES.includes(module)) return res.status(400).json({ ok: false, error: "Invalid module" });
        if (!payload || typeof payload !== "object") {
          return res.status(400).json({ ok: false, error: "Missing payload" });
        }
        const uploaded = await deepUploadDataUrls(pool, payload, req.user.id);
        const test = uploaded.test || {};
        const folderId = folderPath?.length ? await resolveFolderId(module, folderPath, { create: true }) : null;
        const audioFileId = typeof test.audio === "string" ? fileIdFromUrl(test.audio) : null;

        const [result] = await pool.query(
          `INSERT INTO questions
             (author_id, folder_id, module, name, status, start_number, writing_format, audio_file_id, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            folderId,
            module,
            (name || "").trim() || "Untitled question",
            test.status === "published" ? "published" : "draft",
            Number.isFinite(test.startNumber) ? test.startNumber : 1,
            test.writingFormat === "paper" || test.writingFormat === "computer" ? test.writingFormat : null,
            audioFileId,
            JSON.stringify(uploaded),
          ],
        );
        const [rows] = await pool.query(`SELECT * FROM questions WHERE id = ?`, [result.insertId]);
        return res.status(201).json({ ok: true, question: toSaved(rows[0]) });
      }

      case "updateQuestion": {
        const { id, name, payload } = body;
        const [rows] = await pool.query(`SELECT * FROM questions WHERE id = ?`, [id]);
        const existing = rows[0];
        if (!existing) return res.status(404).json({ ok: false, error: "Not found" });
        if (!canEdit(req.user, existing)) {
          return res.status(403).json({ ok: false, error: "You can only edit your own questions" });
        }
        if (!payload || typeof payload !== "object") {
          return res.status(400).json({ ok: false, error: "Missing payload" });
        }

        const uploaded = await deepUploadDataUrls(pool, payload, req.user.id);
        const oldUrls = collectFileUrls(existing.payload);
        const newUrls = new Set(collectFileUrls(uploaded));
        await deleteFilesByUrls(pool, oldUrls.filter((u) => !newUrls.has(u)));

        const test = uploaded.test || {};
        const audioFileId = typeof test.audio === "string" ? fileIdFromUrl(test.audio) : null;

        await pool.query(
          `UPDATE questions
           SET name = ?, status = ?, start_number = ?, writing_format = ?, audio_file_id = ?, payload = ?
           WHERE id = ?`,
          [
            (name || existing.name || "").trim() || "Untitled question",
            test.status === "published" ? "published" : "draft",
            Number.isFinite(test.startNumber) ? test.startNumber : 1,
            test.writingFormat === "paper" || test.writingFormat === "computer" ? test.writingFormat : null,
            audioFileId,
            JSON.stringify(uploaded),
            id,
          ],
        );
        const [updatedRows] = await pool.query(`SELECT * FROM questions WHERE id = ?`, [id]);
        return res.json({ ok: true, question: toSaved(updatedRows[0]) });
      }

      case "deleteQuestion": {
        const { id } = body;
        const [rows] = await pool.query(`SELECT * FROM questions WHERE id = ?`, [id]);
        const existing = rows[0];
        if (!existing) return res.json({ ok: true }); // already gone
        if (!canEdit(req.user, existing)) {
          return res.status(403).json({ ok: false, error: "You can only delete your own questions" });
        }
        await deleteFilesByUrls(pool, collectFileUrls(existing.payload));
        await pool.query(`DELETE FROM questions WHERE id = ?`, [id]);
        return res.json({ ok: true });
      }

      case "createFolder": {
        const { module, path, name } = body;
        if (!MODULES.includes(module)) return res.status(400).json({ ok: false, error: "Invalid module" });
        const trimmed = (name || "").trim();
        if (!trimmed) return res.status(400).json({ ok: false, error: "Empty name" });
        const parentId = await resolveFolderId(module, path || [], { create: true });
        const [existing] = await pool.query(
          parentId === null
            ? `SELECT id FROM question_folders WHERE module = ? AND name = ? AND parent_id IS NULL`
            : `SELECT id FROM question_folders WHERE module = ? AND name = ? AND parent_id = ?`,
          parentId === null ? [module, trimmed] : [module, trimmed, parentId],
        );
        if (existing.length) return res.json({ ok: true }); // already exists — no-op
        await pool.query(`INSERT INTO question_folders (parent_id, module, name) VALUES (?, ?, ?)`, [
          parentId,
          module,
          trimmed,
        ]);
        return res.json({ ok: true });
      }

      case "deleteFolder": {
        const { module, path, name } = body;
        if (!MODULES.includes(module)) return res.status(400).json({ ok: false, error: "Invalid module" });
        const folderId = await resolveFolderId(module, [...(path || []), name]);
        if (folderId == null) return res.json({ ok: true }); // already gone
        // Sub-folders cascade; questions filed under the deleted branch are
        // unfiled (folder_id -> NULL) rather than deleted, per the schema's
        // ON DELETE SET NULL — history/content survives folder reorganizing.
        await pool.query(`DELETE FROM question_folders WHERE id = ?`, [folderId]);
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ ok: false, error: "Unknown op" });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
