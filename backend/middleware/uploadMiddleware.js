const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');
const UPLOAD_BASE = process.env.UPLOAD_PATH || './uploads';

function ensureUserDir(userId) {
  const dir = path.join(UPLOAD_BASE, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = ensureUserDir(req.user.id);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = '.pdf';
    const storedName = `${uuidv4()}${ext}`;
    req.storedName = storedName;
    cb(null, storedName);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('يُسمح فقط بملفات PDF'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

// Validate PDF magic bytes after upload
function validatePdfMagicBytes(req, res, next) {
  if (!req.file) return next();

  const fd = fs.openSync(req.file.path, 'r');
  const buf = Buffer.alloc(5);
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);

  if (buf.toString('ascii') !== '%PDF-') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'الملف ليس ملف PDF صالحاً' });
  }
  next();
}

module.exports = { upload, validatePdfMagicBytes, ensureUserDir };
