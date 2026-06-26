/**
 * FILE_GUIDE: server.js — Điểm vào (entry point) của backend
 * ----------------------------------------------------------------
 * - Tạo ứng dụng Express, bật CORS và parse JSON body.
 * - Phục vụ file tĩnh trong thư mục uploads/ (ảnh avatar, dịch vụ…).
 * - Gắn 3 nhóm route:
 *     /api/auth   → đăng nhập, đăng ký
 *     /api        → API công khai (đặt lịch, xem dịch vụ…)
 *     /api/admin  → quản trị (cần JWT)
 * - Gọi initDatabase() trước khi listen: tự tạo bảng + seed nếu thiếu.
 * - Port đọc từ .env (mặc định 4100).
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Cho phép frontend (domain khác/port khác) gọi API
app.use(cors());
// Đọc body JSON từ request POST/PATCH
app.use(
  express.json({
    limit: '2mb',
    type: ['application/json', 'text/plain', 'application/json; charset=utf-8'],
  })
);

// URL /uploads/... trỏ tới file trên đĩa (ảnh đã upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint kiểm tra server còn sống (dùng khi deploy / debug)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Đăng ký các router
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4100;

/**
 * start — Khởi động server: init DB trước, sau đó lắng nghe HTTP.
 * Logic: Gọi initDatabase() (tạo bảng, seed, expire lịch cũ). Thành công → app.listen.
 * Thất bại → log lỗi và exit(1) để process manager (pm2/docker) có thể restart.
 */
async function start() {
  try {
    // initDatabase: kết nối MySQL, CREATE TABLE IF NOT EXISTS, chèn dữ liệu mẫu nếu trống,
    // chạy expirePastAppointments — phải xong trước khi nhận request để schema/data nhất quán
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (err) {
    // Lỗi kết nối DB, migration hoặc seed — không listen để tránh API trả lỗi 500 hàng loạt
    console.error('Failed to initialize database', err);
    process.exit(1);
  }
}

start();
