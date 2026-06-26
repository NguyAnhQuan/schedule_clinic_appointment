/**
 * FILE_GUIDE: admin.routes.js — URL /api/admin/*
 * Gắn authMiddleware + authorizeRoles / authorizeStaffPermission trước handler.
 */
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

/** Mọi route admin đều yêu cầu JWT và role admin, dentist hoặc staff. */
router.use(authMiddleware, authorizeRoles('admin', 'dentist', 'staff'));

/** Dashboard tổng quan — staff cần quyền `dashboard`. */
router.get('/dashboard', authorizeStaffPermission('dashboard'), getDashboard);
/** Lịch tổng quan theo ngày/tháng — staff cần quyền `calendar_overview`. */
router.get('/calendar-overview', authorizeStaffPermission('calendar_overview'), getCalendarOverview);
/** Cập nhật trạng thái ngày làm việc trên lịch — chỉ admin/staff, quyền `calendar_overview`. */
router.patch(
  '/calendar-day',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('calendar_overview'),
  updateWorkingDay
);

/** Danh sách ca làm việc (shifts) — mọi role admin router được phép. */
router.get('/shifts', listShifts);
/** Tạo ca làm việc mới — chỉ admin. */
router.post('/shifts', authorizeRoles('admin'), createShift);
/** Sửa ca làm việc theo id — chỉ admin. */
router.put('/shifts/:id', authorizeRoles('admin'), updateShift);

/** Xem lịch phân ca nhân viên — staff cần quyền `staff_schedules`. */
router.get('/staff-schedules', authorizeStaffPermission('staff_schedules'), getStaffSchedules);
/** Cập nhật lịch phân ca — admin/staff/dentist, staff cần quyền `staff_schedules`. */
router.put(
  '/staff-schedules',
  authorizeRoles('admin', 'staff', 'dentist'),
  authorizeStaffPermission('staff_schedules'),
  updateStaffSchedules
);

/** Danh sách lịch hẹn — admin/staff, quyền `appointments`. */
router.get(
  '/appointments',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('appointments'),
  listAppointments
);
/** Đổi trạng thái lịch hẹn — admin/staff, quyền `appointments`. */
router.patch(
  '/appointments/:id/status',
  authorizeRoles('admin', 'staff'),
  authorizeStaffPermission('appointments'),
  updateAppointmentStatus
);

/** CRUD bệnh nhân và hồ sơ y tế — admin/staff, quyền `patients`. */
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

/** Quản lý tài khoản hệ thống (users) — chỉ admin. */
router.get('/users', authorizeRoles('admin'), listUsers);
router.post('/users', authorizeRoles('admin'), createUser);
router.put('/users/:id', authorizeRoles('admin'), updateUser);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);

/** Quản lý bác sĩ — xem/sửa admin/staff (quyền `dentists_view_edit`); tạo/xóa chỉ admin. */
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

/** Cấu hình dịch vụ nha khoa — chỉ admin. */
router.get('/services', authorizeRoles('admin'), listServicesConfig);
router.post('/services', authorizeRoles('admin'), createService);
router.patch('/services/:id', authorizeRoles('admin'), updateService);
router.delete('/services/:id', authorizeRoles('admin'), deleteService);

/** Upload avatar user — admin/staff/dentist; trả URL `/uploads/avatars/...`. */
router.post('/upload/avatar', authorizeRoles('admin', 'staff', 'dentist'), uploadAvatar, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/avatars/${req.file.filename}`;
  return res.json({ url });
});

/** Upload ảnh dịch vụ — chỉ admin; trả URL `/uploads/services/...`. */
router.post('/upload/service-image', authorizeRoles('admin'), uploadServiceImage, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/services/${req.file.filename}`;
  return res.json({ url });
});

/** Upload logo phòng khám — chỉ admin; trả URL `/uploads/clinic/...`. */
router.post('/upload/clinic-logo', authorizeRoles('admin'), uploadClinicLogo, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  const url = `/uploads/clinic/${req.file.filename}`;
  return res.json({ url });
});

/** Đọc / cập nhật cài đặt phòng khám (tên, giờ làm, bảo mật…) — chỉ admin. */
router.get('/clinic-settings', authorizeRoles('admin'), getClinicSettings);
router.put('/clinic-settings', authorizeRoles('admin'), updateClinicSettings);

module.exports = router;
