function normalizePhone(input) {
  const digits = String(input || '')
    .trim()
    .replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('84') && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

function normalizePhoneInput(input) {
  let raw = String(input || '').trim();
  // Query string hay biến "+" thành khoảng trắng hoặc thiếu mã quốc gia
  if (raw.startsWith('84') && !raw.startsWith('0')) {
    raw = `+${raw}`;
  } else if (/^\s*84/.test(raw)) {
    raw = `+${raw.replace(/\s+/g, '')}`;
  }
  return normalizePhone(raw);
}

function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhoneInput(b);
  return na && nb && na === nb;
}

module.exports = { normalizePhone, normalizePhoneInput, phonesMatch };
