const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { ensureUserDir } = require('../middleware/uploadMiddleware');
const crypto = require('crypto');

const DEFAULT_CATEGORIES = [
  'وثائق الهوية',
  'وثائق السكن',
  'التعليم والعمل',
  'أخرى',
];

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function storeRefreshToken(userId, token) {
  const db = getDb();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hash, expiresAt);
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('الاسم مطلوب').isLength({ max: 100 }),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    body('confirmPassword').custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('كلمتا المرور غير متطابقتين');
      return true;
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const db = getDb();
    const { name, email, password } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const userId = uuidv4();

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(userId, name, email, passwordHash);

    // Create default categories
    for (const catName of DEFAULT_CATEGORIES) {
      db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)').run(
        uuidv4(),
        userId,
        catName
      );
    }

    // Create user upload directory
    ensureUserDir(userId);

    const user = { id: userId, name, email };
    const { accessToken, refreshToken } = generateTokens(user);
    storeRefreshToken(userId, refreshToken);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ accessToken, user });
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح').normalizeEmail(),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const db = getDb();
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const { accessToken, refreshToken } = generateTokens(userData);
    storeRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken, user: userData });
  }
);

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'لا يوجد رمز تحديث' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const db = getDb();

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = db
      .prepare(
        "SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')"
      )
      .get(decoded.userId, hash);

    if (!stored) {
      return res.status(401).json({ message: 'رمز التحديث غير صالح أو منتهي الصلاحية' });
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'المستخدم غير موجود' });
    }

    // Rotate refresh token
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    const { accessToken, refreshToken: newRefresh } = generateTokens(user);
    storeRefreshToken(user.id, newRefresh);
    setRefreshCookie(res, newRefresh);

    res.json({ accessToken, user });
  } catch {
    res.status(401).json({ message: 'رمز التحديث غير صالح' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    const db = getDb();
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

module.exports = router;
