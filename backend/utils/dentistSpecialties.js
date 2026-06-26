/**
 * FILE_GUIDE: dentistSpecialties.js — Danh sách chuyên khoa cố định (dropdown admin)
 */
/**
 * DENTIST_SPECIALTIES — Danh sách chuyên khoa nha khoa chuẩn dùng trong hệ thống.
 * Logic: Mảng hằng số cố định, đồng bộ với seed DB và dropdown form admin/tạo bác sĩ.
 * Không thay đổi runtime; client và server đều tham chiếu cùng bộ giá trị hợp lệ.
 * @type {string[]}
 */
const DENTIST_SPECIALTIES = [
  'Nha khoa tổng quát',
  'Chỉnh nha',
  'Thẩm mỹ nha khoa',
  'Phẫu thuật hàm mặt',
];

/**
 * isValidSpecialty — Kiểm tra chuyên khoa có nằm trong danh sách cho phép hay không.
 * Logic: Trim `value`, so sánh với `DENTIST_SPECIALTIES.includes`. Dùng validate input API/admin
 * trước khi lưu specialty vào bảng dentists.
 * @param {string} value - Tên chuyên khoa người dùng gửi lên.
 * @returns {boolean} `true` nếu là một trong các specialty hợp lệ.
 */
function isValidSpecialty(value) {
  return DENTIST_SPECIALTIES.includes(String(value || '').trim());
}

module.exports = { DENTIST_SPECIALTIES, isValidSpecialty };
