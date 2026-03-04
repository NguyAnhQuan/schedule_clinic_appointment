# 🦷 Hệ thống đặt lịch phòng khám nha khoa

Website đặt lịch cho phòng khám nha khoa: **giao diện người dùng (bệnh nhân)** và **khu vực quản trị (admin/nha sĩ)**. Thiết kế hướng tới dễ dùng, bảo mật và mở rộng sau này.

---

## 1. 🎯 Mục tiêu

- Bệnh nhân **đặt lịch nhanh**, có thể không cần tài khoản (tra cứu bằng SĐT + mã lịch).
- Phòng khám **quản lý lịch hẹn, bệnh nhân, bác sĩ, dịch vụ, ca trực** tập trung.
- **Bảo mật dữ liệu** (mật khẩu bcrypt, JWT, phân quyền).
- Kiến trúc sẵn cho **mở rộng** (đặt cọc, báo cáo, nhắc lịch qua Zalo/SMS, v.v.).

---

## 2. 🧱 Công nghệ

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | React 19, React Router 7, Vite 7, Tailwind CSS 3 |
| **Backend** | Node.js, Express 5 |
| **Database** | MySQL 8 (mysql2/promise) |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **Upload** | Multer (avatar, logo phòng khám, ảnh dịch vụ) |

---

## 3. 📁 Cấu trúc dự án

```text
NhaKhoa/
├── frontend/                 # React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/       # PublicNavbar, PublicFooter, AdminLayout, ...
│   │   ├── pages/            # Trang user + admin
│   │   └── services/         # api.js (PublicApi, AdminApi, auth)
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/               # db.js (kết nối MySQL + init schema + seed)
│   ├── controllers/          # admin, auth, public
│   ├── middlewares/          # auth, upload (multer)
│   ├── routes/               # admin, auth, public
│   ├── uploads/              # avatars, clinic, services (tự tạo khi upload)
│   ├── server.js
│   └── package.json
├── ThietKe/                  # File HTML thiết kế (USER INTERFACE, ADMIN, chung)
├── THIET_KE_VS_CODE.md       # Mapping giữa thiết kế và code
├── readme.md
└── run.txt                   # Gợi ý lệnh chạy nhanh
```

---

## 4. 🚀 Cài đặt và chạy

### Yêu cầu

- Node.js (khuyến nghị LTS)
- MySQL 8 (hoặc tương thích)

### Biến môi trường Backend

Tạo file `backend/.env` (hoặc dùng mặc định trong code):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=dental_clinic
PORT=4000
JWT_SECRET=supersecret_jwt_key_change_me
```

### Chạy Backend

```bash
cd backend
npm install
npm run dev
```

Server chạy tại `http://localhost:4000`. Lần đầu chạy sẽ tự tạo database `dental_clinic` và các bảng (kèm seed: 1 admin, 1 dentist, 1 staff; mật khẩu đều `admin123`), đồng thời seed:

- Một số dịch vụ mẫu (Khám tổng quát, Cạo vôi, Tẩy trắng).
- Ca làm việc: **Ca sáng**, **Ca chiều**.
- Phân ca demo cho bác sĩ mặc định trong 7 ngày tới để bệnh nhân có thể đặt lịch ngay.

### Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Trang web chạy tại `http://localhost:5173`. Cấu hình API: trong `frontend` dùng `VITE_API_BASE_URL` (mặc định `http://localhost:4000/api`).

### Build production (Frontend)

```bash
cd frontend
npm run build
```

File tĩnh nằm trong `frontend/dist`, deploy lên bất kỳ host tĩnh nào; backend chạy riêng.

---

## 5. 📺 Routes và tính năng

### Giao diện người dùng (public)

Flow đặt lịch theo **dịch vụ → bác sĩ (tuỳ chọn) → ngày → ca → giờ cụ thể**, dựa trên phân ca `staff_shifts` và cấu hình `shifts`.

| Route | Trang | Mô tả |
|-------|--------|--------|
| `/` | HomePage | Trang chủ, giới thiệu, CTA đặt lịch |
| `/dich-vu` | ServicesPage | Danh sách dịch vụ đang hoạt động (từ API), hiển thị giá, thời lượng, ảnh thumbnail |
| `/bac-si` | DentistsPage | Đội ngũ bác sĩ, tìm kiếm/lọc, xem chi tiết + dịch vụ bác sĩ thực hiện + đánh giá sao trung bình |
| `/dat-lich` | BookAppointmentPage | Đặt lịch: chọn dịch vụ → (tuỳ chọn) ưu tiên bác sĩ → chọn ngày có bác sĩ trực cho dịch vụ → chọn ca → chọn bác sĩ trong ca → chọn giờ trống → nhập thông tin |
| `/dat-lich/thanh-cong/:id` | BookingSuccessPage | Xác nhận sau khi đặt lịch, hiển thị mã lịch hẹn để tra cứu |
| `/tra-cuu` | CheckAppointmentPage | Tra cứu lịch bằng SĐT + mã; nếu đã đăng nhập có thể xem “Lịch hẹn của tôi” và đi tới đánh giá |
| `/terms` | TermsPage | Điều khoản & bảo mật |
| `/maintenance` | MaintenancePage | Trang bảo trì hệ thống |
| `/403` | ForbiddenPage | Không có quyền truy cập |
| `*` | NotFoundPage | 404 |

### Khu vực Admin

Quản lý toàn bộ nghiệp vụ: lịch hẹn, bệnh nhân, hồ sơ, tài khoản, bác sĩ, dịch vụ, phân ca, lịch mở/đóng phòng khám, cấu hình chung.

| Route | Trang | Mô tả |
|-------|--------|--------|
| `/admin/login` | AdminLoginPage | Đăng nhập (admin/dentist/staff) |
| `/admin` | AdminDashboardPage | Dashboard: thống kê tổng quan (bệnh nhân, lịch, lịch hôm nay), 10 lịch sắp tới, thống kê ca hôm nay |
| `/admin/appointments` | AdminAppointmentsPage | Quản lý lịch hẹn, filter theo trạng thái/ngày/ca/bác sĩ, cập nhật trạng thái (pending → confirmed → completed / canceled / no_show) |
| `/admin/patients` | AdminPatientsPage | Danh sách bệnh nhân, thêm/sửa/xoá, avatar |
| `/admin/patients/:id/records` | AdminPatientRecordsPage | Danh sách hồ sơ bệnh án theo bệnh nhân |
| `/admin/patients/:id/records/:recordId` | AdminPatientRecordDetailPage | Chi tiết một hồ sơ bệnh án |
| `/admin/accounts` | AdminAccountsPage | Quản lý tài khoản (users: admin/dentist/staff) |
| `/admin/dentists` | AdminDentistsPage | Quản lý bác sĩ, thông tin chuyên môn, ảnh đại diện, trạng thái hoạt động, gắn với tài khoản user |
| `/admin/services-config` | AdminServicesConfigPage | Cấu hình dịch vụ (giá, thời lượng, trạng thái, thumbnail), gắn danh sách bác sĩ thực hiện (`service_dentists`) |
| `/admin/staff-schedules` | AdminStaffSchedulesPage | Quản lý phân ca bác sĩ cho 10 ngày mở cửa sắp tới (theo bảng `staff_shifts`), chỉnh sửa ca trực theo từng ngày/bác sĩ |
| `/admin/calendar` | AdminCalendarPage | Tổng quan lịch mở/đóng phòng khám và mức độ lấp đầy theo ngày/ca (dựa trên `working_days`, `staff_shifts`, `appointments`) |
| `/admin/settings` | AdminSettingsPage | System Settings: thông tin phòng khám (tên, địa chỉ, liên hệ, logo), quyền theo vai trò (`role_permissions_json`), cấu hình bảo mật (`security_json`) |

Menu admin có thêm nút **Trang chủ** (về `/`) phía trên khối user ở cuối sidebar.

---

## 6. 🔌 API (Backend)

- **Base URL:** `http://localhost:4000/api`

### Public (không bắt buộc đăng nhập)

- Dịch vụ, bác sĩ:
  - `GET /services` – danh sách dịch vụ đang hoạt động + `dentist_ids` thực hiện.
  - `GET /dentists` – danh sách bác sĩ đang hoạt động + thông tin rating.
  - `GET /dentists/:id` – chi tiết bác sĩ + dịch vụ + thống kê rating + danh sách đánh giá gần nhất.
- Flow đặt lịch theo ca:
  - `GET /available-dates?service_id[&dentist_id]` – các ngày có ít nhất một bác sĩ trực cho dịch vụ (và bác sĩ nếu truyền).
  - `GET /shifts-for-date?service_id&date[&dentist_id]` – danh sách ca trong ngày, số slot trống tổng.
  - `GET /dentists-for-booking?service_id&shift_id&date` – danh sách bác sĩ trong ca, rating, số slot còn lại theo từng bác sĩ.
  - `GET /slots-for-booking?service_id&dentist_id&shift_id&date` – các giờ trống trong ca cho bác sĩ & dịch vụ đã chọn.
- Đặt lịch & tra cứu:
  - `POST /appointments` – tạo lịch hẹn (có thể dùng tài khoản hoặc nhập tay thông tin bệnh nhân).
  - `GET /appointments/status?phone&id` – tra cứu lịch hẹn theo SĐT + mã lịch.
  - `GET /appointments/:id/rating` – lấy thông tin đánh giá (nếu có).
  - `POST /appointments/:id/rate` – đánh giá lịch (1–5 sao + comment), chỉ khi lịch đã hoàn thành; xác minh bằng SĐT.

### Auth

- `POST /auth/login` – đăng nhập (admin/dentist/staff).
- `POST /auth/register` – đăng ký tài khoản staff (dùng cho tương lai hoặc nội bộ).
- `GET /auth/me` – lấy thông tin tài khoản hiện tại.
- `PATCH /auth/me` – cập nhật thông tin tài khoản.
- `GET /auth/my-appointments` – lịch hẹn tương ứng với email/SĐT tài khoản (mapping sang bảng `patients`).

### Admin (cần JWT + role phù hợp)

- Dashboard & lịch tổng quan:
  - `GET /admin/dashboard` – thống kê nhanh, danh sách lịch sắp tới, thống kê ca hôm nay.
  - `GET /admin/calendar-overview?from&to` – tổng quan lịch mở/đóng và mức độ lấp đầy trong khoảng ngày.
  - `PATCH /admin/calendar-day` – cập nhật `working_days` (ngày mở/đóng + ghi chú).
- Quản lý lịch hẹn:
  - `GET /admin/appointments` – filter theo trạng thái/ngày/ca/bác sĩ + phân trang.
  - `PATCH /admin/appointments/:id/status` – cập nhật trạng thái lịch.
- Bệnh nhân & hồ sơ:
  - `GET /admin/patients`, `POST /admin/patients`, `PUT /admin/patients/:id`, `DELETE /admin/patients/:id`.
  - `GET /admin/patients/:id/records` – xem hồ sơ bệnh án theo bệnh nhân.
- Tài khoản & bác sĩ:
  - `GET/POST/PUT/DELETE /admin/users` – quản lý users.
  - `GET/POST/PATCH/DELETE /admin/dentists` – quản lý bác sĩ, trạng thái hoạt động.
- Dịch vụ:
  - `GET /admin/services` – danh sách dịch vụ + `dentist_ids`.
  - `POST /admin/services`, `PATCH /admin/services/:id`, `DELETE /admin/services/:id`.
- Cấu hình phòng khám:
  - `GET /admin/clinic-settings`, `PUT /admin/clinic-settings`.
- Ca & phân ca:
  - `GET /admin/shifts`, `POST /admin/shifts`, `PUT /admin/shifts/:id` – quản lý ca (tên, giờ, sức chứa/bác sĩ).
  - `GET /admin/staff-schedules` – dữ liệu phân ca cho 10 ngày mở cửa sắp tới.
  - `PUT /admin/staff-schedules` – ghi đè phân ca theo ngày/ca.
- Upload:
  - `POST /admin/upload/avatar` – upload avatar user/bệnh nhân/bác sĩ.
  - `POST /admin/upload/service-image` – upload ảnh dịch vụ.
  - `POST /admin/upload/clinic-logo` – upload logo phòng khám.

Chi tiết từng endpoint xem trong `backend/routes/` và `backend/controllers/`.

---

## 7. 🗄️ Database (MySQL)

Schema và migration nằm trong `backend/config/db.js` (tự tạo DB và bảng khi khởi động). Các bảng chính:

| Bảng | Mô tả |
|------|--------|
| `users` | Tài khoản (admin, dentist, staff), có `avatar_url` |
| `patients` | Bệnh nhân (full_name, phone, email, note, avatar_url) |
| `dentists` | Bác sĩ (user_id, specialty, experience_year, description, avatar_url, is_active) |
| `services` | Dịch vụ (name, description, price, duration_minutes, thumbnail_url, is_active) |
| `service_dentists` | N-N: dịch vụ – bác sĩ thực hiện |
| `shifts` | Ca làm việc (tên, giờ bắt đầu/kết thúc, max_appointments_per_dentist, is_active) |
| `staff_shifts` | Phân ca: bác sĩ – ca – ngày (`work_date`, status = assigned/canceled) |
| `appointments` | Lịch hẹn (patient, dentist, service, shift, appointment_time, status: pending → completed/canceled/no_show) |
| `appointment_ratings` | Đánh giá 1–5 sao + comment, một lịch một đánh giá (chỉ khi status = completed) |
| `medical_records` | Hồ sơ bệnh án (chẩn đoán, điều trị) theo appointment |
| `files` | File chung (xray, avatar, service, clinic, document) |
| `clinic_settings` | Cấu hình phòng khám (tên, địa chỉ, SĐT, email, giờ làm, logo_url, role_permissions_json, security_json) |
| `audit_logs` | Log thao tác (create/update/delete) |
| `payments` | Dự phòng cho thanh toán/đặt cọc (chưa dùng) |
| `working_days` | Cấu hình ngày mở/đóng phòng khám + ghi chú |

---

## 8. 🎨 Giao diện và thiết kế

- Màu chủ đạo: **primary** `#137fec`; nền user: **bg-light**; font: Inter, Material Icons.
- Thiết kế mẫu trong thư mục **ThietKe/** (USER INTERFACE, ADMIN, chung). Đối chiếu với code: xem file **THIET_KE_VS_CODE.md**.
- Admin: sidebar và header cố định (`h-screen`), chỉ nội dung bên trong cuộn.

---

## 9. 🔐 Bảo mật

- Mật khẩu: bcrypt.
- API admin: JWT trong header `Authorization: Bearer <token>`.
- Phân quyền theo `role` (admin / dentist / staff) trong route admin.
- Đánh giá lịch: chỉ khi lịch `completed`, xác minh bằng SĐT bệnh nhân hoặc user đăng nhập.

---

## 10. ✅ Tóm tắt tính năng hiện có

- **User:** Trang chủ, danh sách dịch vụ, đội ngũ bác sĩ (có sao + xem chi tiết + dịch vụ bác sĩ làm), đặt lịch theo ca (chọn dịch vụ → ưu tiên bác sĩ hoặc để phòng khám sắp xếp → ngày có ca trực → ca → bác sĩ trong ca → giờ trống), xác nhận đặt lịch, tra cứu lịch, đánh giá trải nghiệm (chỉ lịch đã hoàn thành), điều khoản, 403/404/maintenance.
- **Admin:** Dashboard, quản lý lịch (bảng + modal thao tác, không mất list khi cập nhật), bệnh nhân, hồ sơ bệnh án, tài khoản, bác sĩ (CRUD + ảnh đại diện), cấu hình dịch vụ (gắn bác sĩ), quản lý ca (`shifts`) và phân ca bác sĩ (`staff_shifts`), tổng quan lịch mở/đóng và mức độ lấp đầy (`calendar-overview`), System Settings (Clinic Info + logo, User Roles, Security), upload avatar/logo/ảnh dịch vụ, nút “Trang chủ” về site user.

---

## 11. 📌 Mở rộng sau này

- Xem ảnh X-quang (xray_imaging_viewer) dựa trên bảng `files`.
- Đặt cọc / thanh toán (tận dụng bảng `payments` đã có).
- Kích hoạt và áp dụng đầy đủ cấu hình Security (password expiry, auto logout, password policy) từ `clinic_settings.security_json`.
- Tích hợp kênh nhắc lịch ngoài hệ thống (Zalo, SMS, email) sau khi đặt lịch thành công.

Database và API hiện tại đã chuẩn bị để bổ sung các tính năng trên mà không phải sửa lớn.
