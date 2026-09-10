const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { generateToken, hashToken } = require("../utils/tokens");
const { toPublicUser } = require("../utils/serialize");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;

async function issueToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await pool.query(`INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, [
    userId,
    hashToken(token),
    expiresAt,
  ]);
  return token;
}

async function loadUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, status, phone, gender, target_month, target_year,
            target_score, target_country, onboarded, avatar_file_id
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0];
}

// Only student/instructor may self-register. Admin accounts are never
// created through signup — the platform is seeded with one admin account
// (see src/scripts/init-db.js) which can then create/promote other admins
// through the admin dashboard.
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, role, gender } = req.body || {};

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ ok: false, error: "Name is required" });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ ok: false, error: "A valid email is required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
    }
    if (role !== "student" && role !== "instructor") {
      return res.status(400).json({ ok: false, error: "Role must be student or instructor" });
    }
    if (role === "student" && gender !== "male" && gender !== "female") {
      return res.status(400).json({ ok: false, error: "Gender is required for students" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [settingRows] = await pool.query(`SELECT setting_value FROM settings WHERE setting_key = 'allow_signup'`);
    const allowSignup = settingRows[0] ? settingRows[0].setting_value !== "0" : true;
    if (!allowSignup) {
      return res.status(403).json({ ok: false, error: "Sign-ups are currently disabled" });
    }

    const [existing] = await pool.query(`SELECT id FROM users WHERE email = ?`, [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ ok: false, error: "That email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, gender, onboarded)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [name.trim(), normalizedEmail, passwordHash, role, role === "student" ? gender : null, role !== "student"],
    );

    const user = await loadUserById(result.insertId);
    const token = await issueToken(user.id);
    res.status(201).json({ ok: true, user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
    const row = rows[0];

    // Generic message on every failure branch so login can't be used to
    // enumerate which emails/roles exist.
    const invalid = () => res.status(401).json({ ok: false, error: "Invalid email, password, or role" });

    if (!row) return invalid();
    if (role && row.role !== role) return invalid();
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return invalid();
    if (row.status !== "active") {
      return res.status(403).json({ ok: false, error: `Your account is ${row.status}. Contact an administrator.` });
    }

    const token = await issueToken(row.id);
    res.json({ ok: true, user: toPublicUser(row), token });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM auth_tokens WHERE token_hash = ?`, [req.tokenHash]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ ok: true, user: toPublicUser(req.user) });
});

module.exports = router;
