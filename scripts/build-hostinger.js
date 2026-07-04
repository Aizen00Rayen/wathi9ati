#!/usr/bin/env node
// Builds the frontend and assembles a single ready-to-upload folder
// (public_html/) containing everything Hostinger shared (PHP) hosting needs:
// the built React app + the PHP API + storage/ + a working .env with
// freshly generated JWT secrets. Upload its *contents* to public_html
// via File Manager — no further edits required.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const PHP_BACKEND_DIR = path.join(ROOT, 'php-backend');
const OUT_DIR = path.join(ROOT, 'public_html');

function run(cmd, cwd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyDir(src, dest, { exclude = [] } = {}) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      return !exclude.includes(base);
    },
  });
}

function randomSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── 1. Build the frontend ───────────────────────────────────────────────────
run('npm install', FRONTEND_DIR);
run('npm run build', FRONTEND_DIR);

const frontendDist = path.join(FRONTEND_DIR, 'dist');
if (!fs.existsSync(frontendDist)) {
  console.error('Frontend build failed: frontend/dist not found.');
  process.exit(1);
}

// ─── 2. Reset the output folder ──────────────────────────────────────────────
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 3. Copy built frontend (index.html, assets/, ...) ───────────────────────
copyDir(frontendDist, OUT_DIR);

// ─── 4. Copy the PHP API ─────────────────────────────────────────────────────
copyDir(path.join(PHP_BACKEND_DIR, 'api'), path.join(OUT_DIR, 'api'));

// ─── 5. Root .htaccess (SPA fallback + security) ─────────────────────────────
fs.copyFileSync(
  path.join(PHP_BACKEND_DIR, '.htaccess'),
  path.join(OUT_DIR, '.htaccess')
);

// ─── 6. storage/ — fresh, empty, web-access denied. Never copy any local ─────
//        test DB/uploads that might exist on the machine doing the build.
const storageOut = path.join(OUT_DIR, 'storage');
fs.mkdirSync(storageOut, { recursive: true });
fs.copyFileSync(
  path.join(PHP_BACKEND_DIR, 'storage', '.htaccess'),
  path.join(storageOut, '.htaccess')
);

// ─── 7. Generate .env with strong random secrets — no manual editing needed ──
const envExample = fs.readFileSync(path.join(PHP_BACKEND_DIR, '.env.example'), 'utf8');
const env = envExample
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomSecret()}`)
  .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${randomSecret()}`)
  .replace(/^NODE_ENV=.*$/m, 'NODE_ENV=production');
fs.writeFileSync(path.join(OUT_DIR, '.env'), env);

console.log(`
✅ public_html/ is ready.

Upload the CONTENTS of the "public_html" folder to your Hostinger File
Manager's public_html/ directory (or an "Upload Files" of everything inside
it). That's it — JWT secrets were generated automatically.

Optional: edit public_html/.env to set RESEND_API_KEY if you want the
contact form to send emails (it works and saves to the DB without it).
`);
