const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const authMiddleware = require('../middleware/authMiddleware');
const { upload, validatePdfMagicBytes } = require('../middleware/uploadMiddleware');
const { getDb } = require('../db/database');

const uploadLimiter = new RateLimiterMemory({
  points: 20,
  duration: 3600, // per hour
  keyPrefix: 'upload',
});

router.use(authMiddleware);

// GET /api/documents
router.get('/', (req, res) => {
  const db = getDb();
  const { category, sort } = req.query;

  let query = `
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.user_id = ?
  `;
  const params = [req.user.id];

  if (category && category !== 'all') {
    query += ' AND d.category_id = ?';
    params.push(category);
  }

  const sortMap = {
    newest: 'd.uploaded_at DESC',
    oldest: 'd.uploaded_at ASC',
    name: 'd.original_name ASC',
  };
  query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;

  const docs = db.prepare(query).all(...params);
  res.json(docs);
});

// POST /api/documents/upload
router.post(
  '/upload',
  async (req, res, next) => {
    try {
      await uploadLimiter.consume(`${req.user.id}`);
    } catch {
      return res.status(429).json({ message: 'تجاوزت الحد المسموح به. حاول مجدداً بعد ساعة.' });
    }
    next();
  },
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: `حجم الملف يتجاوز الحد المسموح (${process.env.MAX_FILE_SIZE_MB || 10} ميغابايت)` });
        }
        return res.status(400).json({ message: err.message || 'خطأ في رفع الملف' });
      }
      next();
    });
  },
  validatePdfMagicBytes,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }

    const { documentName, categoryId } = req.body;
    if (!documentName || !documentName.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'اسم الوثيقة مطلوب' });
    }

    const db = getDb();

    // Validate category belongs to user if provided
    if (categoryId) {
      const cat = db
        .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
        .get(categoryId, req.user.id);
      if (!cat) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'الفئة غير صالحة' });
      }
    }

    const docId = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, user_id, category_id, original_name, stored_name, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      req.user.id,
      categoryId || null,
      documentName.trim().substring(0, 200),
      req.file.filename,
      req.file.size
    );

    const doc = db.prepare(`
      SELECT d.*, c.name as category_name
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.id = ?
    `).get(docId);

    res.status(201).json(doc);
  }
);

// GET /api/documents/:id/download
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const doc = db
    .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!doc) {
    return res.status(404).json({ message: 'الوثيقة غير موجودة' });
  }

  const filePath = path.join(
    process.env.UPLOAD_PATH || './uploads',
    req.user.id,
    doc.stored_name
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'ملف الوثيقة غير موجود على الخادم' });
  }

  // Prevent path traversal
  const resolved = path.resolve(filePath);
  const uploadsBase = path.resolve(process.env.UPLOAD_PATH || './uploads');
  if (!resolved.startsWith(uploadsBase)) {
    return res.status(403).json({ message: 'وصول مرفوض' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(resolved);
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const doc = db
    .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!doc) {
    return res.status(404).json({ message: 'الوثيقة غير موجودة' });
  }

  const filePath = path.join(
    process.env.UPLOAD_PATH || './uploads',
    req.user.id,
    doc.stored_name
  );

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user.id
  );

  res.json({ message: 'تم حذف الوثيقة بنجاح' });
});

module.exports = router;
