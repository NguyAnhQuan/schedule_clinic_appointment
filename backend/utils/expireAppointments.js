/**
 * FILE_GUIDE: expireAppointments.js — Tự động đánh dấu no_show lịch quá ngày
 * Gọi khi init DB, mở dashboard, hoặc danh sách lịch admin.
 */
/**
 * expirePastAppointments — Tự động cập nhật lịch hẹn quá ngày chưa hoàn thành thành no_show.
 * Logic: UPDATE appointments SET status = 'no_show' WHERE DATE(appointment_time) < CURDATE()
 * VÀ status IN ('pending', 'confirmed'). Lịch quá hạn mà khách không đến được coi là không đến.
 * Không đụng lịch đã canceled, completed, no_show. Trả số dòng bị ảnh hưởng.
 * @param {import('mysql2/promise').PoolConnection|import('mysql2/promise').Pool} conn - Kết nối hoặc pool MySQL.
 * @returns {Promise<number>} Số lịch hẹn vừa chuyển sang no_show.
 */
async function expirePastAppointments(conn) {
  const [result] = await conn.query(
    `UPDATE appointments
     SET status = 'no_show'
     WHERE DATE(appointment_time) < CURDATE()
       AND status IN ('pending', 'confirmed')`
  );
  return result.affectedRows || 0;
}

module.exports = { expirePastAppointments };
