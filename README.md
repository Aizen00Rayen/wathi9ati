# وثيقتي — Wathi9ati

محفظة رقمية آمنة للوثائق الرسمية الجزائرية.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS (RTL/Arabic)
- **Backend**: Node.js + Express.js + SQLite (better-sqlite3)
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

## Deployment (Hostinger)

See [DEPLOY.md](DEPLOY.md) for step-by-step Hostinger VPS deployment.

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and set strong secrets:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `FRONTEND_URL` | Your production frontend URL |
| `UPLOAD_PATH` | Path for uploaded PDFs |

## Security

- PDF-only uploads validated by MIME type **and** magic bytes
- Per-user isolated storage — no cross-user file access possible
- Refresh token rotation with SHA-256 hashing in DB
- Rate limiting on uploads (20/hr) and contact form (3/hr)
- Helmet security headers + CORS locked to frontend origin
