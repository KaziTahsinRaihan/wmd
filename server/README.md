# Wise Man's Doctrine — API server

Express + MySQL backend for the IELTS prep frontend. Implements real
authentication (student/instructor/admin) and instructor/admin question
upload. The old `app/_api/*` reference routes (never actually wired up —
Next.js doesn't serve `_`-prefixed folders) and their MongoDB/GridFS helpers
have been removed; this server is the one real backend now.

Deploying to cPanel? See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## One-time setup

1. Create the database and load the schema (already done for you in this
   environment — `ielts_prep` exists with all tables from `../database.sql`).
   To redo it from scratch:
   ```
   mysql -u root -p -e "CREATE DATABASE ielts_prep CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p ielts_prep < ../database.sql
   ```
2. `cp .env.example .env` and fill in your MySQL credentials.
3. `npm install`

## Running

```
npm run dev     # nodemon, auto-restarts on file changes
npm start       # plain node
```

Listens on `http://localhost:4000` by default (`PORT` in `.env`).

On first boot, if no admin account exists yet, one is seeded from
`ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (defaults to
`admin@demo.io` / `1234`). **Change this password from the admin dashboard
(Settings → Admin account) immediately.** Every other account (student,
instructor) is created via `/signup` — there are no other seeded demo users.

## Frontend wiring

**Local dev**: the Next.js app (`next.config.js`) proxies `/api/*` to this
server (`next dev` only), so the frontend's existing relative
`fetch("/api/...")` calls work unchanged — no `NEXT_PUBLIC_API_URL` needed.

**Production (static export)**: that proxy doesn't run in the exported
build, so the frontend is built with `NEXT_PUBLIC_API_URL` pointing at this
server's public URL instead, and this server's `PUBLIC_URL` is set so file
URLs it returns (question images/audio, avatars) are absolute rather than
relative to the wrong origin. See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for
the full cPanel walkthrough.

## What's implemented

- **Auth** (`/api/auth/*`): signup (student/instructor only — admin is
  never self-registered), login (email + password + role), logout, `/me`.
  Sessions are opaque bearer tokens (`auth_tokens` table), not JWT, so
  logout / credential changes actually revoke access immediately.
- **Account** (`/api/me`, `/api/me/credentials`): update profile fields
  (name, phone, gender, IELTS target, avatar); change email and/or
  password (requires current password, re-issues the session token and
  revokes every other one).
- **Question bank** (`/api/questions`, instructor + admin only): the same
  op-based contract `lib/authoring.ts` already spoke to (`saveQuestion`,
  `updateQuestion`, `deleteQuestion`, `createFolder`, `deleteFolder`) —
  now backed by MySQL. Embedded `data:` image/audio URLs in a question
  payload are extracted to real files on disk (`/uploads`) + a `files` row
  on save, and orphaned files are cleaned up on update/delete. Instructors
  only see/edit their own questions; admins see/edit everyone's.
- **Files** (`/api/files/:id`): serves uploaded binaries with Range support
  (needed for audio seeking). Unauthenticated by design, matching the
  original reference implementation — ids are opaque integers and
  `<img>`/`<audio>` tags can't send an Authorization header anyway.

## Not yet implemented (future phases, per the docx's feature list)

- Student-facing question reads / attempt submission / server-side scoring
  (`answer_keys` table is not populated yet — the full `AuthoredTest` JSON,
  answer key included, is still stored as-is in `questions.payload`).
- Everything else in the docx outside auth + question authoring: courses,
  enrollments, live classes, writing/speaking grading, leaderboard, chat,
  voice rooms, AI practice, admin user management/reports.
