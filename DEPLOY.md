# Hostinger Deployment Guide

## Option A — Hostinger VPS (Node.js)

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

## Option B — Hostinger Shared Hosting (static frontend only)
Upload `frontend/dist/` contents to `public_html/`.
Host the backend on a separate VPS or cloud service.
