require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const questionRoutes = require("./routes/questions");
const fileRoutes = require("./routes/files");

const app = express();

// cPanel/Passenger (and any reverse proxy) sits in front of this app —
// trust its X-Forwarded-* headers (correct req.ip, req.secure, etc.).
app.set("trust proxy", 1);

// CLIENT_ORIGIN accepts a comma-separated list (e.g. the www and non-www
// variants of your domain, or staging + production) — a single origin works
// unchanged.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, same-origin) — allow.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "35mb" })); // question payloads embed base64 audio/images

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/files", fileRoutes);

app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err.message || "Internal server error" });
});

// Seed the one admin account on first boot only — if any admin already
// exists (e.g. it was changed from the dashboard), this is a no-op.
async function seedAdmin() {
  const [rows] = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (rows.length) return;
  const email = (process.env.ADMIN_EMAIL || "admin@demo.io").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "1234";
  const name = process.env.ADMIN_NAME || "Admin Office";
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, onboarded) VALUES (?, ?, ?, 'admin', 'active', 1)`,
    [name, email, passwordHash],
  );
  console.log(`Seeded initial admin account: ${email} — change this password from the admin dashboard.`);
}

const PORT = Number(process.env.PORT || 4000);

seedAdmin()
  .catch((err) => {
    console.error("Failed to seed admin account:", err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Wise Man's Doctrine API listening on http://localhost:${PORT}`);
    });
  });
