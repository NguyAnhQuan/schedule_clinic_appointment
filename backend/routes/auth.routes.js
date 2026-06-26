/**
 * FILE_GUIDE: auth.routes.js — URL /api/auth/* (login, register, me)
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  login,
  register,
  getMe,
  updateProfile,
  getMyAppointments,
} = require('../controllers/auth.controller');

/** POST /api/auth/login — Đăng nhập email/mật khẩu, trả JWT và thông tin user. */
router.post('/login', login);

/** POST /api/auth/register — Đăng ký tài khoản khách hàng mới. */
router.post('/register', register);

/** GET /api/auth/me — Lấy hồ sơ user hiện tại (cần Bearer token). */
router.get('/me', authMiddleware, getMe);

/** PATCH /api/auth/me — Cập nhật hồ sơ cá nhân (cần Bearer token). */
router.patch('/me', authMiddleware, updateProfile);

/** GET /api/auth/my-appointments — Danh sách lịch hẹn của khách đăng nhập (cần Bearer token). */
router.get('/my-appointments', authMiddleware, getMyAppointments);

module.exports = router;

