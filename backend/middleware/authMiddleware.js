const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مصرح — الرجاء تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email, name: decoded.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'انتهت صلاحية الجلسة', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'رمز المصادقة غير صالح' });
  }
}

module.exports = authMiddleware;
