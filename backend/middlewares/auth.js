const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

function generateToken(user, expiresIn = '8h') {
  const payload = {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Optional: kiểm tra user còn active không
    const [rows] = await pool.query(
      'SELECT id, role, status FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
    }

    next();
  } catch (err) {
    console.error('JWT error', err);
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  };
}

async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone FROM users WHERE id = ? AND status = ? LIMIT 1',
      [decoded.id, 'active']
    );
    if (rows.length) req.user = { ...decoded, ...rows[0] };
  } catch {
    // ignore
  }
  next();
}

module.exports = {
  authMiddleware,
  authorizeRoles,
  generateToken,
  optionalAuthMiddleware,
};

