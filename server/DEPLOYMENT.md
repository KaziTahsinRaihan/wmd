# Deploying to cPanel

Two pieces go up separately: this Express API (as a cPanel "Node.js
Application") and the Next.js static export (as plain files in
`public_html`, which you've already done). They end up on two different
URLs — typically your main domain for the frontend and a subdomain like
`api.yourdomain.com` for the API — talking to each other over HTTPS/CORS,
not a shared filesystem.

Replace `yourdomain.com` / `api.yourdomain.com` below with your real domain
throughout.

## Prerequisites

- Your cPanel account has **"Setup Node.js App"** (sometimes called "Node.js
  Selector") under the Software section. Almost all modern cPanel hosts have
  this (CloudLinux). If you don't see it, ask your host to enable it, or
  you'll need a VPS instead — shared hosting without it can't run a
  long-lived Node process.
- You can create MySQL databases in cPanel ("MySQL® Databases").
- SSH access is convenient but not required — everything below can be done
  through the cPanel UI and File Manager.

## 1. Create the subdomain for the API

**Domains → Create A New Domain** (or "Subdomains" on older cPanel themes) →
create `api.yourdomain.com`. Its document root doesn't matter — the Node.js
App setup in step 3 takes over serving that hostname.

## 2. Create the database

**MySQL® Databases**:

1. Create a database, e.g. `ielts_prep` — cPanel will prefix it, e.g.
   `cpaneluser_ielts_prep`.
2. Create a database user with a strong password — becomes e.g.
   `cpaneluser_wmd`.
3. Add that user to the database with **ALL PRIVILEGES**.

Then **phpMyAdmin** → select the new database → **Import** →
upload `database.sql` from the project root. This creates all 37 tables.

## 3. Upload the backend

Upload the `server/` folder somewhere **outside** `public_html` (so its
source isn't web-accessible) — e.g. `~/wmd-api`. Two ways:

- **Git** (if your host supports "Git Version Control" in cPanel, or you have
  SSH): clone/pull the repo, then use just the `server/` subfolder as the app
  root in the next step.
- **File Manager**: zip the `server/` folder locally (exclude `node_modules`
  and `.env` — they don't need to travel), upload the zip via File Manager,
  extract it into `~/wmd-api`.

Either way, do **not** upload `node_modules` — you'll install fresh on the
server in step 5 (native modules like `bcryptjs`'s optional bindings need to
build for the server's architecture, not yours).

## 4. Setup Node.js App

**Setup Node.js App → Create Application**:

- **Node.js version**: 18 or newer.
- **Application mode**: Production.
- **Application root**: `wmd-api` (the folder from step 3, relative to your
  home directory).
- **Application URL**: select `api.yourdomain.com`.
- **Application startup file**: `src/index.js`.

Click **Create**. cPanel now shows the app's detail page — keep it open, you
need it for the next two steps.

### Environment variables

On that same page, add these under **Environment variables** (click
"Add Variable" for each). Don't set `PORT` — cPanel injects its own and your
app already reads `process.env.PORT`.

| Variable | Value |
|---|---|
| `CLIENT_ORIGIN` | `https://yourdomain.com` (your frontend's exact origin; comma-separate if you serve both `https://yourdomain.com` and `https://www.yourdomain.com`) |
| `PUBLIC_URL` | `https://api.yourdomain.com` |
| `DB_HOST` | `localhost` (cPanel MySQL is local to the account) |
| `DB_PORT` | `3306` |
| `DB_USER` | `cpaneluser_wmd` (from step 2) |
| `DB_PASSWORD` | the password you set in step 2 |
| `DB_NAME` | `cpaneluser_ielts_prep` (from step 2) |
| `TOKEN_TTL_DAYS` | `30` |
| `ADMIN_NAME` | `Admin Office` |
| `ADMIN_EMAIL` | your real admin email — this is the account that actually gets created, so use one you control |
| `ADMIN_PASSWORD` | a strong password — **you still log in with it once**, then change it again from the dashboard for good measure |
| `UPLOAD_DIR` | `uploads` |
| `MAX_UPLOAD_MB` | `30` |

### Install & start

Still on the app's detail page:

1. Click **Run NPM Install** (installs `express`, `mysql2`, etc. fresh for
   the server).
2. Click **Restart**.
3. Confirm it's running:
   ```
   curl https://api.yourdomain.com/api/health
   ```
   should return `{"ok":true}`. If not, open the app's **Errors log** link on
   that same detail page — it's almost always a DB credential typo or a
   missing `npm install`.

The admin account seeds itself on that first successful boot, from the
`ADMIN_*` variables above — check the log for
`Seeded initial admin account: ...`.

## 5. Point the frontend at it and rebuild

The frontend is a **static export** — `NEXT_PUBLIC_API_URL` is baked in at
`npm run build` time, so you rebuild locally (or wherever you build it) and
re-upload, same as your first deploy:

1. In the project root, create `.env.production`:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
2. `npm run build` — this also copies `.htaccess` into `out/` (the
   `postbuild` script already does this).
3. Upload the contents of `out/` into `public_html`, replacing the previous
   deploy, exactly as you did the first time.

## 6. Verify end to end

On the live site:

1. `/login` → log in as admin with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` you
   set in step 4.
2. **Settings → Admin account** → change the password (and email, if you
   want something different from what you seeded) right away.
3. `/signup` → create a test instructor account.
4. **Add Mock Questions** → build and publish one question for each module
   (listening/reading/writing/speaking) → confirm it appears in
   **Question Bank** and that any pasted image/audio actually loads (this
   is the `PUBLIC_URL` wiring — if images are broken, `PUBLIC_URL` is
   probably missing or wrong).

## Troubleshooting

- **CORS error in the browser console** ("has been blocked by CORS
  policy"): `CLIENT_ORIGIN` on the backend doesn't exactly match the
  frontend's origin — check protocol (`https://`), host, and that there's
  no trailing slash. Update the env var on the Node app's detail page and
  **Restart**.
- **Images/audio 404 or broken**: `PUBLIC_URL` wasn't set (or was set
  *after* some questions were already saved — old rows keep whatever URL
  form they were saved with). Set it and re-save affected questions, or fix
  directly in the DB if needed.
- **502/503 from the API URL**: the Node process crashed or never started —
  check the app's Errors log in **Setup Node.js App**. Common causes: DB
  credentials wrong, or `npm install` wasn't run after an upload.
- **"Application root already exists" or file permission errors on
  upload**: cPanel's Node.js App feature owns that folder once created —
  create the app first (step 4) with an empty root, *then* upload the
  `server/` contents into it, rather than uploading first.
- **`uploads/` losing files after a redeploy**: never delete/recreate the
  application root when redeploying — only replace source files and rerun
  `npm install`. If you do need to move it, copy `uploads/` across first.
