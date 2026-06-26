const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middlewares/auth');
const { authorizeStaffPermission } = require('../middlewares/staffPermissions');
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
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
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

router.use(authMiddleware, authorizeRoles('admin', 'dentist', 'staff'));

router.get('/dashboard', authorizeStaffPermission('dashboard'), getDashboard);
router.get('/calendar-overview', authorizeStaffPermission('calendar_overview'), getCalendarOverview);
router.patch(
  '/calendar-day',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('calendar_overview'),
  updateWorkingDay
);

router.get('/shifts', listShifts);
router.post('/shifts', authorizeRoles('admin'), createShift);
router.put('/shifts/:id', authorizeRoles('admin'), updateShift);

router.get('/staff-schedules', authorizeStaffPermission('staff_schedules'), getStaffSchedules);
router.put(
  '/staff-schedules',
  authorizeRoles('admin', 'staff', 'dentist'),
  authorizeStaffPermission('staff_schedules'),
  updateStaffSchedules
);

router.get(
  '/appointments',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('appointments'),
  listAppointments
);
router.patch(
  '/appointments/:id/status',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('appointments'),
  updateAppointmentStatus
);

router.get(
  '/patients',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  listPatients
);
router.post(
  '/patients',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  createPatient
);
router.put(
  '/patients/:id',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  updatePatient
);
router.delete(
  '/patients/:id',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  deletePatient
);
router.get(
  '/patients/:id/records',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  getPatientRecords
);
router.post(
  '/patients/:id/records',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  createMedicalRecord
);
router.put(
  '/medical-records/:id',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  updateMedicalRecord
);
router.delete(
  '/medical-records/:id',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('patients'),
  deleteMedicalRecord
);

router.get('/users', authorizeRoles('admin'), listUsers);
router.post('/users', authorizeRoles('admin'), createUser);
router.put('/users/:id', authorizeRoles('admin'), updateUser);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);

router.get(
  '/dentists',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('dentists_view_edit'),
  listDentists
);
router.post('/dentists', authorizeRoles('admin'), createDentist);
router.patch(
  '/dentists/:id',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('dentists_view_edit'),
  updateDentist
);
router.delete('/dentists/:id', authorizeRoles('admin'), deleteDentist);

router.get('/services', authorizeRoles('admin'), listServicesConfig);
router.post('/services', authorizeRoles('admin'), createService);
router.patch('/services/:id', authorizeRoles('admin'), updateService);
router.delete('/services/:id', authorizeRoles('admin'), deleteService);

router.post('/upload/avatar', authorizeRoles('admin', 'staff', 'dentist'), uploadAvatar, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  return res.json({ url });
});

router.post('/upload/service-image', authorizeRoles('admin'), uploadServiceImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/services/${req.file.filename}`;
  return res.json({ url });
});

router.post('/upload/clinic-logo', authorizeRoles('admin'), uploadClinicLogo, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/clinic/${req.file.filename}`;
  return res.json({ url });
});

router.get('/clinic-settings', authorizeRoles('admin'), getClinicSettings);
router.put('/clinic-settings', authorizeRoles('admin'), updateClinicSettings);

module.exports = router;
