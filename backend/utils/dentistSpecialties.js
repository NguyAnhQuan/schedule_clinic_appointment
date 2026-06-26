/** Danh sách chuyên khoa chuẩn — đồng bộ seed DB và form admin. */
const DENTIST_SPECIALTIES = [
  'Nha khoa tổng quát',
  'Chỉnh nha',
  'Thẩm mỹ nha khoa',
  'Phẫu thuật hàm mặt',
];

function isValidSpecialty(value) {
  return DENTIST_SPECIALTIES.includes(String(value || '').trim());
}

module.exports = { DENTIST_SPECIALTIES, isValidSpecialty };
