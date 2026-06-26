/**
 * FILE_GUIDE: clinicSettings.js — Đọc cài đặt phòng khám (cache trong memory)
 */
const { pool } = require('../config/db');

let cached = null;
let cacheTime = 0;
const CACHE_MS = 30_000;

/**
 * invalidateClinicSettingsCache — Xóa cache cài đặt phòng khám trong bộ nhớ.
 * Logic: Gán `cached = null` và `cacheTime = 0` để lần gọi `getClinicSettingsRow` tiếp theo
 * buộc truy vấn lại DB. Gọi sau khi admin cập nhật quyền nhân viên hoặc cấu hình bảo mật.
 * @returns {void}
 */
function invalidateClinicSettingsCache() {
  cached = null;
  cacheTime = 0;
}

/**
 * getClinicSettingsRow — Lấy một dòng cài đặt phòng khám từ DB (có cache 30 giây).
 * Logic: Nếu cache còn hiệu lực (`Date.now() - cacheTime < CACHE_MS`) trả về ngay.
 * Ngược lại query `clinic_settings` lấy bản ghi đầu tiên, lưu vào `cached` rồi trả về.
 * Không có dòng nào thì trả object mặc định với các cột JSON null.
 * @returns {Promise<{ role_permissions_json: string|null, security_json: string|null }>}
 */
async function getClinicSettingsRow() {
  if (cached && Date.now() - cacheTime < CACHE_MS) {
    return cached;
  }
  const [rows] = await pool.query(
    'SELECT role_permissions_json, security_json FROM clinic_settings ORDER BY id ASC LIMIT 1'
  );
  cached = rows[0] || { role_permissions_json: null, security_json: null };
  cacheTime = Date.now();
  return cached;
}

/**
 * getStaffPermissions — Lấy map quyền theo vai trò nhân viên từ cài đặt phòng khám.
 * Logic: Gọi `getClinicSettingsRow`, parse `role_permissions_json` thành object.
 * Trả về thuộc tính `staff` (ví dụ quyền theo role receptionist/doctor). Parse lỗi hoặc thiếu dữ liệu → `{}`.
 * @returns {Promise<object>} Object quyền nhân viên (key thường là tên role).
 */
async function getStaffPermissions() {
  const row = await getClinicSettingsRow();
  try {
    const parsed = row.role_permissions_json ? JSON.parse(row.role_permissions_json) : {};
    return parsed.staff || {};
  } catch {
    return {};
  }
}

/**
 * getSecuritySettings — Lấy cấu hình bảo mật phòng khám (mật khẩu phức tạp, v.v.).
 * Logic: Gọi `getClinicSettingsRow`, parse `security_json` thành object. Parse lỗi hoặc cột null → `{}`.
 * @returns {Promise<object>} Cấu hình bảo mật (ví dụ `{ complex_passwords: true }`).
 */
async function getSecuritySettings() {
  const row = await getClinicSettingsRow();
  try {
    return row.security_json ? JSON.parse(row.security_json) : {};
  } catch {
    return {};
  }
}

module.exports = {
  getClinicSettingsRow,
  getStaffPermissions,
  getSecuritySettings,
  invalidateClinicSettingsCache,
};
