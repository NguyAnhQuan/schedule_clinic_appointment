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

