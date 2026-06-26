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

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${FILE_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

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

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

const AUTH_USER_KEY = 'auth_user';

export function setAuthUser(user) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const ROLE_PERMS_KEY = 'clinic_role_permissions';

export function getStoredRolePermissions() {
  try {
    const raw = localStorage.getItem(ROLE_PERMS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Public APIs
export const PublicApi = {
  getServices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/services${query ? `?${query}` : ''}`);
  },
  getDentistsByDepartment() {
    return apiRequest('/dentists/by-department');
  },
  getDentists(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dentists${query ? `?${query}` : ''}`);
  },
  getDentistDetail(id) {
    return apiRequest(`/dentists/${id}`);
  },
  getAvailableDates(serviceId, dentistId) {
    const params = new URLSearchParams({ service_id: String(serviceId) });
    if (dentistId) {
      params.append('dentist_id', String(dentistId));
    }
    return apiRequest(`/available-dates?${params.toString()}`);
  },
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
  getDentistsForBooking(serviceId, shiftId, date) {
    return apiRequest(`/dentists-for-booking?service_id=${encodeURIComponent(serviceId)}&shift_id=${encodeURIComponent(shiftId)}&date=${encodeURIComponent(date)}`);
  },
  getSlotsForBooking(serviceId, dentistId, shiftId, date) {
    return apiRequest(`/slots-for-booking?service_id=${encodeURIComponent(serviceId)}&dentist_id=${encodeURIComponent(dentistId)}&shift_id=${encodeURIComponent(shiftId)}&date=${encodeURIComponent(date)}`);
  },
  createAppointment(payload, options = {}) {
    return apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    });
  },
  getAppointmentStatus(phone, id) {
    const query = new URLSearchParams({ phone, id }).toString();
    return apiRequest(`/appointments/status?${query}`);
  },
  getAppointmentRating(id) {
    return apiRequest(`/appointments/${id}/rating`);
  },
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
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    if (data.user) setAuthUser(data.user);
    return data;
  },

  async register(full_name, phone, email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, phone, email, password }),
    });
    if (data.token) setAuthToken(data.token);
    if (data.user) setAuthUser(data.user);
    return data;
  },

  getMe() {
    return apiRequest('/auth/me', { headers: authHeaders() });
  },

  getMyAppointments() {
    return apiRequest('/auth/my-appointments', { headers: authHeaders() });
  },

  updateProfile(payload) {
    return apiRequest('/auth/me', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getDashboard() {
    return apiRequest('/admin/dashboard', {
      headers: authHeaders(),
    });
  },

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

  updateWorkingDay(date, status, note) {
    return apiRequest('/admin/calendar-day', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ date, status, note }),
    });
  },

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

  updateAppointmentStatus(id, status) {
    return apiRequest(`/admin/appointments/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
  },

  getPatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/patients${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  createPatient(payload) {
    return apiRequest('/admin/patients', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updatePatient(id, payload) {
    return apiRequest(`/admin/patients/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deletePatient(id) {
    return apiRequest(`/admin/patients/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  getPatientRecords(id) {
    return apiRequest(`/admin/patients/${id}/records`, {
      headers: authHeaders(),
    });
  },

  createMedicalRecord(patientId, payload) {
    return apiRequest(`/admin/patients/${patientId}/records`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateMedicalRecord(id, payload) {
    return apiRequest(`/admin/medical-records/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteMedicalRecord(id) {
    return apiRequest(`/admin/medical-records/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  createUser(payload) {
    return apiRequest('/admin/users', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateUser(id, payload) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  getDentists(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/dentists${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  createDentist(payload) {
    return apiRequest('/admin/dentists', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateDentist(id, payload) {
    return apiRequest(`/admin/dentists/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteDentist(id) {
    return apiRequest(`/admin/dentists/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  getServicesConfig(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/services${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  updateService(id, payload) {
    return apiRequest(`/admin/services/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  createService(payload) {
    return apiRequest('/admin/services', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteService(id) {
    return apiRequest(`/admin/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiUpload('/admin/upload/avatar', formData, true);
    const path = data.url && data.url.startsWith('/') ? data.url : `/${data.url || ''}`.replace(/\/+/g, '/');
    return { ...data, path, url: `${FILE_BASE}${path}` };
  },

  uploadServiceImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload('/admin/upload/service-image', formData, true).then((data) => ({
      ...data,
      url: `${FILE_BASE}${data.url}`,
    }));
  },

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

  getClinicSettings() {
    return apiRequest('/admin/clinic-settings', {
      headers: authHeaders(),
    });
  },

  getShifts() {
    return apiRequest('/admin/shifts', { headers: authHeaders() });
  },

  createShift(payload) {
    return apiRequest('/admin/shifts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateShift(id, payload) {
    return apiRequest(`/admin/shifts/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getStaffSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/staff-schedules${query ? `?${query}` : ''}`, {
      headers: authHeaders(),
    });
  },

  updateStaffSchedules(payload) {
    return apiRequest('/admin/staff-schedules', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateClinicSettings(payload) {
    return apiRequest('/admin/clinic-settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },
};

