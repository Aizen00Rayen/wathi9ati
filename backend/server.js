const path = require('path');
// Always load .env from the backend/ directory, regardless of where node is invoked
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS — allow same-origin (no Origin header) and the configured frontend URL
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5000',
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Same-origin requests (production, curl) have no Origin header — always allow
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any subdomain of the configured FRONTEND_URL domain
      callback(null, false);
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Global rate limiter — 200 requests per 15 minutes per IP
const globalLimiter = new RateLimiterMemory({ points: 200, duration: 900 });
app.use(async (req, res, next) => {
  try {
    await globalLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({ message: 'طلبات كثيرة جداً. الرجاء الانتظار.' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/contact', require('./routes/contact'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'وثيقتي' }));

// Serve built React frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — let React Router handle all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler (API routes only — reached only when dist folder absent)
app.use((req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'خطأ داخلي في الخادم' });
});

app.listen(PORT, () => {
  console.log(`✅ Wathi9ati backend running on http://localhost:${PORT}`);
});
