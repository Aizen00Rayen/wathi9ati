# Hostinger Deployment Guide

## Option A — Hostinger Shared Hosting (PHP + SQLite) — recommended, no Node.js

Host the **entire app** on ordinary HTML/PHP shared hosting — no Node.js app or
VPS needed. The PHP backend in [`php-backend/`](php-backend/) reproduces the
exact same `/api/*` API, so the React frontend runs against it unchanged.

**One command builds everything you need to upload:**

```bash
npm run build
```

This builds the frontend and assembles a ready-to-go `public_html/` folder at
the repo root, containing the built React app, the PHP API, `storage/`, and a
`.env` with freshly generated JWT secrets — no manual copying or editing.

Then in Hostinger File Manager: open `public_html/`, upload the **contents**
of the generated `public_html/` folder into it (or upload the folder and move
its contents up). That's it — the site is live.

Optional: edit the uploaded `.env` to set `RESEND_API_KEY` if you want the
contact form to send emails (it works and saves messages to the DB without it).

Full details: [`php-backend/README.md`](php-backend/README.md).

## Option B — Hostinger VPS (Node.js)

### 1. Upload files
Upload the `backend/` and `frontend/` folders to your VPS via SSH or Hostinger File Manager.

### 2. Build frontend
```bash
cd frontend
npm install
npm run build
# Serves the generated dist/ folder as static files
```

### 3. Configure backend
```bash
cd backend
cp .env.example .env
nano .env   # set strong JWT secrets and FRONTEND_URL
npm install --production
```

### 4. Run backend with PM2
```bash
npm install -g pm2
pm2 start server.js --name wathi9ati
pm2 save
pm2 startup
```

### 5. Nginx reverse proxy (recommended)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve React frontend
    root /var/www/wathi9ati/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Node backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. SSL with Certbot
```bash
certbot --nginx -d yourdomain.com
```

## Option C — Static frontend only
Upload `frontend/dist/` contents to `public_html/`.
Host the backend on a separate VPS or cloud service.
