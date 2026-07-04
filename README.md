# وثيقتي — Wathi9ati

محفظة رقمية آمنة للوثائق الرسمية الجزائرية.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS (RTL/Arabic)
- **Backend**: two interchangeable implementations of the same `/api` contract:
  - **PHP + PDO SQLite** ([`php-backend/`](php-backend/)) — for HTML/PHP shared
    hosting (e.g. Hostinger), no Node.js required. **Recommended for hosting.**
  - **Node.js + Express + SQLite** ([`backend/`](backend/)) — for local dev / VPS.
- **Auth**: JWT access tokens (memory) + refresh tokens (httpOnly cookie)

## Quick Start (local)

1. Double-click `start.bat` — installs dependencies, starts both servers, opens browser.

Or manually:

```bash
# Backend
cd backend
cp .env.example .env   # edit secrets
npm install
npm run dev            # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Deployment (Hostinger shared hosting — recommended)

```bash
npm run build
```

builds the frontend and assembles a ready-to-upload `public_html/` folder at
the repo root (built React app + PHP API + `storage/` + `.env` with generated
JWT secrets). Upload its contents to Hostinger File Manager's `public_html/`
and the site is live — no manual editing needed.

See [DEPLOY.md](DEPLOY.md) and [php-backend/README.md](php-backend/README.md)
for details, and for the alternative Node.js/VPS deployment path.

## Environment Variables

For local Node.js dev, copy `backend/.env.example` → `backend/.env` and set
strong secrets:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `FRONTEND_URL` | Your production frontend URL |
| `UPLOAD_PATH` | Path for uploaded PDFs |

(The PHP/Hostinger build generates its own `.env` automatically — see above.)

## Security

- PDF-only uploads validated by MIME type **and** magic bytes
- Per-user isolated storage — no cross-user file access possible
- Refresh token rotation with SHA-256 hashing in DB
- Rate limiting on uploads (20/hr) and contact form (3/hr)
- Helmet security headers + CORS locked to frontend origin
