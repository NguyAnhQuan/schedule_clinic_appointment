# Hướng dẫn đọc code — Hệ thống đặt lịch phòng khám

Tài liệu này giúp bạn học cấu trúc dự án. Mỗi file nguồn có:

1. **Khối `FILE_GUIDE` đầu file** — vai trò file, luồng chính, file liên quan.
2. **JSDoc tiếng Việt trước mỗi hàm** — tên, mô tả, quyền (backend), logic chính, `@param`/`@returns`.
3. **Comment inline** — nhóm `useState`, từng `useEffect`, handler, section JSX (`// --- Bước 1 ---`).

**Cách đọc nhanh:** mở file → đọc `FILE_GUIDE` → lướt JSDoc từng hàm → đọc comment trong thân hàm / JSX.

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

## Danh sách file đã ghi chú chi tiết

Toàn bộ file nguồn chính (backend + frontend) đều có `FILE_GUIDE` **và** JSDoc/comment từng hàm.

### Backend
| File | Nội dung ghi chú |
|------|------------------|
| `server.js` | Entry point, middleware, mount route, `initDatabase` |
| `config/db.js` | 14+ hàm: schema, seed, enrich demo |
| `controllers/public.controller.js` | 18 hàm API công khai (đặt lịch, slot…) |
| `controllers/admin.controller.js` | 32 hàm CRUD + dashboard + chuyển trạng thái |
| `controllers/auth.controller.js` | register, login, profile, my-appointments |
| `routes/*.routes.js` | Comment từng dòng route |
| `middlewares/*.js` | JWT, phân quyền staff, upload multer |
| `utils/*.js` | Slot/overlap, SĐT, mật khẩu, expire, chuyên khoa |

### Frontend
| File | Nội dung ghi chú |
|------|------------------|
| `services/api.js` | Mọi export + 12 PublicApi + 38 AdminApi |
| `App.jsx` | PublicRoute, nhóm Route |
| `pages/BookAppointmentPage.jsx` | Helper, state, 6 useEffect, 3 bước form |
| `pages/*` (public) | Home, Services, Dentists, Check, Success… |
| `pages/admin/*` | 12 trang admin: state, load, modal, bảng |
| `components/*` | Pagination, Navbar, Footer, AdminLayout, RouteGuard |

## Lộ trình học đề xuất

1. `backend/server.js` → hiểu luồng request
2. `routes/public.routes.js` + `public.controller.js` (đặc biệt `createAppointment`)
3. `utils/appointmentSlots.js` — logic slot và chống trùng giờ
4. `frontend/src/services/api.js` — cách frontend gọi backend
5. `pages/BookAppointmentPage.jsx` — UI 3 bước + useEffect phụ thuộc form
6. `config/db.js` (`enrichDemoData`) — dữ liệu mẫu
7. `admin.controller.js` + `pages/admin/*` — quản trị
