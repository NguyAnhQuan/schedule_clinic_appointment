/**
 * FILE_GUIDE: public.routes.js — URL API công khai (không bắt buộc đăng nhập)
 * ----------------------------------------------------------------
 * Gắn dưới prefix /api (xem server.js).
 * Thứ tự route quan trọng: /dentists/by-department phải đứng TRƯỚC /dentists/:id
 * để Express không hiểu "by-department" là id.
 *
 * POST /appointments dùng optionalAuthMiddleware: khách có thể gửi JWT nếu đã login.
 */
const express = require('express');
const router = express.Router();
const { optionalAuthMiddleware } = require('../middlewares/auth');
const {
  getServices,
  getDentists,
  getDentistsByDepartment,
  getDentistById,
  getAvailableDates,
  getShiftsForDate,
  getDentistsForBooking,
  getSlotsForBooking,
  createAppointment,
  getAppointmentStatus,
  getAppointmentRating,
  submitAppointmentRating,
} = require('../controllers/public.controller');

/** GET /api/services — Danh sách dịch vụ đang hoạt động (trang đặt lịch, landing). */
router.get('/services', getServices);
/** GET /api/dentists/by-department — Lọc bác sĩ theo khoa/chuyên khoa (route cố định, đặt trước :id). */
router.get('/dentists/by-department', getDentistsByDepartment);
/** GET /api/dentists/:id — Chi tiết một bác sĩ theo ID. */
router.get('/dentists/:id', getDentistById);
/** GET /api/dentists — Danh sách tất cả bác sĩ (có thể kèm filter query). */
router.get('/dentists', getDentists);
/** GET /api/available-dates — Các ngày trong tương lai còn có thể đặt lịch. */
router.get('/available-dates', getAvailableDates);
/** GET /api/shifts-for-date — Các ca làm việc trong một ngày kèm số slot trống. */
router.get('/shifts-for-date', getShiftsForDate);
/** GET /api/dentists-for-booking — Bác sĩ khả dụng theo ngày/ca/dịch vụ đã chọn. */
router.get('/dentists-for-booking', getDentistsForBooking);
/** GET /api/slots-for-booking — Danh sách mốc giờ trống để khách chọn khi đặt lịch. */
router.get('/slots-for-booking', getSlotsForBooking);
/** POST /api/appointments — Tạo lịch hẹn mới; optionalAuth gắn user nếu đã đăng nhập. */
router.post('/appointments', optionalAuthMiddleware, createAppointment);
/** GET /api/appointments/status — Tra cứu trạng thái lịch (mã/điện thoại, không cần login). */
router.get('/appointments/status', getAppointmentStatus);
/** GET /api/appointments/:id/rating — Xem đánh giá đã gửi cho lịch hẹn (nếu có). */
router.get('/appointments/:id/rating', getAppointmentRating);
/** POST /api/appointments/:id/rate — Gửi đánh giá sau khám; optionalAuth xác định người đánh giá. */
router.post('/appointments/:id/rate', optionalAuthMiddleware, submitAppointmentRating);

module.exports = router;
