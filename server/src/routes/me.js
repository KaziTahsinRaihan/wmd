const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { toPublicUser } = require("../utils/serialize");
const { saveDataUrl } = require("../utils/files");
const { generateToken, hashToken } = require("../utils/tokens");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;

router.use(requireAuth);

async function loadUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, status, phone, gender, target_month, target_year,
            target_score, target_country, onboarded, avatar_file_id
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0];
}

// Update profile fields — name, phone, gender, IELTS target, onboarding
// state, and (optionally) a new avatar sent as a data: URL.
router.patch("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const sets = [];
    const values = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return res.status(400).json({ ok: false, error: "Name can't be empty" });
      sets.push("name = ?");
      values.push(name);
    }
    if (body.phone !== undefined) {
      sets.push("phone = ?");
      values.push(body.phone ? String(body.phone).trim() : null);
    }
    if (body.gender !== undefined) {
      if (body.gender !== null && body.gender !== "male" && body.gender !== "female") {
        return res.status(400).json({ ok: false, error: "Invalid gender" });
      }
      sets.push("gender = ?");
      values.push(body.gender);
    }
    if (body.targetMonth !== undefined) {
      sets.push("target_month = ?");
      values.push(body.targetMonth || null);
    }
    if (body.targetYear !== undefined) {
      sets.push("target_year = ?");
      values.push(body.targetYear || null);
    }
    if (body.targetScore !== undefined) {
      sets.push("target_score = ?");
      values.push(body.targetScore || null);
    }
    if (body.targetCountry !== undefined) {
      sets.push("target_country = ?");
      values.push(body.targetCountry ? String(body.targetCountry).trim() : null);
    }
    if (body.onboarded !== undefined) {
      sets.push("onboarded = ?");
      values.push(body.onboarded ? 1 : 0);
    }
    if (body.avatar !== undefined) {
      if (body.avatar === null) {
        sets.push("avatar_file_id = ?");
        values.push(null);
      } else if (typeof body.avatar === "string" && body.avatar.startsWith("data:")) {
        const url = await saveDataUrl(pool, body.avatar, req.user.id);
        const fileId = Number(url.split("/").pop());
        sets.push("avatar_file_id = ?");
        values.push(fileId);
      }
    }

    if (sets.length) {
      values.push(req.user.id);
      await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
    }

    const updated = await loadUserById(req.user.id);
    res.json({ ok: true, user: toPublicUser(updated) });
  } catch (err) {
    next(err);
  }
});

// Change email and/or password. Requires the current password. Re-issues a
// fresh session token and revokes every other session for this account, so
// a stolen/old token stops working the moment credentials change.
router.patch("/credentials", async (req, res, next) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ ok: false, error: "Current password is required" });
    }
    if (!newEmail && !newPassword) {
      return res.status(400).json({ ok: false, error: "Provide a new email and/or a new password" });
    }

    const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    const row = rows[0];
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) return res.status(401).json({ ok: false, error: "Current password is incorrect" });

    const sets = [];
    const values = [];

    if (newEmail) {
      const normalized = String(newEmail).trim().toLowerCase();
      if (!EMAIL_RE.test(normalized)) {
        return res.status(400).json({ ok: false, error: "That doesn't look like a valid email" });
      }
      if (normalized !== row.email) {
        const [dupe] = await pool.query(`SELECT id FROM users WHERE email = ? AND id <> ?`, [normalized, row.id]);
        if (dupe.length) return res.status(409).json({ ok: false, error: "That email is already in use" });
        sets.push("email = ?");
        values.push(normalized);
      }
    }
    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ ok: false, error: "New password must be at least 6 characters" });
      }
      sets.push("password_hash = ?");
      values.push(await bcrypt.hash(newPassword, 12));
    }

    if (sets.length) {
      values.push(row.id);
      await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, values);
    }

    // Revoke every existing session (including this one) and issue a fresh
    // token so the caller stays signed in under the new credentials.
    await pool.query(`DELETE FROM auth_tokens WHERE user_id = ?`, [row.id]);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await pool.query(`INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, [
      row.id,
      hashToken(token),
      expiresAt,
    ]);

    const updated = await loadUserById(row.id);
    res.json({ ok: true, user: toPublicUser(updated), token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
