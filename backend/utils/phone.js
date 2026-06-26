/**
 * FILE_GUIDE: phone.js — Chuẩn hóa số điện thoại Việt Nam
 * ----------------------------------------------------------------
 * Vấn đề: khách nhập "84912345678", "+84 912...", "0912..." — cần so sánh được.
 * Luôn quy về dạng 0xxxxxxxxx (10–11 chữ số).
 */

/**
 * normalizePhone — Chuẩn hóa số điện thoại về dạng chỉ gồm chữ số, prefix 0.
 * Logic: Loại bỏ ký tự không phải số. Chuỗi rỗng → `''`. Nếu bắt đầu `84` và đủ dài (≥11 số)
 * thì thay `84` bằng `0` (quốc tế → nội địa). Các trường hợp khác giữ nguyên chuỗi số đã lọc.
 * @param {string} input - Số điện thoại thô (có thể chứa dấu +, khoảng trắng).
 * @returns {string} Số đã chuẩn hóa (vd: `0912345678`) hoặc `''` nếu không có số.
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

/**
 * normalizePhoneInput — Chuẩn hóa SĐT từ form/query (có thể thiếu dấu + trước mã 84).
 * Logic: Trim input. Nếu bắt đầu `84` mà không phải `0` thì thêm `+` phía trước.
 * Nếu có khoảng trắng quanh `84` thì gộp và thêm `+`. Cuối cùng gọi `normalizePhone`.
 * @param {string} input - SĐT từ form hoặc query string.
 * @returns {string} Số đã chuẩn hóa qua `normalizePhone`.
 */
function normalizePhoneInput(input) {
  let raw = String(input || '').trim();
  if (raw.startsWith('84') && !raw.startsWith('0')) {
    raw = `+${raw}`;
  } else if (/^\s*84/.test(raw)) {
    raw = `+${raw.replace(/\s+/g, '')}`;
  }
  return normalizePhone(raw);
}

/**
 * phonesMatch — So sánh hai số điện thoại có cùng một thuê bao hay không.
 * Logic: Chuẩn hóa `a` bằng `normalizePhone`, `b` bằng `normalizePhoneInput` (xử lý thêm case form).
 * Trả `true` chỉ khi cả hai chuỗi sau chuẩn hóa đều khác rỗng và bằng nhau.
 * @param {string} a - Số thứ nhất (thường từ DB).
 * @param {string} b - Số thứ hai (thường từ input người dùng).
 * @returns {boolean} `true` nếu trùng SĐT sau chuẩn hóa.
 */
function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhoneInput(b);
  return na && nb && na === nb;
}

module.exports = { normalizePhone, normalizePhoneInput, phonesMatch };
