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

/**
 * parseTimeToMinutes — Chuyển chuỗi giờ "HH:MM" thành số phút kể từ 0h.
 * Logic: Lấy 5 ký tự đầu, tách giờ/phút, parse số. NaN → 0. Ví dụ `"08:30"` → 510.
 * @param {string} timeStr - Chuỗi thời gian (vd: `"08:30"` hoặc `"08:30:00"`).
 * @returns {number} Tổng phút từ 00:00.
 */
function parseTimeToMinutes(timeStr) {
  const raw = String(timeStr || '').slice(0, 5);
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * shiftTimeToMinutes — Parse cột TIME của MySQL (ca làm việc) thành phút.
 * Logic: `null`/`undefined` → 0. Nếu là `Date` (mysql2 đôi khi trả object năm 1970) dùng
 * `getHours`/`getMinutes`. Ngược lại regex tìm `H:MM` trong chuỗi, hoặc fallback `parseTimeToMinutes`.
 * @param {Date|string|null} value - Giá trị cột start_time/end_time của ca.
 * @returns {number} Phút bắt đầu/kết thúc ca.
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

/**
 * appointmentTimeToMinutes — Lấy phút-bắt-đầu từ cột DATETIME `appointment_time`.
 * Logic: `Date` → giờ/phút local. Chuỗi ISO/SQL: thay `T` bằng space, lấy phần giờ (vị trí 11–16
 * nếu đủ dài) rồi `parseTimeToMinutes`. Dùng khi map lịch đã đặt từ DB.
 * @param {Date|string} value - Thời điểm hẹn từ bảng appointments.
 * @returns {number} Phút trong ngày của lịch hẹn.
 */
function appointmentTimeToMinutes(value) {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  const raw = String(value || '').replace('T', ' ');
  const timePart = raw.length >= 16 ? raw.slice(11, 16) : raw.slice(0, 5);
  return parseTimeToMinutes(timePart);
}

/**
 * parseAppointmentStartMinutes — Trích phút bắt đầu từ chuỗi appointment_time (input API).
 * Logic: Tương tự `appointmentTimeToMinutes` nhưng chỉ nhận chuỗi; tách phần giờ rồi parse.
 * Dùng khi validate thời gian từ request trước khi ghi DB.
 * @param {string} appointmentTime - Chuỗi datetime từ client (ISO hoặc `YYYY-MM-DD HH:mm`).
 * @returns {number} Phút bắt đầu lịch hẹn.
 */
function parseAppointmentStartMinutes(appointmentTime) {
  const raw = String(appointmentTime || '').replace('T', ' ');
  const timePart = raw.length >= 16 ? raw.slice(11, 16) : raw.slice(0, 5);
  return parseTimeToMinutes(timePart);
}

/**
 * intervalsOverlap — Kiểm tra hai khoảng thời gian có giao nhau không.
 * Logic: Tính `end1 = start1 + duration1`, `end2 = start2 + duration2`. Chồng lấn khi
 * `start1 < end2 && start2 < end1` (hai đầu chạm nhau KHÔNG tính là overlap).
 * @param {number} start1 - Phút bắt đầu khoảng 1.
 * @param {number} duration1 - Độ dài khoảng 1 (phút).
 * @param {number} start2 - Phút bắt đầu khoảng 2.
 * @param {number} duration2 - Độ dài khoảng 2 (phút).
 * @returns {boolean} `true` nếu hai khoảng chồng lên nhau.
 */
function intervalsOverlap(start1, duration1, start2, duration2) {
  const end1 = start1 + duration1;
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
}

/**
 * slotOverlapsBooked — Khung giờ mới có đè lên bất kỳ lịch đã đặt nào không.
 * Logic: Duyệt `bookedIntervals`; với mỗi phần tử `{ startMin, duration }` gọi `intervalsOverlap`.
 * Trả `true` ngay khi tìm thấy một lịch chồng lấn.
 * @param {number} slotStartMin - Phút bắt đầu khung giờ đang xét.
 * @param {number} duration - Thời lượng dịch vụ (phút).
 * @param {Array<{ startMin: number, duration: number }>} bookedIntervals - Danh sách lịch đã đặt.
 * @returns {boolean} `true` nếu khung giờ bị chiếm.
 */
function slotOverlapsBooked(slotStartMin, duration, bookedIntervals) {
  return bookedIntervals.some((b) =>
    intervalsOverlap(slotStartMin, duration, b.startMin, b.duration)
  );
}

/**
 * getBookedIntervals — Lấy danh sách khoảng thời gian đã đặt của một bác sĩ trong một ca/ngày.
 * Logic: Query appointments JOIN services lấy `appointment_time` và `duration_minutes`.
 * Lọc theo dentist_id, shift_id, DATE(appointment_time), loại trừ status `canceled`/`no_show`.
 * Map mỗi dòng thành `{ startMin, duration }` (duration mặc định 30 nếu thiếu).
 * @param {import('mysql2/promise').PoolConnection} conn - Kết nối DB (transaction).
 * @param {number} dentistId - ID bác sĩ.
 * @param {number} shiftId - ID ca làm việc.
 * @param {string} workDate - Ngày làm việc (`YYYY-MM-DD`).
 * @returns {Promise<Array<{ startMin: number, duration: number }>>}
 */
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
 * countAvailableSlotsInShift — Đếm số khung giờ còn trống cho MỘT bác sĩ trong ca.
 * Logic: Quy đổi `shiftStart`/`shiftEnd` sang phút. Bước nhảy = `duration` dịch vụ (mặc định 30).
 * Vòng lặp: từ `current` đến khi `current + slotDuration <= endMin`; mỗi bước nếu
 * `slotOverlapsBooked` = false thì tăng `count`. Không cộng slot nếu không đủ thời gian kết thúc trong ca.
 * @param {Date|string} shiftStart - Giờ bắt đầu ca.
 * @param {Date|string} shiftEnd - Giờ kết thúc ca.
 * @param {number} duration - Thời lượng mỗi lịch hẹn (phút).
 * @param {Array<{ startMin: number, duration: number }>} bookedIntervals - Lịch đã đặt của bác sĩ.
 * @returns {number} Số khung giờ trống.
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

/**
 * listAvailableSlotTimes — Liệt kê các mốc giờ trống dạng chuỗi cho frontend.
 * Logic: Giống `countAvailableSlotsInShift` nhưng thay vì đếm, push chuỗi `"HH:MM"` (pad 2 chữ số)
 * cho mỗi khung không overlap. Trả mảng để UI render nút chọn giờ.
 * @param {Date|string} shiftStart - Giờ bắt đầu ca.
 * @param {Date|string} shiftEnd - Giờ kết thúc ca.
 * @param {number} duration - Thời lượng mỗi lịch hẹn (phút).
 * @param {Array<{ startMin: number, duration: number }>} bookedIntervals - Lịch đã đặt của bác sĩ.
 * @returns {string[]} Mảng giờ trống (vd: `["08:00", "09:00"]`).
 */
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
 * countShiftSlotsWithAnyDentist — Đếm khung giờ mà ÍT NHẤT một bác sĩ trong ca còn trống.
 * Logic: `bookedIntervalsByDentist` là mảng các mảng interval (mỗi phần tử = lịch của một bác sĩ).
 * Duyệt từng mốc thời gian trong ca; một mốc được tính nếu `lists.some` tìm được bác sĩ
 * mà `slotOverlapsBooked` = false tại mốc đó. Tránh cộng dồn slot của từng bác sĩ khi khách chưa chọn BS.
 * @param {Date|string} shiftStart - Giờ bắt đầu ca.
 * @param {Date|string} shiftEnd - Giờ kết thúc ca.
 * @param {number} duration - Thời lượng mỗi lịch hẹn (phút).
 * @param {Array<Array<{ startMin: number, duration: number }>>} bookedIntervalsByDentist - Lịch theo từng bác sĩ.
 * @returns {number} Số mốc giờ có ít nhất một bác sĩ rảnh.
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
