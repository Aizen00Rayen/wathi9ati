require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// 404 handler
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
