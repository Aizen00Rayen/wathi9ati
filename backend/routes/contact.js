const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { getDb } = require('../db/database');

const contactLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600,
  keyPrefix: 'contact',
});

// POST /api/contact
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('الاسم مطلوب').isLength({ max: 100 }),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صالح').normalizeEmail(),
    body('subject').trim().notEmpty().withMessage('الموضوع مطلوب').isLength({ max: 200 }),
    body('message')
      .trim()
      .isLength({ min: 20 })
      .withMessage('الرسالة يجب أن تحتوي على 20 حرفاً على الأقل')
      .isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;

    try {
      await contactLimiter.consume(ip);
    } catch {
      return res.status(429).json({
        message: 'لقد أرسلت عدداً كبيراً من الرسائل. حاول مجدداً بعد ساعة.',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const db = getDb();
    const { name, email, subject, message } = req.body;

    db.prepare(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).run(name, email, subject, message);

    // TODO: Send email via nodemailer
    // await transporter.sendMail({ from: email, to: 'contact@wathi9ati.site', subject, text: message });

    res.status(201).json({ message: 'تم إرسال رسالتك بنجاح. سنرد عليك قريباً.' });
  }
);

module.exports = router;
