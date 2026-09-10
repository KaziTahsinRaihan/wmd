const { pool } = require("../db");
const { hashToken } = require("../utils/tokens");

// Reads `Authorization: Bearer <token>`, resolves it against auth_tokens,
// and attaches the full user row (minus password_hash) to req.user.
// Expired tokens are lazily deleted here.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }
    const tokenHash = hashToken(token);
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.gender,
              u.target_month, u.target_year, u.target_score, u.target_country,
              u.onboarded, u.avatar_file_id, t.expires_at
       FROM auth_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ?`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ ok: false, error: "Session expired, please log in again" });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query(`DELETE FROM auth_tokens WHERE token_hash = ?`, [tokenHash]);
      return res.status(401).json({ ok: false, error: "Session expired, please log in again" });
    }
    if (row.status !== "active") {
      return res.status(403).json({ ok: false, error: "Your account is not active" });
    }
    req.user = row;
    req.tokenHash = tokenHash;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "You don't have permission to do that" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
