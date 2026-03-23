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

// Dashboard / Thống kê – cho admin + staff + dentist xem
router.get('/dashboard', getDashboard);

// Tổng quan lịch – cho admin + staff + dentist xem
router.get('/calendar-overview', getCalendarOverview);

// Cấu hình ngày mở/đóng phòng khám – admin + staff
router.patch('/calendar-day', authorizeRoles('admin', 'staff'), updateWorkingDay);

// Quản lý ca (shifts)
router.get('/shifts', listShifts); // xem ca: mọi role nội bộ
router.post('/shifts', authorizeRoles('admin'), createShift); // tạo/sửa ca: chỉ admin
router.put('/shifts/:id', authorizeRoles('admin'), updateShift);

// Phân ca (staff_shifts)
router.get('/staff-schedules', getStaffSchedules); // xem phân ca: admin + staff + dentist
// cập nhật phân ca: admin + staff toàn quyền, dentist chỉ được chỉnh ca của chính mình (logic trong controller)
router.put(
  '/staff-schedules',
  authorizeRoles('admin', 'staff', 'dentist'),
  updateStaffSchedules
);

// Quản lý lịch hẹn – chỉ admin + staff
router.get('/appointments', authorizeRoles('admin', 'staff'), listAppointments);
router.patch(
  '/appointments/:id/status',
  authorizeRoles('admin', 'staff'),
  updateAppointmentStatus
);

// Quản lý bệnh nhân – chỉ admin + staff
router.get('/patients', authorizeRoles('admin', 'staff'), listPatients);
router.post('/patients', authorizeRoles('admin', 'staff'), createPatient);
router.put('/patients/:id', authorizeRoles('admin', 'staff'), updatePatient);
router.delete('/patients/:id', authorizeRoles('admin', 'staff'), deletePatient);
router.get(
  '/patients/:id/records',
  authorizeRoles('admin', 'staff'),
  getPatientRecords
);

// Quản lý tài khoản – chỉ admin
router.get('/users', authorizeRoles('admin'), listUsers);
router.post('/users', authorizeRoles('admin'), createUser);
router.put('/users/:id', authorizeRoles('admin'), updateUser);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);

// Quản lý bác sĩ
router.get('/dentists', authorizeRoles('admin', 'staff'), listDentists);
router.post('/dentists', authorizeRoles('admin'), createDentist); // tạo/xoá: chỉ admin
router.patch('/dentists/:id', authorizeRoles('admin', 'staff'), updateDentist); // sửa: admin + staff
router.delete('/dentists/:id', authorizeRoles('admin'), deleteDentist);

// Cấu hình dịch vụ – chỉ admin
router.get('/services', authorizeRoles('admin'), listServicesConfig);
router.post('/services', authorizeRoles('admin'), createService);
router.patch('/services/:id', authorizeRoles('admin'), updateService);
router.delete('/services/:id', authorizeRoles('admin'), deleteService);

// Upload endpoints
// Avatar: admin + staff + dentist được phép thao tác
router.post('/upload/avatar', authorizeRoles('admin', 'staff', 'dentist'), uploadAvatar, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  return res.json({ url });
});

// Ảnh dịch vụ: chỉ admin
router.post('/upload/service-image', authorizeRoles('admin'), uploadServiceImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/services/${req.file.filename}`;
  return res.json({ url });
});

// Logo phòng khám: chỉ admin
router.post('/upload/clinic-logo', authorizeRoles('admin'), uploadClinicLogo, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/clinic/${req.file.filename}`;
  return res.json({ url });
});

// System settings: chỉ admin
router.get('/clinic-settings', authorizeRoles('admin'), getClinicSettings);
router.put('/clinic-settings', authorizeRoles('admin'), updateClinicSettings);

module.exports = router;

