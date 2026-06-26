/**
 * FILE_GUIDE: auth.controller.js — Đăng nhập, đăng ký, profile
 * =============================================================================
 * Login: bcrypt so sánh password_hash, trả JWT.
 * Register: tạo user role customer.
 * getMe / updateProfile: đọc từ token + bảng users.
 */
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { generateToken } = require('../middlewares/auth');
const { getSecuritySettings } = require('../utils/clinicSettings');
const { validatePassword } = require('../utils/password');

/**
 * Tính thời gian sống (expiresIn) của JWT dựa trên cấu hình bảo mật phòng khám.
 * Nếu `auto_logout_minutes` hợp lệ (1–1440 phút) thì dùng giá trị đó; ngược lại mặc định 8 giờ.
 *
 * @param {Object} [security] - Cấu hình bảo mật từ `getSecuritySettings()` (có thể chứa `auto_logout_minutes`).
 * @returns {string} Chuỗi thời gian cho `jwt.sign`, ví dụ `'30m'` hoặc `'8h'`.
 */
function tokenExpiresIn(security) {
  const minutes = Number(security?.auto_logout_minutes);
  if (minutes > 0 && minutes <= 24 * 60) {
    return `${minutes}m`;
  }
  return '8h';
}

/**
 * Đăng ký tài khoản khách hàng (role `customer`) mới.
 * Kiểm tra email hợp lệ, mật khẩu theo chính sách bảo mật, trùng email; hash mật khẩu rồi tạo user và trả JWT.
 *
 * @param {import('express').Request} req - Body: `{ full_name, phone?, email, password }`.
 * @param {import('express').Response} res - 201 kèm `{ message, token, user }` hoặc 400/500.
 * @returns {Promise<void>}
 */
async function register(req, res) {
  const { full_name, phone, email, password } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  const security = await getSecuritySettings();
  const pwdCheck = await validatePassword(password, security);
  if (!pwdCheck.ok) {
    return res.status(400).json({ message: pwdCheck.message });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
      trimmedEmail,
    ]);
    if (existing.length) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role, status, password_updated_at)
       VALUES (?, ?, ?, ?, 'customer', 'active', NOW())`,
      [String(full_name).trim(), phone ? String(phone).trim() : null, trimmedEmail, passwordHash]
    );
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, status, avatar_url FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = rows[0];
    const token = generateToken(user, tokenExpiresIn(security));
    return res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * Đăng nhập bằng email và mật khẩu.
 * So sánh bcrypt, kiểm tra trạng thái tài khoản và hết hạn mật khẩu (admin/staff/dentist); trả JWT nếu hợp lệ.
 *
 * @param {import('express').Request} req - Body: `{ email, password }`.
 * @param {import('express').Response} res - 200 kèm `{ token, user }`, 401/403/500 nếu lỗi.
 * @returns {Promise<void>}
 */
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [trimmedEmail]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản đã bị khoá hoặc không hoạt động' });
    }

    const security = await getSecuritySettings();
    const expDays = Number(security?.password_expiration_days);
    if (expDays > 0 && user.password_updated_at) {
      const updatedAt = new Date(user.password_updated_at);
      const expiredAt = new Date(updatedAt.getTime() + expDays * 24 * 60 * 60 * 1000);
      if (new Date() > expiredAt && ['admin', 'staff', 'dentist'].includes(user.role)) {
        return res.status(403).json({
          message: 'Mật khẩu đã hết hạn. Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.',
          code: 'PASSWORD_EXPIRED',
        });
      }
    }

    const token = generateToken(user, tokenExpiresIn(security));
    return res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * Lấy thông tin hồ sơ người dùng đang đăng nhập (từ `req.user.id` do middleware JWT gắn).
 *
 * @param {import('express').Request} req - Cần `req.user.id` sau `authMiddleware`.
 * @param {import('express').Response} res - JSON user `{ id, full_name, phone, email, role, avatar_url }` hoặc 404/500.
 * @returns {Promise<void>}
 */
async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('getMe error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * Cập nhật một phần hồ sơ cá nhân (họ tên, SĐT, email, avatar_url) của user hiện tại.
 * Chỉ cập nhật các trường được gửi; kiểm tra email hợp lệ và không trùng user khác.
 *
 * @param {import('express').Request} req - Body tùy chọn: `{ full_name?, phone?, email?, avatar_url? }`.
 * @param {import('express').Response} res - JSON user sau cập nhật hoặc 400/500.
 * @returns {Promise<void>}
 */
async function updateProfile(req, res) {
  const { full_name, phone, email, avatar_url } = req.body || {};
  const userId = req.user.id;
  try {
    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [
        trimmedEmail,
        userId,
      ]);
      if (dup.length) {
        return res.status(400).json({ message: 'Email này đã được sử dụng' });
      }
    }

    const updates = [];
    const params = [];
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(String(full_name).trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone ? String(phone).trim() : null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(String(email).trim().toLowerCase());
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url || null);
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
    }
    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateProfile error', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * Liệt kê lịch hẹn của khách hàng đăng nhập, khớp bệnh nhân qua email hoặc SĐT trên tài khoản.
 * Trả mảng rỗng nếu không có email/SĐT hoặc không khớp bệnh nhân nào.
 *
 * @param {import('express').Request} req - Cần `req.user.id` sau `authMiddleware`.
 * @param {import('express').Response} res - Mảng appointment (thời gian, trạng thái, dịch vụ, bác sĩ…) hoặc 500.
 * @returns {Promise<void>}
 */
async function getMyAppointments(req, res) {
  const userId = req.user.id;
  try {
    const [userRow] = await pool.query(
      'SELECT id, email, phone FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!userRow.length) {
      return res.json([]);
    }
    const u = userRow[0];
    const conditions = [];
    const params = [];
    if (u.email) {
      conditions.push('(p.email = ?)');
      params.push(u.email);
    }
    if (u.phone) {
      conditions.push('(p.phone = ?)');
      params.push(u.phone);
    }
    if (conditions.length === 0) {
      return res.json([]);
    }
    const whereClause = conditions.join(' OR ');
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_time, a.status, a.public_note,
              p.full_name AS patient_name, p.phone AS patient_phone,
              s.name AS service_name,
              u2.full_name AS dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       LEFT JOIN users u2 ON d.user_id = u2.id
       WHERE ${whereClause}
       ORDER BY a.appointment_time DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('getMyAppointments error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

module.exports = {
  login,
  register,
  getMe,
  updateProfile,
  getMyAppointments,
};
