# Hướng dẫn đọc code — Hệ thống đặt lịch phòng khám

Tài liệu này giúp bạn học cấu trúc dự án. Mỗi file nguồn cũng có **khối ghi chú đầu file** (`FILE_GUIDE`) giải thích vai trò.

## Kiến trúc tổng quan

```
Khách (trình duyệt)
    ↓ React (frontend/src)
    ↓ fetch → /api/*
Backend Express (backend/server.js)
    ↓ routes → controllers → MySQL (config/db.js)
```

| Thư mục | Vai trò |
|---------|---------|
| `backend/server.js` | Khởi động Express, gắn route, init DB |
| `backend/routes/` | Định nghĩa URL → hàm xử lý |
| `backend/controllers/` | Logic nghiệp vụ (đặt lịch, admin CRUD) |
| `backend/utils/` | Hàm dùng chung (giờ, SĐT, JWT…) |
| `backend/middlewares/` | Kiểm tra đăng nhập, quyền, upload |
| `backend/config/db.js` | Kết nối MySQL, tạo bảng, seed dữ liệu mẫu |
| `frontend/src/pages/` | Mỗi trang = 1 màn hình |
| `frontend/src/services/api.js` | Gọi API backend |

## Luồng đặt lịch (quan trọng nhất)

1. **BookAppointmentPage.jsx** — form 3 bước: dịch vụ → ngày/ca/giờ → thông tin khách
2. **public.controller.js** — API public:
   - `getAvailableDates` — ngày có bác sĩ trực
   - `getShiftsForDate` — ca còn giờ trống
   - `getDentistsForBooking` — bác sĩ trong ca
   - `getSlotsForBooking` — giờ cụ thể (8:00, 9:00…)
   - `createAppointment` — lưu lịch, chống trùng giờ
3. **appointmentSlots.js** — tính slot theo `duration_minutes`, kiểm tra chồng lịch

## Luồng đăng nhập admin

1. **AdminLoginPage.jsx** → `POST /api/auth/login`
2. **auth.controller.js** — bcrypt + JWT
3. **auth.js** middleware — `Bearer token` trên mọi request admin
4. **AdminRouteGuard.jsx** — chặn route nếu chưa login

## Bảng DB chính

- `users` — tài khoản (admin, dentist, staff, customer)
- `dentists` — hồ sơ bác sĩ (gắn `user_id`)
- `services` — dịch vụ + `duration_minutes`
- `service_dentists` — bác sĩ nào làm dịch vụ nào
- `shifts` — ca (sáng/chiều, giờ bắt đầu/kết thúc)
- `staff_shifts` — lịch trực bác sĩ theo ngày
- `patients` — bệnh nhân (có thể không có tài khoản)
- `appointments` — lịch hẹn (`status`: pending → confirmed → completed / no_show)

## Danh sách file có ghi chú FILE_GUIDE

Mở bất kỳ file nào bên dưới — đầu file có khối `FILE_GUIDE` giải thích vai trò.

### Backend
- `server.js`, `config/db.js`
- `controllers/public.controller.js`, `admin.controller.js`, `auth.controller.js`
- `routes/public.routes.js`, `admin.routes.js`, `auth.routes.js`
- `middlewares/auth.js`, `staffPermissions.js`, `upload.js`
- `utils/appointmentSlots.js`, `phone.js`, `password.js`, `clinicSettings.js`, `expireAppointments.js`, `dentistSpecialties.js`

### Frontend
- `main.jsx`, `App.jsx`, `services/api.js`
- `pages/BookAppointmentPage.jsx` (có thêm ghi chú từng useEffect)
- Tất cả trang trong `pages/` và `pages/admin/`
- `components/` (Pagination, Navbar, AdminLayout…)


1. `backend/server.js`
2. `backend/routes/public.routes.js` + `public.controller.js` (hàm `createAppointment`)
3. `backend/utils/appointmentSlots.js`
4. `frontend/src/services/api.js`
5. `frontend/src/pages/BookAppointmentPage.jsx`
6. `backend/config/db.js` (phần `enrichDemoData`)
7. `admin.controller.js` + các trang `frontend/src/pages/admin/*`
