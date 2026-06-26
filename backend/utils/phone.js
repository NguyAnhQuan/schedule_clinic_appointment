/**
 * FILE_GUIDE: phone.js — Chuẩn hóa số điện thoại Việt Nam
 * ----------------------------------------------------------------
 * Vấn đề: khách nhập "84912345678", "+84 912...", "0912..." — cần so sánh được.
 * Luôn quy về dạng 0xxxxxxxxx (10–11 chữ số).
 */

function normalizePhone(input) {
  const digits = String(input || '')
    .trim()
    .replace(/[^\d]/g, '');
  if (!digits) return '';
  // 84xxxxxxxxx → 0xxxxxxxxx
  if (digits.startsWith('84') && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

/** Dùng khi nhận input từ form hoặc query string (có thể mất dấu +). */
function normalizePhoneInput(input) {
  let raw = String(input || '').trim();
  if (raw.startsWith('84') && !raw.startsWith('0')) {
    raw = `+${raw}`;
  } else if (/^\s*84/.test(raw)) {
    raw = `+${raw.replace(/\s+/g, '')}`;
  }
  return normalizePhone(raw);
}

/** So sánh hai SĐT sau khi chuẩn hóa — dùng tìm bệnh nhân trùng SĐT. */
function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhoneInput(b);
  return na && nb && na === nb;
}

module.exports = { normalizePhone, normalizePhoneInput, phonesMatch };
