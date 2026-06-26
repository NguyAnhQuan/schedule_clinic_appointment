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
