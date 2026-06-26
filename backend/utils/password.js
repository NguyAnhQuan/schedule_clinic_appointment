/**
 * FILE_GUIDE: password.js — Validate độ mạnh mật khẩu (theo clinic settings)
 */
/**
 * validatePassword — Kiểm tra mật khẩu có đủ điều kiện tối thiểu hay không.
 * Logic: Chuẩn hóa input thành chuỗi; từ chối nếu dưới 6 ký tự. Khi `security.complex_passwords` bật,
 * bắt buộc có ít nhất một chữ hoa, một chữ thường và một chữ số. Trả về `{ ok: true }` hoặc `{ ok: false, message }`.
 * @param {string} password - Mật khẩu người dùng nhập (có thể null/undefined).
 * @param {object} [security={}] - Cấu hình bảo mật từ clinic settings (ví dụ `{ complex_passwords: true }`).
 * @returns {{ ok: boolean, message?: string }} Kết quả hợp lệ hoặc lỗi kèm thông báo tiếng Việt.
 */
async function validatePassword(password, security = {}) {
  const value = String(password || '');
  if (value.length < 6) {
    return { ok: false, message: 'Mật khẩu cần ít nhất 6 ký tự' };
  }
  if (security.complex_passwords) {
    if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
      return {
        ok: false,
        message: 'Mật khẩu phải có chữ hoa, chữ thường và số (theo cấu hình bảo mật)',
      };
    }
  }
  return { ok: true };
}

module.exports = { validatePassword };
