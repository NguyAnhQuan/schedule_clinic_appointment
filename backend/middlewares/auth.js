/**
 * FILE_GUIDE: auth.js — Xác thực JWT (JSON Web Token)
 * ----------------------------------------------------------------
 * - generateToken: tạo token sau login (payload: id, role, email…).
 * - authMiddleware: bắt buộc Bearer token — dùng cho /api/admin/*.
 * - optionalAuthMiddleware: có token thì gắn req.user, không có vẫn cho qua (đặt lịch).
 * - authorizeRoles('admin'): chỉ role được liệt kê mới truy cập.
 */
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

/**
 * Tạo JWT chứa thông tin định danh user để client gửi kèm header Authorization.
 *
 * @param {Object} user - User từ DB; cần `id`, `role`, `full_name`, `email`.
 * @param {string} [expiresIn='8h'] - Thời gian hết hạn token (định dạng jsonwebtoken, ví dụ `'8h'`, `'30m'`).
 * @returns {string} Chuỗi JWT đã ký bằng `JWT_SECRET`.
 */
function generateToken(user, expiresIn = '8h') {
  const payload = {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Middleware bắt buộc xác thực: đọc Bearer token, verify JWT, gắn `req.user` và kiểm tra user còn `active`.
 * Dùng cho các route yêu cầu đăng nhập (ví dụ `/api/admin/*`, `/api/auth/me`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res - 401 nếu thiếu token, token sai/hết hạn hoặc tài khoản không active.
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

/**
 * Factory middleware giới hạn truy cập theo role.
 * Chỉ cho qua nếu `req.user.role` nằm trong danh sách role được phép; ngược lại trả 403.
 *
 * @param {...string} roles - Các role được phép, ví dụ `'admin'`, `'staff'`, `'dentist'`.
 * @returns {import('express').RequestHandler} Middleware kiểm tra role trước khi gọi handler.
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  };
}

/**
 * Middleware xác thực tùy chọn: nếu có Bearer token hợp lệ thì gắn `req.user` (merge payload JWT + DB).
 * Không có token hoặc token lỗi vẫn `next()` — phù hợp route đặt lịch cho cả khách và user đã login.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

