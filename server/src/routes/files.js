// Serves uploaded binaries (question audio/images, avatars). Unauthenticated
// by design — same as the reference app/_api/files/[id]/route.ts this
// replaces — ids are opaque autoincrement integers, and <img>/<audio> tags
// can't send an Authorization header anyway. Supports HTTP Range so audio
// scrubbing/duration works.

const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool } = require("../db");
const { UPLOAD_ROOT } = require("../utils/files");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).send("Not found");

    const [rows] = await pool.query(`SELECT stored_path, mime_type, size_bytes FROM files WHERE id = ?`, [id]);
    const file = rows[0];
    if (!file) return res.status(404).send("Not found");

    const fullPath = path.join(UPLOAD_ROOT, file.stored_path);
    const stat = await fs.promises.stat(fullPath).catch(() => null);
    if (!stat) return res.status(404).send("Not found");

    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match && match[1] ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) {
        res.setHeader("Content-Range", `bytes */${stat.size}`);
        return res.status(416).end();
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", String(end - start + 1));
      fs.createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(stat.size));
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
