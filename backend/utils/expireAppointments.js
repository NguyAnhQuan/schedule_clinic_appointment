/**
 * Tự động cập nhật lịch hẹn quá ngày mà khách không đến (vẫn pending/confirmed).
 * Đặt trạng thái no_show — khách không đến sau ngày hẹn.
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
