/**
 * FILE_GUIDE: appointmentSlots.js — Tính toán khung giờ đặt lịch
 * ----------------------------------------------------------------
 * Dùng khi:
 *   - Hiển thị "còn X giờ trống" cho mỗi ca (getShiftsForDate)
 *   - Liệt kê giờ 8:00, 8:30… (getSlotsForBooking)
 *   - Chặn đặt trùng lịch (createAppointment)
 *
 * Ý tưởng: mỗi lịch hẹn là một khoảng [bắt đầu, bắt đầu + duration].
 * Hai khoảng chồng nhau nếu: start1 < end2 VÀ start2 < end1.
 */

/** Chuyển chuỗi "HH:MM" thành số phút từ 0h (vd: "08:30" → 510). */
function parseTimeToMinutes(timeStr) {
  const raw = String(timeStr || '').slice(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Parse cột TIME của MySQL.
 * mysql2 đôi khi trả về object Date (năm 1970) thay vì chuỗi — dùng getHours/getMinutes.
 */
function shiftTimeToMinutes(value) {
  if (value == null) return 0;
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  const s = String(value);
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  return parseTimeToMinutes(s);
}

/** Lấy phút-bắt-đầu từ cột DATETIME appointment_time (giờ máy chủ/local). */
function appointmentTimeToMinutes(value) {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  const raw = String(value || '').replace('T', ' ');
  const timePart = raw.length >= 16 ? raw.slice(11, 16) : raw.slice(0, 5);
  return parseTimeToMinutes(timePart);
}

function parseAppointmentStartMinutes(appointmentTime) {
  const raw = String(appointmentTime || '').replace('T', ' ');
  const timePart = raw.length >= 16 ? raw.slice(11, 16) : raw.slice(0, 5);
  return parseTimeToMinutes(timePart);
}

/** Hai khoảng thời gian có giao nhau không? (không tính chạm đuôi). */
function intervalsOverlap(start1, duration1, start2, duration2) {
  const end1 = start1 + duration1;
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
}

/** Khung giờ mới có đè lên bất kỳ lịch đã đặt nào không? */
function slotOverlapsBooked(slotStartMin, duration, bookedIntervals) {
  return bookedIntervals.some((b) =>
    intervalsOverlap(slotStartMin, duration, b.startMin, b.duration)
  );
}

/** Lấy danh sách lịch đã đặt của 1 bác sĩ trong 1 ca + 1 ngày (trừ đã hủy/không đến). */
async function getBookedIntervals(conn, dentistId, shiftId, workDate) {
  const [rows] = await conn.query(
    `SELECT a.appointment_time, s.duration_minutes
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     WHERE a.dentist_id = ? AND a.shift_id = ? AND DATE(a.appointment_time) = ?
       AND a.status NOT IN ('canceled','no_show')`,
    [dentistId, shiftId, workDate]
  );
  return (rows || []).map((r) => ({
    startMin: appointmentTimeToMinutes(r.appointment_time),
    duration: Number(r.duration_minutes) || 30,
  }));
}

/**
 * Đếm số khung giờ còn trống cho MỘT bác sĩ trong ca.
 * Duyệt từ start→end, bước nhảy = duration dịch vụ (vd 60p → 8:00, 9:00, 10:00).
 */
function countAvailableSlotsInShift(shiftStart, shiftEnd, duration, bookedIntervals) {
  let current = shiftTimeToMinutes(shiftStart);
  const endMin = shiftTimeToMinutes(shiftEnd);
  const slotDuration = Number(duration) || 30;
  let count = 0;
  while (current + slotDuration <= endMin) {
    if (!slotOverlapsBooked(current, slotDuration, bookedIntervals)) {
      count += 1;
    }
    current += slotDuration;
  }
  return count;
}

/** Trả về mảng chuỗi giờ "08:00", "09:00"… để frontend hiển thị nút chọn. */
function listAvailableSlotTimes(shiftStart, shiftEnd, duration, bookedIntervals) {
  let current = shiftTimeToMinutes(shiftStart);
  const endMin = shiftTimeToMinutes(shiftEnd);
  const slotDuration = Number(duration) || 30;
  const slots = [];
  while (current + slotDuration <= endMin) {
    if (!slotOverlapsBooked(current, slotDuration, bookedIntervals)) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    current += slotDuration;
  }
  return slots;
}

/**
 * Đếm số khung giờ mà ÍT NHẤT một bác sĩ trong ca còn trống.
 * Dùng khi khách chưa chọn bác sĩ cụ thể — tránh cộng dồn 12 bác sĩ × 3 slot.
 */
function countShiftSlotsWithAnyDentist(shiftStart, shiftEnd, duration, bookedIntervalsByDentist) {
  let current = shiftTimeToMinutes(shiftStart);
  const endMin = shiftTimeToMinutes(shiftEnd);
  const slotDuration = Number(duration) || 30;
  const lists = bookedIntervalsByDentist || [];
  if (!lists.length) return 0;
  let count = 0;
  while (current + slotDuration <= endMin) {
    const anyFree = lists.some(
      (intervals) => !slotOverlapsBooked(current, slotDuration, intervals)
    );
    if (anyFree) count += 1;
    current += slotDuration;
  }
  return count;
}

module.exports = {
  parseTimeToMinutes,
  shiftTimeToMinutes,
  appointmentTimeToMinutes,
  parseAppointmentStartMinutes,
  intervalsOverlap,
  slotOverlapsBooked,
  getBookedIntervals,
  countAvailableSlotsInShift,
  countShiftSlotsWithAnyDentist,
  listAvailableSlotTimes,
};
