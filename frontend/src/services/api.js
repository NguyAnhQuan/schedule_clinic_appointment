/**
 * FILE_GUIDE: api.js — Lớp gọi API từ React sang backend
 * ----------------------------------------------------------------
 * - apiRequest: fetch JSON, tự xử lý lỗi 401 (xóa token).
 * - PublicApi: endpoint khách (đặt lịch, tra cứu…).
 * - AdminApi: endpoint quản trị (kèm authHeaders()).
 * - Token lưu localStorage qua setAuthToken / getAuthToken.
 * - VITE_API_BASE_URL trong .env production trỏ tới domain backend.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4100/api';
export const FILE_BASE = API_BASE.replace(/\/api$/, '');

/** Chuyển đường dẫn media tương đối thành URL đầy đủ — không gọi API; dùng khi hiển thị ảnh/logo/avatar từ backend (trường url hoặc path). */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${FILE_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

/** Chuyển URL media tuyệt đối về đường dẫn tương đối — không gọi API; dùng trước khi gửi payload lên backend (lưu path thay vì domain đầy đủ). */
export function toRelativeMediaPath(url) {
  if (!url) return '';
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url.replace(FILE_BASE, '');
    }
  }
  return url.startsWith('/') ? url : `/${url}`;
}

/** Hàm fetch JSON lõi — gọi bất kỳ endpoint nào dưới API_BASE; tự parse JSON, ném lỗi kèm message, xóa token khi 401; dùng làm nền cho PublicApi và AdminApi. */
export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    // Tránh bị 304 Not Modified làm hỏng xử lý JSON
    cache: 'no-store',
    ...options,
  });

  if (!res.ok) {
    const status = res.status;
    let message = 'Lỗi hệ thống';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }

    // Nếu token không hợp lệ/hết hạn thì xoá luôn token phía client
    if (status === 401) {
      setAuthToken(null);
      setAuthUser(null);
    }

    const error = new Error(message);
    error.status = status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

/** Upload file multipart/form-data — gọi POST tới path upload (ví dụ /admin/upload/*); dùng nội bộ cho avatar, ảnh dịch vụ, logo phòng khám. */
async function apiUpload(path, formData, withAuth = false) {
  const headers = withAuth ? authHeaders() : {};
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let message = 'Lỗi upload file';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

/** Lưu hoặc xóa JWT vào localStorage — không gọi API; dùng sau login thành công hoặc khi logout/401. */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

/** Đọc JWT từ localStorage — không gọi API; dùng khi cần kiểm tra đã đăng nhập hoặc ghép vào authHeaders(). */
export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

const AUTH_USER_KEY = 'auth_user';

/** Lưu hoặc xóa thông tin user đăng nhập vào localStorage — không gọi API; dùng sau login/register để hiển thị tên, vai trò mà không cần gọi /auth/me. */
export function setAuthUser(user) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

/** Đọc thông tin user đã lưu từ localStorage — không gọi API; dùng khởi tạo UI admin hoặc kiểm tra role trước khi gọi /auth/me. */
export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const ROLE_PERMS_KEY = 'clinic_role_permissions';

/** Đọc bảng phân quyền theo role từ localStorage — không gọi API; dùng ẩn/hiện menu admin theo quyền staff đã cache sau login. */
export function getStoredRolePermissions() {
  try {
    const raw = localStorage.getItem(ROLE_PERMS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Tạo header Authorization Bearer — không gọi API; dùng kèm mọi request AdminApi và upload cần xác thực. */
export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Public APIs
export const PublicApi = {
  /** Lấy danh sách dịch vụ nha khoa — GET /services; dùng trang chủ, dịch vụ, bước chọn dịch vụ khi đặt lịch (có thể lọc qua params). */
  getServices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/services${query ? `?${query}` : ''}`);
  },
  /** Lấy bác sĩ nhóm theo chuyên khoa — GET /dentists/by-department; dùng trang danh sách bác sĩ hiển thị theo khoa. */
  getDentistsByDepartment() {
    return apiRequest('/dentists/by-department');
  },
  /** Lấy danh sách bác sĩ — GET /dentists; dùng trang bác sĩ hoặc lọc bác sĩ công khai (params tùy chọn). */
  getDentists(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dentists${query ? `?${query}` : ''}`);
  },
  /** Lấy chi tiết một bác sĩ — GET /dentists/:id; dùng trang profile/hồ sơ công khai của bác sĩ. */
  getDentistDetail(id) {
    return apiRequest(`/dentists/${id}`);
  },
  /** Lấy các ngày còn trống để đặt lịch — GET /available-dates; dùng bước chọn ngày trong form đặt lịch (cần service_id, tùy chọn dentist_id). */
  getAvailableDates(serviceId, dentistId) {
    const params = new URLSearchParams({ service_id: String(serviceId) });
    if (dentistId) {
      params.append('dentist_id', String(dentistId));
    }
    return apiRequest(`/available-dates?${params.toString()}`);
  },
  /** Lấy ca khám khả dụng trong một ngày — GET /shifts-for-date; dùng bước chọn ca sau khi chọn ngày và dịch vụ. */
  getShiftsForDate(serviceId, date, dentistId) {
    const params = new URLSearchParams({
      service_id: String(serviceId),
      date,
    });
    if (dentistId) {
      params.append('dentist_id', String(dentistId));
    }
    return apiRequest(`/shifts-for-date?${params.toString()}`);
  },
  /** Lấy bác sĩ có thể nhận lịch theo dịch vụ, ca và ngày — GET /dentists-for-booking; dùng khi khách chưa chọn bác sĩ trước. */
  getDentistsForBooking(serviceId, shiftId, date) {
    return apiRequest(`/dentists-for-booking?service_id=${encodeURIComponent(serviceId)}&shift_id=${encodeURIComponent(shiftId)}&date=${encodeURIComponent(date)}`);
  },
  /** Lấy khung giờ (slot) còn trống — GET /slots-for-booking; dùng bước chọn giờ cụ thể trước khi xác nhận đặt lịch. */
  getSlotsForBooking(serviceId, dentistId, shiftId, date) {
    return apiRequest(`/slots-for-booking?service_id=${encodeURIComponent(serviceId)}&dentist_id=${encodeURIComponent(dentistId)}&shift_id=${encodeURIComponent(shiftId)}&date=${encodeURIComponent(date)}`);
  },
  /** Tạo lịch hẹn mới — POST /appointments; dùng khi khách gửi form đặt lịch (có thể kèm JWT nếu đã đăng nhập). */
  createAppointment(payload, options = {}) {
    return apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    });
  },
  /** Tra cứu trạng thái lịch hẹn — GET /appointments/status; dùng trang tra cứu bằng số điện thoại và mã lịch hẹn. */
  getAppointmentStatus(phone, id) {
    const query = new URLSearchParams({ phone, id }).toString();
    return apiRequest(`/appointments/status?${query}`);
  },
  /** Lấy đánh giá đã gửi của một lịch hẹn — GET /appointments/:id/rating; dùng hiển thị hoặc kiểm tra trước khi cho khách đánh giá. */
  getAppointmentRating(id) {
    return apiRequest(`/appointments/${id}/rating`);
  },
  /** Gửi đánh giá sau khám — POST /appointments/:id/rate; dùng form đánh giá dịch vụ/bác sĩ sau khi hoàn thành lịch hẹn. */
  submitAppointmentRating(id, payload, options = {}) {
    return apiRequest(`/appointments/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    });
  },
};

// Auth & Admin APIs
export const AdminApi = {
  /** Đăng nhập quản trị — POST /auth/login; dùng trang AdminLogin, tự lưu token và user vào localStorage khi thành công. */
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    if (data.user) setAuthUser(data.user);
    return data;
  },

  /** Đăng ký tài khoản — POST /auth/register; dùng khi tạo tài khoản mới (nếu có luồng đăng ký), tự lưu token/user nếu backend trả về. */
  async register(full_name, phone, email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, phone, email, password }),
    });
    if (data.token) setAuthToken(data.token);
    if (data.user) setAuthUser(data.user);
    return data;
  },

  /** Lấy thông tin user hiện tại — GET /auth/me; dùng sau đăng nhập hoặc refresh profile admin (cần Bearer token). */
  getMe() {
    return apiRequest('/auth/me', { headers: authHeaders() });
  },

  /** Lấy lịch hẹn của user đang đăng nhập — GET /auth/my-appointments; dùng khi bệnh nhân xem lịch của mình (nếu có luồng patient login). */
  getMyAppointments() {
    return apiRequest('/auth/my-appointments', { headers: authHeaders() });
  },

  /** Cập nhật hồ sơ cá nhân — PATCH /auth/me; dùng trang AdminProfile đổi tên, SĐT, mật khẩu. */
  updateProfile(payload) {
    return apiRequest('/auth/me', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Lấy số liệu tổng quan dashboard — GET /admin/dashboard; dùng trang AdminDashboard (cần quyền dashboard). */
  getDashboard() {
    return apiRequest('/admin/dashboard', {
      headers: authHeaders(),
    });
  },

  /** Lấy dữ liệu lịch tổng quan — GET /admin/calendar-overview; dùng trang AdminCalendar xem lịch theo tháng/tuần (lọc qua params). */
  getCalendarOverview(params = {}) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== '' && v !== null
      )
    );
    const query = new URLSearchParams(clean).toString();
    return apiRequest(`/admin/calendar-overview${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  /** Cập nhật trạng thái ngày làm việc — PATCH /admin/calendar-day; dùng đánh dấu ngày nghỉ/bận trên lịch phòng khám. */
  updateWorkingDay(date, status, note) {
    return apiRequest('/admin/calendar-day', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ date, status, note }),
    });
  },

  /** Lấy danh sách lịch hẹn quản trị — GET /admin/appointments; dùng trang AdminAppointments lọc theo trạng thái, ngày, bác sĩ. */
  getAppointments(params = {}) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== '' && v !== null
      )
    );
    const query = new URLSearchParams(clean).toString();
    return apiRequest(`/admin/appointments${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  /** Đổi trạng thái lịch hẹn — PATCH /admin/appointments/:id/status; dùng xác nhận, hủy, hoàn thành lịch từ bảng quản trị. */
  updateAppointmentStatus(id, status) {
    return apiRequest(`/admin/appointments/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
  },

  /** Lấy danh sách bệnh nhân — GET /admin/patients; dùng trang AdminPatients tìm kiếm và phân trang. */
  getPatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/patients${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  /** Tạo hồ sơ bệnh nhân mới — POST /admin/patients; dùng form thêm bệnh nhân tại quầy/lễ tân. */
  createPatient(payload) {
    return apiRequest('/admin/patients', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Cập nhật thông tin bệnh nhân — PUT /admin/patients/:id; dùng sửa hồ sơ bệnh nhân đã có. */
  updatePatient(id, payload) {
    return apiRequest(`/admin/patients/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Xóa bệnh nhân — DELETE /admin/patients/:id; dùng khi gỡ hồ sơ bệnh nhân khỏi hệ thống (theo quyền). */
  deletePatient(id) {
    return apiRequest(`/admin/patients/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  /** Lấy hồ sơ bệnh án của bệnh nhân — GET /admin/patients/:id/records; dùng trang chi tiết bệnh án theo bệnh nhân. */
  getPatientRecords(id) {
    return apiRequest(`/admin/patients/${id}/records`, {
      headers: authHeaders(),
    });
  },

  /** Tạo bản ghi bệnh án mới — POST /admin/patients/:patientId/records; dùng thêm lần khám/điều trị cho bệnh nhân. */
  createMedicalRecord(patientId, payload) {
    return apiRequest(`/admin/patients/${patientId}/records`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Cập nhật bản ghi bệnh án — PUT /admin/medical-records/:id; dùng sửa nội dung hồ sơ khám đã lưu. */
  updateMedicalRecord(id, payload) {
    return apiRequest(`/admin/medical-records/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Xóa bản ghi bệnh án — DELETE /admin/medical-records/:id; dùng gỡ hồ sơ khám sai hoặc trùng. */
  deleteMedicalRecord(id) {
    return apiRequest(`/admin/medical-records/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  /** Lấy danh sách tài khoản nhân sự — GET /admin/users; dùng trang AdminAccounts quản lý admin/staff/dentist. */
  getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  /** Tạo tài khoản nhân sự mới — POST /admin/users; dùng form thêm user với role và quyền tương ứng. */
  createUser(payload) {
    return apiRequest('/admin/users', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Cập nhật tài khoản nhân sự — PUT /admin/users/:id; dùng sửa thông tin, role hoặc trạng thái tài khoản. */
  updateUser(id, payload) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Xóa tài khoản nhân sự — DELETE /admin/users/:id; dùng vô hiệu hóa/xóa user khỏi hệ thống. */
  deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  /** Lấy danh sách bác sĩ (quản trị) — GET /admin/dentists; dùng trang AdminDentists CRUD bác sĩ nội bộ. */
  getDentists(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/dentists${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  /** Thêm bác sĩ mới — POST /admin/dentists; dùng form tạo hồ sơ bác sĩ và gán chuyên khoa. */
  createDentist(payload) {
    return apiRequest('/admin/dentists', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Cập nhật thông tin bác sĩ — PATCH /admin/dentists/:id; dùng sửa profile, chuyên khoa, trạng thái làm việc. */
  updateDentist(id, payload) {
    return apiRequest(`/admin/dentists/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Xóa bác sĩ — DELETE /admin/dentists/:id; dùng gỡ bác sĩ không còn làm việc tại phòng khám. */
  deleteDentist(id) {
    return apiRequest(`/admin/dentists/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  /** Lấy cấu hình dịch vụ (admin) — GET /admin/services; dùng trang AdminServicesConfig xem/sửa giá, thời lượng, ảnh. */
  getServicesConfig(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/services${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  /** Cập nhật một dịch vụ — PATCH /admin/services/:id; dùng sửa tên, giá, mô tả, ảnh dịch vụ. */
  updateService(id, payload) {
    return apiRequest(`/admin/services/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Tạo dịch vụ mới — POST /admin/services; dùng thêm dịch vụ nha khoa vào danh mục phòng khám. */
  createService(payload) {
    return apiRequest('/admin/services', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Xóa dịch vụ — DELETE /admin/services/:id; dùng gỡ dịch vụ ngừng cung cấp. */
  deleteService(id) {
    return apiRequest(`/admin/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  /** Upload ảnh đại diện — POST /admin/upload/avatar; dùng khi admin/bác sĩ đổi avatar, trả về path và URL đầy đủ. */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiUpload('/admin/upload/avatar', formData, true);
    const path = data.url && data.url.startsWith('/') ? data.url : `/${data.url || ''}`.replace(/\/+/g, '/');
    return { ...data, path, url: `${FILE_BASE}${path}` };
  },

  /** Upload ảnh minh họa dịch vụ — POST /admin/upload/service-image; dùng form cấu hình dịch vụ khi chọn file ảnh. */
  uploadServiceImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload('/admin/upload/service-image', formData, true).then((data) => ({
      ...data,
      url: `${FILE_BASE}${data.url}`,
    }));
  },

  /** Upload logo phòng khám — POST /admin/upload/clinic-logo; dùng trang AdminSettings khi đổi logo thương hiệu. */
  async uploadClinicLogo(file) {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiUpload('/admin/upload/clinic-logo', formData, true);
    const path =
      data.url && data.url.startsWith('/')
        ? data.url
        : `/${data.url || ''}`.replace(/\/+/g, '/');
    return { ...data, path, url: `${FILE_BASE}${path}` };
  },

  /** Lấy cài đặt phòng khám — GET /admin/clinic-settings; dùng trang AdminSettings và header/footer công khai (tên, logo, giờ mở cửa). */
  getClinicSettings() {
    return apiRequest('/admin/clinic-settings', {
      headers: authHeaders(),
    });
  },

  /** Lấy danh sách ca khám — GET /admin/shifts; dùng trang AdminShifts xem/sửa khung giờ làm việc. */
  getShifts() {
    return apiRequest('/admin/shifts', { headers: authHeaders() });
  },

  /** Tạo ca khám mới — POST /admin/shifts; dùng thêm ca sáng/chiều hoặc khung giờ tùy chỉnh. */
  createShift(payload) {
    return apiRequest('/admin/shifts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Cập nhật ca khám — PUT /admin/shifts/:id; dùng sửa giờ bắt đầu/kết thúc hoặc tên ca. */
  updateShift(id, payload) {
    return apiRequest(`/admin/shifts/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Lấy lịch phân công nhân sự — GET /admin/staff-schedules; dùng trang AdminStaffSchedules xem ai trực ca nào (lọc qua params). */
  getStaffSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/staff-schedules${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  /** Cập nhật lịch phân công nhân sự — PUT /admin/staff-schedules; dùng gán bác sĩ/nhân viên vào ca theo ngày/tuần. */
  updateStaffSchedules(payload) {
    return apiRequest('/admin/staff-schedules', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /** Lưu cài đặt phòng khám — PUT /admin/clinic-settings; dùng form AdminSettings cập nhật tên, địa chỉ, giờ làm, chế độ bảo trì. */
  updateClinicSettings(payload) {
    return apiRequest('/admin/clinic-settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
};
