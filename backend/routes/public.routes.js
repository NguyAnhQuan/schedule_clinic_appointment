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

router.get('/services', getServices);
router.get('/dentists/by-department', getDentistsByDepartment);
router.get('/dentists/:id', getDentistById);
router.get('/dentists', getDentists);
router.get('/available-dates', getAvailableDates);
router.get('/shifts-for-date', getShiftsForDate);
router.get('/dentists-for-booking', getDentistsForBooking);
router.get('/slots-for-booking', getSlotsForBooking);
router.post('/appointments', optionalAuthMiddleware, createAppointment);
router.get('/appointments/status', getAppointmentStatus);
router.get('/appointments/:id/rating', getAppointmentRating);
router.post('/appointments/:id/rate', optionalAuthMiddleware, submitAppointmentRating);

module.exports = router;
