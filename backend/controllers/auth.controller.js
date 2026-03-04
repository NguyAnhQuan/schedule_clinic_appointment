const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { generateToken } = require('../middlewares/auth');

async function register(req, res) {
  const { full_name, phone, email, password } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu cần ít nhất 6 ký tự' });
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
      `INSERT INTO users (full_name, phone, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'staff', 'active')`,
      [String(full_name).trim(), phone ? String(phone).trim() : null, trimmedEmail, passwordHash]
    );
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, status, avatar_url FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = rows[0];
    const token = generateToken(user);
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

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
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

    const token = generateToken(user);
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

async function updateProfile(req, res) {
  const { full_name, phone, email, avatar_url } = req.body || {};
  const userId = req.user.id;
  try {
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
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateProfile error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function getMyAppointments(req, res) {
  const { pool } = require('../config/db');
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

