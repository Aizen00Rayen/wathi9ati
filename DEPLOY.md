# Hostinger Deployment Guide

## Option A — Hostinger Shared Hosting (PHP + SQLite) — recommended, no Node.js

Host the **entire app** on ordinary HTML/PHP shared hosting — no Node.js app or
VPS needed. The PHP backend in [`php-backend/`](php-backend/) reproduces the
exact same `/api/*` API, so the React frontend runs against it unchanged.

1. Build the frontend: `cd frontend && npm install && npm run build`.
2. Upload to `public_html/`:
   - contents of `frontend/dist/` → `public_html/`
   - `php-backend/api/`           → `public_html/api/`
   - `php-backend/.htaccess`      → `public_html/.htaccess`
   - `php-backend/storage/`       → `public_html/storage/`
3. Copy `php-backend/.env.example` → `public_html/.env` and set strong
   `JWT_SECRET` / `JWT_REFRESH_SECRET` (and optionally `RESEND_API_KEY`).

Full step-by-step: [`php-backend/README.md`](php-backend/README.md).

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
