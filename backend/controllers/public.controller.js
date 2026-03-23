const { pool } = require('../config/db');

function formatDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function normalizePhone(input) {
  const digits = String(input || '')
    .trim()
    .replace(/[^\d]/g, '');
  if (!digits) return '';
  // +84xxxxxxxxx -> 0xxxxxxxxx
  if (digits.startsWith('84') && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

async function getServices(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price, duration_minutes, thumbnail_url FROM services WHERE is_active = 1 ORDER BY id ASC'
    );
    const [links] = await pool.query('SELECT service_id, dentist_id FROM service_dentists');
    const byService = {};
    for (const row of links) {
      const sid = Number(row.service_id);
      const did = Number(row.dentist_id);
      if (!byService[sid]) byService[sid] = [];
      byService[sid].push(did);
    }
    const result = rows.map((s) => ({
      ...s,
      dentist_ids: byService[Number(s.id)] || [],
    }));
    res.json(result);
  } catch (err) {
    console.error('getServices error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function getDentists(req, res) {
  const { q, specialty } = req.query;
  try {
    let sql = `
      SELECT d.id, d.avatar_url, u.full_name, u.email, u.phone,
             d.specialty, d.experience_year, d.description,
             COALESCE(r.avg_rating, 0) AS avg_rating,
             COALESCE(r.rating_count, 0) AS rating_count
      FROM dentists d
      JOIN users u ON d.user_id = u.id AND u.role = 'dentist'
      LEFT JOIN (
        SELECT a.dentist_id,
               AVG(ar.rating_stars) AS avg_rating,
               COUNT(*) AS rating_count
        FROM appointment_ratings ar
        JOIN appointments a ON ar.appointment_id = a.id
        WHERE a.dentist_id IS NOT NULL
        GROUP BY a.dentist_id
      ) r ON r.dentist_id = d.id
      WHERE d.is_active = 1
    `;
    const params = [];

    if (q) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }
    if (specialty) {
      sql += ' AND d.specialty LIKE ?';
      params.push(`%${specialty}%`);
    }

    sql += ' ORDER BY u.full_name ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      try {
        // Fallback nếu DB chưa tạo bảng appointment_ratings
        let fallbackSql = `
          SELECT d.id, d.avatar_url, u.full_name, u.email, u.phone,
                 d.specialty, d.experience_year, d.description,
                 0 AS avg_rating, 0 AS rating_count
          FROM dentists d
          JOIN users u ON d.user_id = u.id AND u.role = 'dentist'
          WHERE d.is_active = 1
        `;
        const fallbackParams = [];
        if (q) {
          fallbackSql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
          const like = `%${q}%`;
          fallbackParams.push(like, like);
        }
        if (specialty) {
          fallbackSql += ' AND d.specialty LIKE ?';
          fallbackParams.push(`%${specialty}%`);
        }
        fallbackSql += ' ORDER BY u.full_name ASC';
        const [rows] = await pool.query(fallbackSql, fallbackParams);
        return res.json(rows);
      } catch (e2) {
        console.error('getDentists fallback error', e2);
      }
    }
    console.error('getDentists error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function getDentistById(req, res) {
  const { id } = req.params;
  try {
    const [dentists] = await pool.query(
      `SELECT d.id, d.avatar_url, d.specialty, d.experience_year, d.description,
              u.full_name, u.email, u.phone
       FROM dentists d
       JOIN users u ON d.user_id = u.id AND u.role = 'dentist'
       WHERE d.id = ? AND d.is_active = 1
       LIMIT 1`,
      [id]
    );
    if (!dentists.length) {
      return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
    }
    const [services] = await pool.query(
      `SELECT s.id, s.name, s.duration_minutes, s.price
       FROM service_dentists sd
       JOIN services s ON sd.service_id = s.id
       WHERE sd.dentist_id = ? AND s.is_active = 1
       ORDER BY s.name ASC`,
      [id]
    );
    let ratingSummary = { avg_rating: 0, rating_count: 0 };
    let reviews = [];
    try {
      const [[rs]] = await pool.query(
        `SELECT COALESCE(AVG(ar.rating_stars), 0) AS avg_rating,
                COALESCE(COUNT(*), 0) AS rating_count
         FROM appointment_ratings ar
         JOIN appointments a ON ar.appointment_id = a.id
         WHERE a.dentist_id = ?`,
        [id]
      );
      ratingSummary = rs || ratingSummary;
      const [rv] = await pool.query(
        `SELECT ar.rating_stars, ar.comment, ar.created_at,
                a.id AS appointment_id,
                p.full_name AS patient_name,
                s.name AS service_name
         FROM appointment_ratings ar
         JOIN appointments a ON ar.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN services s ON a.service_id = s.id
         WHERE a.dentist_id = ?
         ORDER BY ar.created_at DESC
         LIMIT 50`,
        [id]
      );
      reviews = rv || [];
    } catch (e) {
      if (!e || e.code !== 'ER_NO_SUCH_TABLE') {
        console.error('getDentistById rating error', e);
      }
    }

    res.json({ ...dentists[0], services, ...ratingSummary, reviews });
  } catch (err) {
    console.error('getDentistById error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/** GET /available-dates?service_id= — Ngày có ít nhất 1 bác sĩ trực làm được dịch vụ */
async function getAvailableDates(req, res) {
  const serviceId = req.query.service_id;
  const dentistId = req.query.dentist_id;
  if (!serviceId) {
    return res.status(400).json({ message: 'Thiếu service_id' });
  }
  try {
    const params = [serviceId];
    // Tìm các ngày có bác sĩ trực (đang hoạt động) cho dịch vụ trong khoảng tối đa 60 ngày tới
    let sql = `
      SELECT DISTINCT ss.work_date AS date
      FROM staff_shifts ss
      JOIN dentists d ON d.id = ss.dentist_id AND d.is_active = 1
      JOIN service_dentists sd ON sd.dentist_id = ss.dentist_id AND sd.service_id = ?
      JOIN shifts sh ON sh.id = ss.shift_id AND sh.is_active = 1
      WHERE ss.status = 'assigned'
        AND ss.work_date >= CURDATE()
        AND ss.work_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
    `;
    if (dentistId) {
      sql += ' AND ss.dentist_id = ?';
      params.push(dentistId);
    }
    sql += `
      ORDER BY ss.work_date ASC
      LIMIT 30
    `;

    const [rows] = await pool.query(sql, params);
    const dates = (rows || []).map((r) => formatDateKey(r.date)).filter(Boolean);
    res.json({ dates });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ dates: [] });
    }
    console.error('getAvailableDates error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/** GET /shifts-for-date?service_id=&date= — Ca trong ngày (còn slot, có BS trực làm dịch vụ) */
async function getShiftsForDate(req, res) {
  const { service_id: serviceId, date, dentist_id: dentistId } = req.query;
  if (!serviceId || !date) {
    return res.status(400).json({ message: 'Thiếu service_id hoặc date' });
  }
  try {
    const [shifts] = await pool.query(
      `SELECT sh.id, sh.name, sh.start_time, sh.end_time, sh.max_appointments_per_dentist
       FROM shifts sh
       WHERE sh.is_active = 1
       ORDER BY sh.start_time ASC`
    );
    const result = [];
    for (const sh of shifts || []) {
      const params = [serviceId, sh.id, date];
      let sql = `
        SELECT ss.dentist_id
        FROM staff_shifts ss
        JOIN dentists d ON d.id = ss.dentist_id AND d.is_active = 1
        JOIN service_dentists sd ON sd.dentist_id = ss.dentist_id AND sd.service_id = ?
        WHERE ss.shift_id = ? AND ss.work_date = ? AND ss.status = 'assigned'
      `;
      if (dentistId) {
        sql += ' AND ss.dentist_id = ?';
        params.push(dentistId);
      }
      const [dentistsOnShift] = await pool.query(sql, params);
      if (dentistsOnShift.length === 0) continue;
      const [serviceRow] = await pool.query(
        'SELECT duration_minutes FROM services WHERE id = ? LIMIT 1',
        [serviceId]
      );
      const duration = (serviceRow[0] && serviceRow[0].duration_minutes) || 30;
      let totalSlots = 0;
      for (const { dentist_id } of dentistsOnShift) {
        const [booked] = await pool.query(
          `SELECT COUNT(*) AS c FROM appointments
           WHERE dentist_id = ? AND shift_id = ? AND DATE(appointment_time) = ?
             AND status NOT IN ('canceled','no_show')`,
          [dentist_id, sh.id, date]
        );
        const maxPer = sh.max_appointments_per_dentist || 10;
        totalSlots += Math.max(0, maxPer - (booked[0].c || 0));
      }
      result.push({
        id: sh.id,
        name: sh.name,
        start_time: sh.start_time,
        end_time: sh.end_time,
        slots_left: totalSlots,
        is_full: totalSlots <= 0,
      });
    }
    res.json(result);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    console.error('getShiftsForDate error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/** GET /dentists-for-booking?service_id=&shift_id=&date= — Bác sĩ trong ca (còn slot) */
async function getDentistsForBooking(req, res) {
  const { service_id: serviceId, shift_id: shiftId, date } = req.query;
  if (!serviceId || !shiftId || !date) {
    return res.status(400).json({ message: 'Thiếu service_id, shift_id hoặc date' });
  }
  try {
    const [list] = await pool.query(
      `SELECT d.id, d.avatar_url, d.specialty,
              u.full_name,
              COALESCE(r.avg_rating, 0) AS avg_rating,
              COALESCE(r.rating_count, 0) AS rating_count
       FROM staff_shifts ss
       JOIN dentists d ON d.id = ss.dentist_id AND d.is_active = 1
       JOIN users u ON u.id = d.user_id
       JOIN service_dentists sd ON sd.dentist_id = d.id AND sd.service_id = ?
       LEFT JOIN (
         SELECT a.dentist_id, AVG(ar.rating_stars) AS avg_rating, COUNT(*) AS rating_count
         FROM appointment_ratings ar JOIN appointments a ON ar.appointment_id = a.id
         GROUP BY a.dentist_id
       ) r ON r.dentist_id = d.id
       WHERE ss.shift_id = ? AND ss.work_date = ? AND ss.status = 'assigned'
       ORDER BY u.full_name ASC`,
      [serviceId, shiftId, date]
    );
    const [shiftRow] = await pool.query(
      'SELECT max_appointments_per_dentist FROM shifts WHERE id = ? LIMIT 1',
      [shiftId]
    );
    const maxPer = (shiftRow[0] && shiftRow[0].max_appointments_per_dentist) || 10;
    const withSlots = await Promise.all(
      (list || []).map(async (d) => {
        const [booked] = await pool.query(
          `SELECT COUNT(*) AS c FROM appointments
           WHERE dentist_id = ? AND shift_id = ? AND DATE(appointment_time) = ?
             AND status NOT IN ('canceled','no_show')`,
          [d.id, shiftId, date]
        );
        const slotsLeft = Math.max(0, maxPer - (booked[0].c || 0));
        return { ...d, slots_left: slotsLeft };
      })
    );
    res.json(withSlots);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    console.error('getDentistsForBooking error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/** GET /slots-for-booking?service_id=&dentist_id=&shift_id=&date= — Các giờ trống */
async function getSlotsForBooking(req, res) {
  const { service_id: serviceId, dentist_id: dentistId, shift_id: shiftId, date } = req.query;
  if (!serviceId || !dentistId || !shiftId || !date) {
    return res.status(400).json({ message: 'Thiếu service_id, dentist_id, shift_id hoặc date' });
  }
  try {
    // Đảm bảo bác sĩ đang hoạt động và có thực hiện dịch vụ này
    const [[dentistRow]] = await pool.query(
      `SELECT d.id
       FROM dentists d
       JOIN service_dentists sd ON sd.dentist_id = d.id AND sd.service_id = ?
       WHERE d.id = ? AND d.is_active = 1
       LIMIT 1`,
      [serviceId, dentistId]
    );
    if (!dentistRow) {
      return res.json({ slots: [] });
    }

    // Đảm bảo bác sĩ có trực ca này trong ngày được chọn
    const [[assign]] = await pool.query(
      `SELECT 1
       FROM staff_shifts
       WHERE dentist_id = ? AND shift_id = ? AND work_date = ? AND status = 'assigned'
       LIMIT 1`,
      [dentistId, shiftId, date]
    );
    if (!assign) {
      return res.json({ slots: [] });
    }

    const [[shift]] = await pool.query(
      'SELECT start_time, end_time FROM shifts WHERE id = ? AND is_active = 1 LIMIT 1',
      [shiftId]
    );
    if (!shift) return res.json({ slots: [] });
    const [[svc]] = await pool.query(
      'SELECT duration_minutes FROM services WHERE id = ? LIMIT 1',
      [serviceId]
    );
    const duration = (svc && svc.duration_minutes) || 30;
    const [booked] = await pool.query(
      `SELECT appointment_time FROM appointments
       WHERE dentist_id = ? AND shift_id = ? AND DATE(appointment_time) = ?
         AND status NOT IN ('canceled','no_show')`,
      [dentistId, shiftId, date]
    );
    const bookedSet = new Set(
      (booked || []).map((r) => {
        const t = r.appointment_time;
        return t instanceof Date ? t.toISOString().slice(11, 16) : String(t).slice(11, 16);
      })
    );
    const start = String(shift.start_time).slice(0, 5);
    const end = String(shift.end_time).slice(0, 5);
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let current = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const slots = [];
    while (current + duration <= endMin) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!bookedSet.has(timeStr)) {
        slots.push(timeStr);
      }
      current += duration;
    }
    res.json({ slots });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ slots: [] });
    }
    console.error('getSlotsForBooking error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function createAppointment(req, res) {
  const {
    full_name,
    phone,
    email,
    service_id,
    dentist_id,
    shift_id,
    appointment_time,
    note,
    use_account,
  } = req.body || {};

  let finalName = full_name;
  let finalPhone = phone;
  let finalEmail = email;
  if (req.user && use_account) {
    finalName = req.user.full_name || finalName;
    finalPhone = req.user.phone || finalPhone;
    finalEmail = req.user.email || finalEmail;
  }

  if (!finalName || !service_id || !appointment_time) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (họ tên, dịch vụ, thời gian)' });
  }
  if (req.user && use_account && !finalPhone) {
    return res.status(400).json({
      message: 'Tài khoản chưa có số điện thoại. Vui lòng cập nhật SĐT trong Quản lý thông tin cá nhân.',
    });
  }
  if (!finalPhone) {
    return res.status(400).json({ message: 'Vui lòng nhập số điện thoại' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[service]] = await conn.query(
      'SELECT id, duration_minutes FROM services WHERE id = ? AND is_active = 1 LIMIT 1',
      [service_id]
    );
    if (!service) {
      await conn.rollback();
      return res.status(400).json({ message: 'Dịch vụ không tồn tại hoặc đã tắt' });
    }

    const apptDateTime = appointment_time.replace('T', ' ').slice(0, 19);
    const workDate = apptDateTime.slice(0, 10);
    const shiftIdNum = shift_id ? Number(shift_id) : null;
    let dentistIdFinal = dentist_id ? Number(dentist_id) : null;

    if (shiftIdNum) {
      const [[shift]] = await conn.query(
        'SELECT id FROM shifts WHERE id = ? AND is_active = 1 LIMIT 1',
        [shiftIdNum]
      );
      if (!shift) {
        await conn.rollback();
        return res.status(400).json({ message: 'Ca không tồn tại hoặc đã tắt' });
      }
      if (dentistIdFinal) {
        const [sd] = await conn.query(
          'SELECT 1 FROM service_dentists WHERE service_id = ? AND dentist_id = ? LIMIT 1',
          [service_id, dentistIdFinal]
        );
        if (!sd.length) {
          await conn.rollback();
          return res.status(400).json({ message: 'Bác sĩ không thực hiện dịch vụ này' });
        }
        const [ss] = await conn.query(
          `SELECT 1 FROM staff_shifts WHERE dentist_id = ? AND shift_id = ? AND work_date = ? AND status = 'assigned' LIMIT 1`,
          [dentistIdFinal, shiftIdNum, workDate]
        );
        if (!ss.length) {
          await conn.rollback();
          return res.status(400).json({ message: 'Bác sĩ không trực ca này trong ngày đã chọn' });
        }
        const [booked] = await conn.query(
          `SELECT COUNT(*) AS c FROM appointments
           WHERE dentist_id = ? AND shift_id = ? AND DATE(appointment_time) = ?
             AND status NOT IN ('canceled','no_show')`,
          [dentistIdFinal, shiftIdNum, workDate]
        );
        const [[shiftRow]] = await conn.query(
          'SELECT max_appointments_per_dentist FROM shifts WHERE id = ? LIMIT 1',
          [shiftIdNum]
        );
        const maxPer = (shiftRow && shiftRow.max_appointments_per_dentist) || 10;
        if ((booked[0].c || 0) >= maxPer) {
          await conn.rollback();
          return res.status(400).json({ message: 'Ca này đã đủ số lượng đặt với bác sĩ đã chọn' });
        }
      } else {
        const [candidates] = await conn.query(
          `SELECT ss.dentist_id FROM staff_shifts ss
           JOIN service_dentists sd ON sd.dentist_id = ss.dentist_id AND sd.service_id = ?
           WHERE ss.shift_id = ? AND ss.work_date = ? AND ss.status = 'assigned'`,
          [service_id, shiftIdNum, workDate]
        );
        let picked = null;
        for (const c of candidates) {
          const [booked] = await conn.query(
            `SELECT COUNT(*) AS cnt FROM appointments
             WHERE dentist_id = ? AND shift_id = ? AND DATE(appointment_time) = ?
               AND status NOT IN ('canceled','no_show')`,
            [c.dentist_id, shiftIdNum, workDate]
          );
          const [[shiftRow]] = await conn.query(
            'SELECT max_appointments_per_dentist FROM shifts WHERE id = ? LIMIT 1',
            [shiftIdNum]
          );
          const maxPer = (shiftRow && shiftRow.max_appointments_per_dentist) || 10;
          if ((booked[0].cnt || 0) < maxPer) {
            picked = c.dentist_id;
            break;
          }
        }
        if (!picked) {
          await conn.rollback();
          return res.status(400).json({ message: 'Không còn slot trống trong ca này' });
        }
        dentistIdFinal = picked;
      }
    }

    const [existing] = await conn.query(
      'SELECT id FROM patients WHERE phone = ? LIMIT 1',
      [finalPhone]
    );

    let patientId;
    if (existing.length) {
      patientId = existing[0].id;
      await conn.query(
        'UPDATE patients SET full_name = ?, email = ?, note = ? WHERE id = ?',
        [finalName, finalEmail || null, note || null, patientId]
      );
    } else {
      const [result] = await conn.query(
        'INSERT INTO patients (full_name, phone, email, note) VALUES (?, ?, ?, ?)',
        [finalName, finalPhone, finalEmail || null, note || null]
      );
      patientId = result.insertId;
    }

    const [apptResult] = await conn.query(
      `INSERT INTO appointments 
        (patient_id, dentist_id, service_id, shift_id, appointment_time, status, public_note, internal_note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)`,
      [
        patientId,
        dentistIdFinal,
        service_id,
        shiftIdNum,
        apptDateTime,
        note || null,
      ]
    );

    await conn.commit();

    res.status(201).json({
      id: apptResult.insertId,
      message: 'Đặt lịch thành công',
    });
  } catch (err) {
    await conn.rollback();
    console.error('createAppointment error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  } finally {
    conn.release();
  }
}

async function getAppointmentStatus(req, res) {
  const { phone, id } = req.query;
  if (!phone || !id) {
    return res.status(400).json({ message: 'Thiếu SĐT hoặc mã lịch hẹn' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.status, a.appointment_time, 
              s.name AS service_name,
              d.id AS dentist_id, u.full_name AS dentist_name,
              p.full_name AS patient_name, p.phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE a.id = ? AND p.phone = ?
       LIMIT 1`,
      [id, phone]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getAppointmentStatus error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function getAppointmentRating(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT ar.rating_stars, ar.comment, ar.created_at
       FROM appointment_ratings ar
       WHERE ar.appointment_id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows.length) {
      return res.json({ rating_stars: null, comment: null, created_at: null });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('getAppointmentRating error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

async function submitAppointmentRating(req, res) {
  const { id } = req.params;
  const { stars, comment, phone } = req.body || {};
  const numStars = stars != null ? Number(stars) : null;
  if (numStars == null || numStars < 1 || numStars > 5) {
    return res.status(400).json({ message: 'Vui lòng chọn số sao từ 1 đến 5' });
  }

  try {
    const [appointments] = await pool.query(
      `SELECT a.id, a.status, p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );
    if (!appointments.length) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }
    const appt = appointments[0];
    if (appt.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ được đánh giá khi lịch hẹn đã hoàn thành' });
    }

    const bodyPhone = normalizePhone(phone);
    const userPhone = normalizePhone(req.user && req.user.phone);
    const verifyPhone = bodyPhone || userPhone;
    if (!verifyPhone) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại đặt lịch để xác minh' });
    }
    const patientPhone = normalizePhone(appt.patient_phone);
    if (patientPhone !== verifyPhone) {
      return res.status(403).json({ message: 'Số điện thoại không khớp với lịch hẹn này' });
    }

    await pool.query(
      `INSERT INTO appointment_ratings (appointment_id, rating_stars, comment)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating_stars = VALUES(rating_stars), comment = VALUES(comment)`,
      [id, numStars, (comment || '').trim() || null]
    );
    res.json({ message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (err) {
    console.error('submitAppointmentRating error', err);
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        message:
          'Thiếu bảng đánh giá. Vui lòng khởi động lại backend để tự tạo bảng appointment_ratings.',
      });
    }
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

module.exports = {
  getServices,
  getDentists,
  getDentistById,
  getAvailableDates,
  getShiftsForDate,
  getDentistsForBooking,
  getSlotsForBooking,
  createAppointment,
  getAppointmentStatus,
  getAppointmentRating,
  submitAppointmentRating,
};

