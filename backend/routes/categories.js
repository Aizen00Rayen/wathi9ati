const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { getDb } = require('../db/database');

router.use(authMiddleware);

// GET /api/categories
router.get('/', (req, res) => {
  const db = getDb();
  const categories = db
    .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC')
    .all(req.user.id);
  res.json(categories);
});

// POST /api/categories
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('اسم الفئة مطلوب').isLength({ max: 80 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const db = getDb();
    const { name } = req.body;

    // Max 20 categories per user
    const count = db
      .prepare('SELECT COUNT(*) as c FROM categories WHERE user_id = ?')
      .get(req.user.id).c;
    if (count >= 20) {
      return res.status(400).json({ message: 'لا يمكن إضافة أكثر من 20 فئة' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)').run(
      id,
      req.user.id,
      name
    );

    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(cat);
  }
);

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const cat = db
    .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!cat) {
    return res.status(404).json({ message: 'الفئة غير موجودة' });
  }

  // Reassign documents in this category to "أخرى" or null
  const other = db
    .prepare("SELECT id FROM categories WHERE user_id = ? AND name = 'أخرى'")
    .get(req.user.id);

  db.prepare('UPDATE documents SET category_id = ? WHERE category_id = ? AND user_id = ?').run(
    other ? other.id : null,
    req.params.id,
    req.user.id
  );

  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );

  res.json({ message: 'تم حذف الفئة بنجاح' });
});

module.exports = router;
