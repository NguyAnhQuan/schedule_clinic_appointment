const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middlewares/auth');
const { uploadAvatar, uploadServiceImage, uploadClinicLogo } = require('../middlewares/upload');
const {
  getDashboard,
  getCalendarOverview,
  updateWorkingDay,
  listAppointments,
  updateAppointmentStatus,
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientRecords,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listDentists,
  createDentist,
  updateDentist,
  deleteDentist,
  listServicesConfig,
  createService,
  updateService,
  deleteService,
  getClinicSettings,
  updateClinicSettings,
  listShifts,
  createShift,
  updateShift,
  getStaffSchedules,
  updateStaffSchedules,
} = require('../controllers/admin.controller');

// Tất cả route admin yêu cầu đăng nhập
router.use(authMiddleware, authorizeRoles('admin', 'dentist', 'staff'));

router.get('/dashboard', getDashboard);
router.get('/calendar-overview', getCalendarOverview);
router.patch('/calendar-day', authorizeRoles('admin'), updateWorkingDay);

router.get('/shifts', listShifts);
router.post('/shifts', authorizeRoles('admin'), createShift);
router.put('/shifts/:id', authorizeRoles('admin'), updateShift);

router.get('/staff-schedules', getStaffSchedules);
router.put('/staff-schedules', authorizeRoles('admin'), updateStaffSchedules);

router.get('/appointments', listAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);

router.get('/patients', listPatients);
router.post('/patients', createPatient);
router.put('/patients/:id', updatePatient);
router.delete('/patients/:id', deletePatient);
router.get('/patients/:id/records', getPatientRecords);

router.get('/users', authorizeRoles('admin'), listUsers);
router.post('/users', authorizeRoles('admin'), createUser);
router.put('/users/:id', authorizeRoles('admin'), updateUser);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);

router.get('/dentists', listDentists);
router.post('/dentists', authorizeRoles('admin'), createDentist);
router.patch('/dentists/:id', authorizeRoles('admin'), updateDentist);
router.delete('/dentists/:id', authorizeRoles('admin'), deleteDentist);

router.get('/services', listServicesConfig);
router.post('/services', createService);
router.patch('/services/:id', updateService);
router.delete('/services/:id', deleteService);

// Upload endpoints
router.post('/upload/avatar', uploadAvatar, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  return res.json({ url });
});

router.post('/upload/service-image', uploadServiceImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/services/${req.file.filename}`;
  return res.json({ url });
});

router.post('/upload/clinic-logo', uploadClinicLogo, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/clinic/${req.file.filename}`;
  return res.json({ url });
});

router.get('/clinic-settings', getClinicSettings);
router.put('/clinic-settings', updateClinicSettings);

module.exports = router;

