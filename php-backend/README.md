# وثيقتي — PHP + SQLite backend

A drop-in replacement for the Node.js/Express backend, written in **plain PHP
(no Composer, no framework)** with **PDO SQLite**. It exposes the exact same
`/api/*` contract the React frontend already calls, so **no frontend changes are
required** — it just needs to be served from the same origin.

This lets you host the whole app on **Hostinger shared (HTML/PHP) hosting** —
no Node.js app, no VPS.

## What it implements

Same endpoints, status codes, JSON shapes and Arabic messages as the Node backend:

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | creates user + 4 default categories, sets refresh cookie |
| POST | `/api/auth/login` | |
| POST | `/api/auth/refresh` | rotates refresh token (httpOnly cookie) |
| POST | `/api/auth/logout` | |
| GET | `/api/documents?category=&sort=` | Bearer auth |
| POST | `/api/documents/upload` | multipart PDF, 20/hr per user |
| GET | `/api/documents/:id/download` | Bearer auth, streams PDF |
| DELETE | `/api/documents/:id` | |
| GET / POST / DELETE | `/api/categories` | max 20; delete reassigns docs to «أخرى» |
| POST | `/api/contact` | 3/hr per IP, saved to DB + emailed via Resend |
| GET | `/api/health` | |

- **Auth:** JWT HS256 access tokens (15 min) + rotating refresh tokens stored
  SHA-256-hashed in the DB (httpOnly cookie scoped to `/api/auth`).
- **Passwords:** bcrypt via `password_hash` (cost 12) — compatible with the
  Node `bcryptjs` hashes.
- **Uploads:** PDF-only, validated by MIME **and** `%PDF-` magic bytes, stored
  per-user under `storage/uploads/<userId>/`.
- **Rate limiting:** fixed-window counters in a `rate_limits` SQLite table
  (global 200/15min, upload 20/hr, contact 3/hr).

## Requirements

- PHP **7.4+** (tested on 8.4) with `pdo_sqlite`, `openssl`, `curl`,
  `fileinfo`, `mbstring` — all standard on Hostinger.
- Apache with `mod_rewrite` (the `.htaccess` files handle routing).

## Folder layout

```
php-backend/
├── .htaccess          → goes to public_html root (SPA fallback + security)
├── .env.example       → copy to public_html/.env
├── api/               → the PHP API (front controller + routes)
│   ├── .htaccess
│   ├── index.php      → router / front controller
│   ├── config.php     → env loader
│   ├── lib.php        → db, jwt, auth, rate-limit, mail helpers
│   ├── schema.sql
│   └── routes/        → auth, documents, categories, contact
└── storage/           → SQLite DB + uploaded PDFs (web access denied)
    └── .htaccess      → Require all denied
```

## Deploy to Hostinger (shared hosting)

### The easy way — one command

From the repo root:

```bash
npm run build
```

This runs `scripts/build-hostinger.js`, which:
1. builds the frontend (`frontend/dist`),
2. assembles a fresh `public_html/` folder at the repo root containing the
   built frontend + `api/` + `storage/` + root `.htaccess`,
3. generates a `.env` inside it with freshly random `JWT_SECRET` /
   `JWT_REFRESH_SECRET` values (`NODE_ENV=production` already set).

Then just **upload the contents of the generated `public_html/` folder** into
your Hostinger File Manager's `public_html/` directory. No manual copying,
no editing `.env` — the site works as soon as it's uploaded.

Optionally edit the uploaded `.env` to set `RESEND_API_KEY` if you want the
contact form to send emails (it works and saves messages to the DB without it).

Visit your domain — the SQLite database and `uploads/` folder are created
automatically on the first API call. Make sure PHP can write to `storage/`
(default permissions from most File Manager uploads are fine).

### The manual way

If you'd rather assemble it by hand instead of running the build script:

1. **Build the frontend** locally:
   ```bash
   cd frontend
   npm install
   npm run build          # produces frontend/dist/
   ```
   (`VITE_API_URL` is already `/api`, so the SPA calls the PHP backend on the
   same origin.)

2. **Upload to `public_html/`:**
   - the **contents** of `frontend/dist/` → `public_html/` (so
     `public_html/index.html`, `public_html/assets/…`)
   - the whole `php-backend/api/` folder    → `public_html/api/`
   - `php-backend/.htaccess`                → `public_html/.htaccess`
   - `php-backend/storage/`                 → `public_html/storage/`

3. **Configure secrets:** copy `.env.example` to `public_html/.env` and set
   strong values:
   ```bash
   php -r "echo bin2hex(random_bytes(32));"   # run twice for the two secrets
   ```
   ```
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   NODE_ENV=production
   RESEND_API_KEY=...            # optional; blank = messages still saved to DB
   ```

4. **Permissions:** make sure PHP can write to `storage/` (usually already
   `755`/`775`; the app creates the DB and `uploads/` on first request).

5. Visit your domain. The database and folders are created automatically on the
   first API call.

> **Extra hardening (optional):** on Hostinger you can put the data outside the
> web root. Create e.g. `/home/USER/wathi9ati-storage`, then set
> `STORAGE_PATH=/home/USER/wathi9ati-storage` in `.env`. Nothing sensitive is
> then reachable over HTTP at all.

## Local testing

```bash
cd php-backend
STORAGE_PATH=./storage JWT_SECRET=dev JWT_REFRESH_SECRET=dev NODE_ENV=development \
  php -S localhost:8000 -t .
# API is under http://localhost:8000/api/... when combined with the router,
# or point your Vite dev proxy at it (see DEPLOY.md).
```

## Migrating from the Node backend

The SQLite schema is identical, so an existing `backend/wathi9ati.db` can be
copied to `storage/wathi9ati.db` and existing uploaded PDFs to
`storage/uploads/`. bcrypt password hashes carry over unchanged, so users keep
their passwords. Existing JWTs are invalidated (different secret) — users just
log in again.
