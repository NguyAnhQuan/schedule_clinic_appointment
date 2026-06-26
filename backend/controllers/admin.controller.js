/**
 * FILE_GUIDE: admin.controller.js — API quản trị (CRUD, dashboard, lịch)
 * =============================================================================
 * Yêu cầu JWT + role (admin/staff/dentist tùy endpoint).
 * listAppointments / listPatients: có phân trang page, limit.
 * updateAppointmentStatus: kiểm tra chuyển trạng thái hợp lệ (APPOINTMENT_STATUS_TRANSITIONS).
 * expirePastAppointments: tự gọi khi load lịch — quá ngày → no_show.
 */
const { pool } = require('../config/db');
const { normalizePhone, normalizePhoneInput, phonesMatch } = require('../utils/phone');
const { getSecuritySettings, invalidateClinicSettingsCache } = require('../utils/clinicSettings');
const { validatePassword } = require('../utils/password');
const { expirePastAppointments } = require('../utils/expireAppointments');
const { isValidSpecialty } = require('../utils/dentistSpecialties');

/**
 * APPOINTMENT_STATUS_TRANSITIONS — Bảng chuyển trạng thái lịch hẹn hợp lệ.
 * Quyền: (hằng số nội bộ, dùng bởi updateAppointmentStatus)
 * Logic chính: key = trạng thái hiện tại, value = mảng trạng thái được phép chuyển tới;
 * trạng thái kết thúc (completed, canceled, no_show) không cho chuyển tiếp.
 */
const APPOINTMENT_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'canceled', 'no_show'],
  confirmed: ['checked_in', 'in_progress', 'canceled', 'no_show'],
  checked_in: ['in_progress', 'completed', 'canceled', 'no_show'],
  in_progress: ['completed', 'canceled'],
  completed: [],
  canceled: [],
  no_show: [],
};

/**
 * findPatientIdByPhone — Tìm ID bệnh nhân theo số điện thoại (so khớp linh hoạt).
 * Quyền: (hàm nội bộ, gọi từ createPatient / updatePatient)
 * Logic chính: Lấy danh sách patients, dùng phonesMatch để so khớp số đã chuẩn hoá.
 * @param {object} connOrPool - Kết nối DB hoặc pool (mặc định pool)
 * @param {string} phone - Số điện thoại cần tìm
 * @returns {Promise<number|null>} ID bệnh nhân hoặc null
 */
async function findPatientIdByPhone(connOrPool, phone) {
  const db = connOrPool || pool;
  const [rows] = await db.query('SELECT id, phone FROM patients');
  const match = rows.find((row) => phonesMatch(row.phone, phone));
  return match ? match.id : null;
}

/**
 * ensureMedicalRecordForAppointment — Tự tạo hồ sơ bệnh án placeholder nếu chưa có.
 * Quyền: (hàm nội bộ, gọi khi lịch hẹn chuyển sang completed)
 * Logic chính: Kiểm tra medical_records theo appointment_id; nếu chưa có thì INSERT chẩn đoán/điều trị mặc định.
 * @param {number|string} appointmentId - ID lịch hẹn
 */
async function ensureMedicalRecordForAppointment(appointmentId) {
  const [exists] = await pool.query(
    'SELECT id FROM medical_records WHERE appointment_id = ? LIMIT 1',
    [appointmentId]
  );
  if (exists.length) return;
  const [[appt]] = await pool.query(
    'SELECT patient_id FROM appointments WHERE id = ? LIMIT 1',
    [appointmentId]
  );
  if (!appt) return;
  await pool.query(
    `INSERT INTO medical_records (patient_id, appointment_id, diagnosis, treatment)
     VALUES (?, ?, ?, ?)`,
    [appt.patient_id, appointmentId, 'Chưa cập nhật chẩn đoán', 'Chưa cập nhật điều trị']
  );
}

function formatDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

/**
 * getDashboard — Thống kê tổng quan phòng khám cho trang dashboard.
 * Quyền: admin / staff / dentist (permission: dashboard)
 * Logic chính: expirePastAppointments, đếm bệnh nhân/lịch hẹn/hôm nay, 10 lịch sắp tới, thống kê ca & tỷ lệ lấp đầy.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getDashboard(req, res) {
  try {
    await expirePastAppointments(pool);
    const [[patients]] = await pool.query('SELECT COUNT(*) AS total FROM patients');
    const [[appointments]] = await pool.query('SELECT COUNT(*) AS total FROM appointments');
    const [[todayAppointments]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM appointments 
       WHERE DATE(appointment_time) = CURDATE() AND status NOT IN ('canceled','no_show')`
    );
    const [upcoming] = await pool.query(
      `SELECT a.id, a.appointment_time, a.status,
              p.full_name AS patient_name,
              s.name AS service_name,
              sh.name AS shift_name,
              u.full_name AS dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN shifts sh ON a.shift_id = sh.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE a.appointment_time >= NOW()
       ORDER BY a.appointment_time ASC
       LIMIT 10`
    );

    let shifts_today = 0;
    let dentists_on_duty = 0;
    let fill_rate = 0;
    let patients_by_shift = [];
    try {
      const [shiftsTodayRows] = await pool.query(
        `SELECT COUNT(DISTINCT ss.shift_id) AS c FROM staff_shifts ss
         WHERE ss.work_date = CURDATE() AND ss.status = 'assigned'`
      );
      shifts_today = (shiftsTodayRows[0] && shiftsTodayRows[0].c) || 0;
      const [dentistsRows] = await pool.query(
        `SELECT COUNT(DISTINCT ss.dentist_id) AS c FROM staff_shifts ss
         WHERE ss.work_date = CURDATE() AND ss.status = 'assigned'`
      );
      dentists_on_duty = (dentistsRows[0] && dentistsRows[0].c) || 0;
      const [totalSlotsRows] = await pool.query(
        `SELECT COALESCE(SUM(sh.max_appointments_per_dentist), 0) AS total
         FROM staff_shifts ss
         JOIN shifts sh ON sh.id = ss.shift_id AND sh.is_active = 1
         WHERE ss.work_date = CURDATE() AND ss.status = 'assigned'`
      );
      const totalSlots = (totalSlotsRows[0] && totalSlotsRows[0].total) || 0;
      const bookedToday = (todayAppointments && todayAppointments.total) || 0;
      fill_rate = totalSlots > 0 ? Math.round((bookedToday / totalSlots) * 100) : 0;
      const [byShift] = await pool.query(
        `SELECT sh.name AS shift_name, COUNT(a.id) AS patient_count
         FROM shifts sh
         LEFT JOIN appointments a ON a.shift_id = sh.id AND DATE(a.appointment_time) = CURDATE()
           AND a.status NOT IN ('canceled','no_show')
         WHERE sh.is_active = 1
         GROUP BY sh.id, sh.name`
      );
      patients_by_shift = byShift || [];
    } catch (e) {
      if (e && e.code !== 'ER_NO_SUCH_TABLE') console.error('getDashboard shifts stats', e);
    }

    res.json({
      total_patients: patients.total,
      total_appointments: appointments.total,
      today_appointments: todayAppointments.total,
      upcoming_appointments: upcoming,
      shifts_today,
      dentists_on_duty,
      fill_rate,
      patients_by_shift,
    });
  } catch (err) {
    console.error('getDashboard error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getCalendarOverview — Tổng quan lịch mở cửa theo ngày trong khoảng thời gian.
 * Quyền: admin / staff / dentist (permission: calendar_overview)
 * Logic chính: Gộp working_days, staff_shifts, capacity và số lịch đặt; trả trạng thái mở/đóng từng ngày (mặc định 15 ngày trước – 45 ngày sau).
 * @param {import('express').Request} req - query: from, to (YYYY-MM-DD, tùy chọn)
 * @param {import('express').Response} res
 */
async function getCalendarOverview(req, res) {
  try {
    let { from, to } = req.query;

    const today = new Date();
    if (!from || !to) {
      const start = new Date(today);
      start.setDate(start.getDate() - 15);
      const end = new Date(today);
      end.setDate(end.getDate() + 45);
      from = start.toISOString().slice(0, 10);
      to = end.toISOString().slice(0, 10);
    }

    // Lấy cấu hình ngày làm việc / ngày nghỉ (working_days)
    const [workingRows] = await pool.query(
      `SELECT work_date, status, note FROM working_days WHERE work_date BETWEEN ? AND ?`,
      [from, to]
    );
    const overrideOpen = new Set();
    const overrideClosed = new Set();
    const notesMap = new Map();
    for (const row of workingRows || []) {
      const key = formatDateKey(row.work_date);
      if (row.status === 'open') {
        overrideOpen.add(key);
        overrideClosed.delete(key);
      } else if (row.status === 'closed') {
        overrideClosed.add(key);
        overrideOpen.delete(key);
      }
      if (row.note) {
        notesMap.set(key, String(row.note));
      }
    }

    // Lấy số bác sĩ trực và số ca có bác sĩ theo từng ngày
    const [dentistCounts] = await pool.query(
      `SELECT ss.work_date,
              COUNT(DISTINCT ss.dentist_id) AS dentists_on_duty,
              COUNT(DISTINCT ss.shift_id)   AS shifts_with_dentists
       FROM staff_shifts ss
       WHERE ss.work_date BETWEEN ? AND ?
         AND ss.status = 'assigned'
       GROUP BY ss.work_date`,
      [from, to]
    );

    // Lấy sức chứa (capacity) theo ngày dựa trên số bác sĩ * max_appointments_per_dentist mỗi ca
    const [capacityRows] = await pool.query(
      `SELECT ss.work_date,
              SUM(sh.max_appointments_per_dentist) AS capacity
       FROM staff_shifts ss
       JOIN shifts sh ON sh.id = ss.shift_id AND sh.is_active = 1
       WHERE ss.work_date BETWEEN ? AND ?
         AND ss.status = 'assigned'
       GROUP BY ss.work_date`,
      [from, to]
    );

    // Số lịch hẹn đã đặt theo ngày (không tính canceled, no_show)
    const [bookedRows] = await pool.query(
      `SELECT DATE(a.appointment_time) AS work_date,
              COUNT(*) AS booked
       FROM appointments a
       WHERE DATE(a.appointment_time) BETWEEN ? AND ?
         AND a.status NOT IN ('canceled','no_show')
       GROUP BY DATE(a.appointment_time)`,
      [from, to]
    );

    // Map thống kê theo ngày
    const dentistsMap = new Map();
    for (const row of dentistCounts || []) {
      const key = formatDateKey(row.work_date);
      dentistsMap.set(key, {
        dentists_on_duty: row.dentists_on_duty || 0,
        shifts_with_dentists: row.shifts_with_dentists || 0,
      });
    }

    const capacityMap = new Map();
    for (const row of capacityRows || []) {
      const key = formatDateKey(row.work_date);
      capacityMap.set(key, row.capacity || 0);
    }

    const bookedMap = new Map();
    for (const row of bookedRows || []) {
      const key = formatDateKey(row.work_date);
      bookedMap.set(key, row.booked || 0);
    }

    // Duyệt toàn bộ dải ngày from..to để tính trạng thái mở/đóng
    const items = [];
    const closedDates = [];

    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
      const dateStr = formatDateKey(cursor);

      // Mặc định: ngày mở cửa, chỉ đóng khi có cấu hình trong working_days
      let isClosed;
      if (overrideOpen.has(dateStr)) {
        isClosed = false;
      } else if (overrideClosed.has(dateStr)) {
        isClosed = true;
      } else {
        isClosed = false;
      }

      const dentistsInfo = dentistsMap.get(dateStr) || {};
      const capacity = capacityMap.get(dateStr) || 0;
      const booked = bookedMap.get(dateStr) || 0;
      const note = notesMap.get(dateStr) || null;

      const item = {
        date: dateStr,
        dentists_on_duty: isClosed ? 0 : dentistsInfo.dentists_on_duty || 0,
        shifts_with_dentists: isClosed ? 0 : dentistsInfo.shifts_with_dentists || 0,
        capacity: isClosed ? 0 : capacity,
        booked: isClosed ? 0 : booked,
        is_closed: isClosed ? 1 : 0,
        note,
      };
      items.push(item);
      if (isClosed) closedDates.push(dateStr);

      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({
      from,
      to,
      days: items,
      closed_dates: closedDates,
      open_override_dates: Array.from(overrideOpen),
      closed_override_dates: Array.from(overrideClosed),
    });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ from: null, to: null, days: [] });
    }
    console.error('getCalendarOverview error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * listAppointments — Danh sách lịch hẹn có lọc và phân trang.
 * Quyền: admin / staff (permission: appointments)
 * Logic chính: expirePastAppointments, lọc theo status/date/shift_id/dentist_id, JOIN bệnh nhân/dịch vụ/ca/bác sĩ, trả data + pagination.
 * @param {import('express').Request} req - query: page, limit, status, date, shift_id, dentist_id
 * @param {import('express').Response} res
 */
async function listAppointments(req, res) {
  const { page = 1, limit = 20, status, date, shift_id, dentist_id } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    // Tự động đánh dấu no_show cho lịch quá hạn trước khi truy vấn
    await expirePastAppointments(pool);
    let where = '1=1';
    const params = [];
    // Ghép điều kiện lọc động theo query string
    if (status) {
      where += ' AND a.status = ?';
      params.push(status);
    }
    if (date) {
      where += ' AND DATE(a.appointment_time) = ?';
      params.push(date);
    }
    if (shift_id) {
      where += ' AND a.shift_id = ?';
      params.push(shift_id);
    }
    if (dentist_id) {
      where += ' AND a.dentist_id = ?';
      params.push(dentist_id);
    }

    // Truy vấn danh sách lịch hẹn kèm thông tin liên quan
    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_time, a.status, a.shift_id,
              DATE(a.appointment_time) AS appointment_date,
              TIME(a.appointment_time) AS appointment_time_slot,
              p.full_name AS patient_name, p.phone,
              s.name AS service_name,
              s.thumbnail_url AS service_thumbnail,
              sh.name AS shift_name,
              u.full_name AS dentist_name, d.id AS dentist_id
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN services s ON a.service_id = s.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN shifts sh ON a.shift_id = sh.id
       WHERE ${where}
       ORDER BY a.appointment_time DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Đếm tổng bản ghi để phân trang
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a WHERE ${where}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    });
  } catch (err) {
    console.error('listAppointments error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateAppointmentStatus — Cập nhật trạng thái một lịch hẹn.
 * Quyền: admin / staff (permission: appointments)
 * Logic chính: Validate status, kiểm tra chuyển trạng thái theo APPOINTMENT_STATUS_TRANSITIONS, UPDATE DB; nếu completed thì tạo hồ sơ bệnh án placeholder.
 * @param {import('express').Request} req - params: id; body: status
 * @param {import('express').Response} res
 */
async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = [
    'pending',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'canceled',
    'no_show',
  ];
  // Kiểm tra status nằm trong danh sách cho phép
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  try {
    // Lấy trạng thái hiện tại của lịch hẹn
    const [[current]] = await pool.query('SELECT status FROM appointments WHERE id = ? LIMIT 1', [id]);
    if (!current) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }
    // Kiểm tra chuyển trạng thái hợp lệ theo bảng APPOINTMENT_STATUS_TRANSITIONS
    const nextAllowed = APPOINTMENT_STATUS_TRANSITIONS[current.status] || [];
    if (current.status !== status && !nextAllowed.includes(status)) {
      return res.status(400).json({
        message: `Không thể chuyển từ "${current.status}" sang "${status}"`,
      });
    }

    const [result] = await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    // Hoàn thành khám → đảm bảo có hồ sơ bệnh án
    if (status === 'completed') {
      await ensureMedicalRecordForAppointment(id);
    }

    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error('updateAppointmentStatus error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * listPatients — Danh sách bệnh nhân có tìm kiếm và phân trang.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Lọc theo q (tên/SĐT/email), ORDER BY created_at DESC, trả data + pagination.
 * @param {import('express').Request} req - query: q, page, limit
 * @param {import('express').Response} res
 */
async function listPatients(req, res) {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, phone, email, note, avatar_url, created_at
       FROM patients
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM patients WHERE ${where}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    });
  } catch (err) {
    console.error('listPatients error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createPatient — Tạo bệnh nhân mới.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Chuẩn hoá SĐT, kiểm tra trùng phonesMatch, INSERT patients, trả bản ghi vừa tạo.
 * @param {import('express').Request} req - body: full_name, phone, email, note, avatar_url
 * @param {import('express').Response} res
 */
async function createPatient(req, res) {
  const { full_name, phone, email, note, avatar_url } = req.body || {};
  if (!full_name || !phone) {
    return res.status(400).json({ message: 'Thiếu tên hoặc số điện thoại' });
  }
  const normalizedPhone = normalizePhoneInput(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  try {
    const existingId = await findPatientIdByPhone(pool, normalizedPhone);
    if (existingId) {
      return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng cho bệnh nhân khác' });
    }

    const [result] = await pool.query(
      'INSERT INTO patients (full_name, phone, email, note, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [full_name, normalizedPhone, email || null, note || null, avatar_url || null]
    );
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, note, avatar_url, created_at FROM patients WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createPatient error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getPatientRecords — Lấy hồ sơ bệnh án và lịch hẹn của một bệnh nhân.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Trả thông tin patient, danh sách medical_records kèm lịch hẹn, và appointments chưa có hồ sơ.
 * @param {import('express').Request} req - params: id (patient id)
 * @param {import('express').Response} res
 */
async function getPatientRecords(req, res) {
  const { id } = req.params;

  try {
    const [[patient]] = await pool.query(
      'SELECT id, full_name, phone, email, note, avatar_url, created_at FROM patients WHERE id = ?',
      [id]
    );
    if (!patient) {
      return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
    }

    const [records] = await pool.query(
      `SELECT mr.id, mr.diagnosis, mr.treatment, mr.created_at, mr.updated_at,
              a.appointment_time, a.status, s.name AS service_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE mr.patient_id = ?
       ORDER BY mr.created_at DESC`,
      [id]
    );

    const [appointmentsWithoutRecords] = await pool.query(
      `SELECT a.id, a.appointment_time, a.status, s.name AS service_name
       FROM appointments a
       LEFT JOIN medical_records mr ON mr.appointment_id = a.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.patient_id = ? AND mr.id IS NULL
       ORDER BY a.appointment_time DESC`,
      [id]
    );

    res.json({
      patient,
      records,
      appointments_without_records: appointmentsWithoutRecords,
    });
  } catch (err) {
    console.error('getPatientRecords error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createMedicalRecord — Tạo hồ sơ bệnh án gắn với lịch hẹn.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Xác minh patient + appointment thuộc patient, kiểm tra chưa có record, INSERT với chẩn đoán/điều trị mặc định nếu thiếu.
 * @param {import('express').Request} req - params: id (patient id); body: appointment_id, diagnosis, treatment
 * @param {import('express').Response} res
 */
async function createMedicalRecord(req, res) {
  const { id: patientId } = req.params;
  const { appointment_id, diagnosis, treatment } = req.body || {};
  if (!appointment_id) {
    return res.status(400).json({ message: 'Thiếu mã lịch hẹn (appointment_id)' });
  }

  try {
    const [[patient]] = await pool.query('SELECT id FROM patients WHERE id = ? LIMIT 1', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
    }
    const [[appt]] = await pool.query(
      'SELECT id, patient_id, status FROM appointments WHERE id = ? LIMIT 1',
      [appointment_id]
    );
    if (!appt || Number(appt.patient_id) !== Number(patientId)) {
      return res.status(400).json({ message: 'Lịch hẹn không thuộc bệnh nhân này' });
    }
    const [exists] = await pool.query(
      'SELECT id FROM medical_records WHERE appointment_id = ? LIMIT 1',
      [appointment_id]
    );
    if (exists.length) {
      return res.status(400).json({ message: 'Lịch hẹn này đã có hồ sơ bệnh án' });
    }

    const [result] = await pool.query(
      `INSERT INTO medical_records (patient_id, appointment_id, diagnosis, treatment)
       VALUES (?, ?, ?, ?)`,
      [
        patientId,
        appointment_id,
        diagnosis || 'Chưa cập nhật chẩn đoán',
        treatment || 'Chưa cập nhật điều trị',
      ]
    );
    const [rows] = await pool.query(
      `SELECT mr.id, mr.diagnosis, mr.treatment, mr.created_at, mr.updated_at,
              a.appointment_time, a.status, s.name AS service_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE mr.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createMedicalRecord error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateMedicalRecord — Cập nhật chẩn đoán / điều trị trong hồ sơ bệnh án.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Cập nhật động các trường diagnosis/treatment được gửi lên, trả bản ghi sau cập nhật.
 * @param {import('express').Request} req - params: id (record id); body: diagnosis, treatment
 * @param {import('express').Response} res
 */
async function updateMedicalRecord(req, res) {
  const { id } = req.params;
  const { diagnosis, treatment } = req.body || {};
  if (diagnosis === undefined && treatment === undefined) {
    return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
  }

  try {
    const updates = [];
    const params = [];
    if (diagnosis !== undefined) {
      updates.push('diagnosis = ?');
      params.push(diagnosis);
    }
    if (treatment !== undefined) {
      updates.push('treatment = ?');
      params.push(treatment);
    }
    params.push(id);
    const [result] = await pool.query(
      `UPDATE medical_records SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ bệnh án' });
    }
    const [rows] = await pool.query(
      `SELECT mr.id, mr.diagnosis, mr.treatment, mr.created_at, mr.updated_at,
              a.appointment_time, a.status, s.name AS service_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN services s ON a.service_id = s.id
       WHERE mr.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateMedicalRecord error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * deleteMedicalRecord — Xoá hồ sơ bệnh án.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: DELETE theo id; 404 nếu không tồn tại.
 * @param {import('express').Request} req - params: id (record id)
 * @param {import('express').Response} res
 */
async function deleteMedicalRecord(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM medical_records WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ bệnh án' });
    }
    res.json({ message: 'Xoá hồ sơ bệnh án thành công' });
  } catch (err) {
    console.error('deleteMedicalRecord error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updatePatient — Cập nhật thông tin bệnh nhân.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: Chuẩn hoá SĐT, kiểm tra trùng với bệnh nhân khác, UPDATE và trả bản ghi mới.
 * @param {import('express').Request} req - params: id; body: full_name, phone, email, note, avatar_url
 * @param {import('express').Response} res
 */
async function updatePatient(req, res) {
  const { id } = req.params;
  const { full_name, phone, email, note, avatar_url } = req.body || {};
  if (!full_name || !phone) {
    return res.status(400).json({ message: 'Thiếu tên hoặc số điện thoại' });
  }
  const normalizedPhone = normalizePhoneInput(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  try {
    const existingId = await findPatientIdByPhone(pool, normalizedPhone);
    if (existingId && Number(existingId) !== Number(id)) {
      return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng cho bệnh nhân khác' });
    }

    const [result] = await pool.query(
      `UPDATE patients 
       SET full_name = ?, phone = ?, email = ?, note = ?, avatar_url = ?
       WHERE id = ?`,
      [full_name, normalizedPhone, email || null, note || null, avatar_url || null, id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
    }
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, note, avatar_url, created_at FROM patients WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updatePatient error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * deletePatient — Xoá bệnh nhân.
 * Quyền: admin / staff (permission: patients)
 * Logic chính: DELETE theo id; bắt lỗi FK nếu còn lịch hẹn/hồ sơ liên quan.
 * @param {import('express').Request} req - params: id
 * @param {import('express').Response} res
 */
async function deletePatient(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });
    }
    return res.json({ message: 'Xoá bệnh nhân thành công' });
  } catch (err) {
    console.error('deletePatient error', err);
    // Lỗi ràng buộc khóa ngoại (đã có lịch hẹn / hồ sơ liên quan)
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res
        .status(400)
        .json({ message: 'Không thể xoá vì đã có lịch hẹn hoặc hồ sơ bệnh án liên quan' });
    }
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * listUsers — Danh sách tài khoản người dùng.
 * Quyền: admin
 * Logic chính: Lọc theo q (tên/email/SĐT); có page thì phân trang, không có page thì trả toàn bộ mảng.
 * @param {import('express').Request} req - query: page, limit, q
 * @param {import('express').Response} res
 */
async function listUsers(req, res) {
  const { page, limit = 20, q } = req.query;
  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    if (page) {
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * limitNum;
      const [rows] = await pool.query(
        `SELECT id, full_name, phone, email, role, status, avatar_url, created_at
         FROM users WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
        params
      );
      return res.json({
        data: rows,
        pagination: { page: pageNum, limit: limitNum, total },
      });
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, phone, email, role, status, avatar_url, created_at
       FROM users WHERE ${where} ORDER BY id ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('listUsers error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createUser — Tạo tài khoản người dùng mới.
 * Quyền: admin
 * Logic chính: Validate mật khẩu theo security settings, kiểm tra email trùng, bcrypt hash, INSERT users với role mặc định staff.
 * @param {import('express').Request} req - body: full_name, phone, email, password, role
 * @param {import('express').Response} res
 */
async function createUser(req, res) {
  const bcrypt = require('bcrypt');
  const { full_name, phone, email, password, role } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu họ tên, email hoặc mật khẩu' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  const allowedRoles = ['admin', 'dentist', 'staff', 'customer'];
  const finalRole = allowedRoles.includes(role) ? role : 'staff';

  const security = await getSecuritySettings();
  const pwdCheck = await validatePassword(password, security);
  if (!pwdCheck.ok) {
    return res.status(400).json({ message: pwdCheck.message });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
      trimmedEmail,
    ]);
    if (existing.length) {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role, status, password_updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
      [String(full_name).trim(), phone ? String(phone).trim() : null, trimmedEmail, passwordHash, finalRole]
    );
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, status, avatar_url FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createUser error', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateUser — Cập nhật thông tin tài khoản người dùng.
 * Quyền: admin
 * Logic chính: Cập nhật động full_name/phone/email/role/status/password; validate mật khẩu mới nếu có; kiểm tra email trùng.
 * @param {import('express').Request} req - params: id; body: full_name, phone, email, role, status, password
 * @param {import('express').Response} res
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { full_name, phone, email, role, status, password } = req.body || {};
  try {
    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [
        trimmedEmail,
        id,
      ]);
      if (dup.length) {
        return res.status(400).json({ message: 'Email này đã được sử dụng' });
      }
    }

    const updates = [];
    const params = [];
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(String(full_name).trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone ? String(phone).trim() : null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(String(email).trim().toLowerCase());
    }
    if (role !== undefined && ['admin', 'dentist', 'staff', 'customer'].includes(role)) {
      updates.push('role = ?');
      params.push(role);
    }
    if (status !== undefined && ['active', 'inactive'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    if (password !== undefined && String(password).length > 0) {
      const security = await getSecuritySettings();
      const pwdCheck = await validatePassword(password, security);
      if (!pwdCheck.ok) {
        return res.status(400).json({ message: pwdCheck.message });
      }
      const bcrypt = require('bcrypt');
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(String(password), 10));
      updates.push('password_updated_at = NOW()');
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
    }
    params.push(id);
    const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    const [rows] = await pool.query(
      'SELECT id, full_name, phone, email, role, status, avatar_url FROM users WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateUser error', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email này đã được sử dụng' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * deleteUser — Xoá tài khoản người dùng.
 * Quyền: admin
 * Logic chính: Không cho xoá chính mình, không xoá admin active cuối cùng, chặn nếu đã gắn dentist.
 * @param {import('express').Request} req - params: id
 * @param {import('express').Response} res
 */
async function deleteUser(req, res) {
  const { id } = req.params;
  const targetId = Number(id);
  if (req.user && Number(req.user.id) === targetId) {
    return res.status(400).json({ message: 'Không thể xoá tài khoản đang đăng nhập' });
  }

  try {
    const [[target]] = await pool.query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [targetId]);
    if (!target) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    if (target.role === 'admin') {
      const [adminCount] = await pool.query(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 'active'"
      );
      if ((adminCount[0]?.c || 0) <= 1) {
        return res.status(400).json({ message: 'Không thể xoá admin cuối cùng đang hoạt động' });
      }
    }

    const [dentistRef] = await pool.query('SELECT id FROM dentists WHERE user_id = ? LIMIT 1', [
      targetId,
    ]);
    if (dentistRef.length) {
      return res
        .status(400)
        .json({ message: 'Không thể xoá: tài khoản đã gắn với bác sĩ. Hãy xoá bác sĩ trước.' });
    }
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }
    res.json({ message: 'Xoá tài khoản thành công' });
  } catch (err) {
    console.error('deleteUser error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * listDentists — Danh sách bác sĩ kèm thông tin user.
 * Quyền: admin / staff (permission: dentists_view_edit)
 * Logic chính: JOIN dentists + users, lọc theo q; có page thì phân trang, không có page thì trả mảng.
 * @param {import('express').Request} req - query: page, limit, q
 * @param {import('express').Response} res
 */
async function listDentists(req, res) {
  const { page, limit = 20, q } = req.query;
  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR d.specialty LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const baseSelect = `
      SELECT d.id, d.user_id, d.avatar_url, d.specialty, d.experience_year, d.description, d.is_active,
             u.full_name, u.phone, u.email
      FROM dentists d
      JOIN users u ON d.user_id = u.id
      WHERE ${where}
      ORDER BY u.full_name ASC
    `;

    if (page) {
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * limitNum;
      const [rows] = await pool.query(`${baseSelect} LIMIT ? OFFSET ?`, [
        ...params,
        limitNum,
        offset,
      ]);
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM dentists d JOIN users u ON d.user_id = u.id WHERE ${where}`,
        params
      );
      return res.json({
        data: rows,
        pagination: { page: pageNum, limit: limitNum, total },
      });
    }

    const [rows] = await pool.query(baseSelect, params);
    res.json(rows);
  } catch (err) {
    console.error('listDentists error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createDentist — Tạo hồ sơ bác sĩ gắn với tài khoản user.
 * Quyền: admin
 * Logic chính: Kiểm tra user_id chưa gắn dentist, validate specialty, INSERT dentists.
 * @param {import('express').Request} req - body: user_id, specialty, experience_year, description, is_active, avatar_url
 * @param {import('express').Response} res
 */
async function createDentist(req, res) {
  const { user_id, specialty, experience_year, description, is_active, avatar_url } = req.body || {};
  if (!user_id) {
    return res.status(400).json({ message: 'Thiếu tài khoản (user_id)' });
  }
  if (!specialty || !isValidSpecialty(specialty)) {
    return res.status(400).json({ message: 'Vui lòng chọn chuyên khoa từ danh sách' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM dentists WHERE user_id = ? LIMIT 1', [
      user_id,
    ]);
    if (existing.length) {
      return res.status(400).json({ message: 'Tài khoản này đã gắn với một bác sĩ' });
    }
    const [result] = await pool.query(
      `INSERT INTO dentists (user_id, avatar_url, specialty, experience_year, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        avatar_url ? String(avatar_url).trim() : null,
        specialty ? String(specialty).trim() : null,
        experience_year != null ? Number(experience_year) : null,
        description ? String(description).trim() : null,
        is_active !== false && is_active !== 0 ? 1 : 0,
      ]
    );
    const [rows] = await pool.query(
      `SELECT d.id, d.user_id, d.avatar_url, d.specialty, d.experience_year, d.description, d.is_active,
              u.full_name, u.phone, u.email
       FROM dentists d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createDentist error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateDentist — Cập nhật thông tin bác sĩ.
 * Quyền: admin / staff (permission: dentists_view_edit)
 * Logic chính: Cập nhật động specialty/experience_year/description/is_active/avatar_url; validate specialty nếu có.
 * @param {import('express').Request} req - params: id; body: specialty, experience_year, description, is_active, avatar_url
 * @param {import('express').Response} res
 */
async function updateDentist(req, res) {
  const { id } = req.params;
  const { specialty, experience_year, description, is_active, avatar_url } = req.body || {};
  try {
    const updates = [];
    const params = [];
    if (specialty !== undefined) {
      if (!specialty || !isValidSpecialty(specialty)) {
        return res.status(400).json({ message: 'Vui lòng chọn chuyên khoa từ danh sách' });
      }
      updates.push('specialty = ?');
      params.push(String(specialty).trim());
    }
    if (experience_year !== undefined) {
      updates.push('experience_year = ?');
      params.push(experience_year !== '' && experience_year != null ? Number(experience_year) : null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? String(description).trim() : null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url ? String(avatar_url).trim() : null);
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
    }
    params.push(id);
    const [result] = await pool.query(`UPDATE dentists SET ${updates.join(', ')} WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
    }
    const [rows] = await pool.query(
      `SELECT d.id, d.user_id, d.avatar_url, d.specialty, d.experience_year, d.description, d.is_active,
              u.full_name, u.phone, u.email
       FROM dentists d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateDentist error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * deleteDentist — Xoá hồ sơ bác sĩ.
 * Quyền: admin
 * Logic chính: DELETE theo id; bắt lỗi FK nếu còn lịch hẹn/dịch vụ liên quan.
 * @param {import('express').Request} req - params: id
 * @param {import('express').Response} res
 */
async function deleteDentist(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM dentists WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
    }
    res.json({ message: 'Xoá bác sĩ thành công' });
  } catch (err) {
    console.error('deleteDentist error', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res
        .status(400)
        .json({ message: 'Không thể xoá vì bác sĩ đã có lịch hẹn hoặc dịch vụ liên quan' });
    }
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * listServicesConfig — Danh sách dịch vụ kèm bác sĩ được gán.
 * Quyền: admin
 * Logic chính: SELECT services, gộp dentist_ids từ service_dentists; có page thì slice phân trang client-side.
 * @param {import('express').Request} req - query: page, limit, q
 * @param {import('express').Response} res
 */
async function listServicesConfig(req, res) {
  const { page, limit = 20, q } = req.query;
  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ' AND (name LIKE ? OR description LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }

    const [rows] = await pool.query(
      `SELECT id, name, description, price, duration_minutes, is_active, thumbnail_url
       FROM services WHERE ${where} ORDER BY id ASC`,
      params
    );
    const [links] = await pool.query('SELECT service_id, dentist_id FROM service_dentists');
    const byService = {};
    for (const row of links) {
      if (!byService[row.service_id]) byService[row.service_id] = [];
      byService[row.service_id].push(row.dentist_id);
    }
    const result = rows.map((s) => ({
      ...s,
      dentist_ids: byService[s.id] || [],
    }));

    if (page) {
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * limitNum;
      return res.json({
        data: result.slice(offset, offset + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.length,
        },
      });
    }

    res.json(result);
  } catch (err) {
    console.error('listServicesConfig error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createService — Tạo dịch vụ mới và gán bác sĩ thực hiện.
 * Quyền: admin
 * Logic chính: Chuẩn hoá name/price/duration/is_active, INSERT services, INSERT IGNORE service_dentists cho từng dentist_id.
 * @param {import('express').Request} req - body: name, description, price, duration_minutes, is_active, thumbnail_url, dentist_ids
 * @param {import('express').Response} res
 */
async function createService(req, res) {
  const { name, description, price, duration_minutes, is_active, thumbnail_url, dentist_ids } =
    req.body || {};

  const finalName = name && String(name).trim() ? String(name).trim() : 'Dịch vụ chưa đặt tên';

  let finalPrice = 0;
  if (typeof price === 'number') {
    finalPrice = Number.isFinite(price) && price >= 0 ? price : 0;
  } else if (typeof price === 'string') {
    const cleaned = price.replace(/[^\d]/g, '');
    if (cleaned) {
      const parsed = Number(cleaned);
      finalPrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
  }

  let finalDuration = 30;
  if (typeof duration_minutes === 'number') {
    finalDuration = Number.isFinite(duration_minutes) && duration_minutes > 0 ? duration_minutes : 30;
  } else if (typeof duration_minutes === 'string') {
    const cleaned = duration_minutes.replace(/[^\d]/g, '');
    if (cleaned) {
      const parsed = Number(cleaned);
      finalDuration = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    }
  }

  let finalIsActive;
  if (typeof is_active === 'undefined' || is_active === null) {
    finalIsActive = 1;
  } else {
    finalIsActive = is_active ? 1 : 0;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO services (name, description, price, duration_minutes, is_active, thumbnail_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [finalName, description || null, finalPrice, finalDuration, finalIsActive, thumbnail_url || null]
    );
    const serviceId = result.insertId;
    const ids = Array.isArray(dentist_ids) ? dentist_ids.filter((x) => x != null && x !== '') : [];
    for (const did of ids) {
      await pool.query(
        'INSERT IGNORE INTO service_dentists (service_id, dentist_id) VALUES (?, ?)',
        [serviceId, Number(did)]
      );
    }
    const [rows] = await pool.query(
      'SELECT id, name, description, price, duration_minutes, is_active, thumbnail_url FROM services WHERE id = ?',
      [serviceId]
    );
    const [links] = await pool.query('SELECT dentist_id FROM service_dentists WHERE service_id = ?', [
      serviceId,
    ]);
    res.status(201).json({ ...rows[0], dentist_ids: links.map((l) => l.dentist_id) });
  } catch (err) {
    console.error('createService error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateService — Cập nhật dịch vụ và danh sách bác sĩ gán.
 * Quyền: admin
 * Logic chính: COALESCE cập nhật các trường; nếu có dentist_ids thì xoá link cũ và gán lại.
 * @param {import('express').Request} req - params: id; body: name, description, price, duration_minutes, is_active, thumbnail_url, dentist_ids
 * @param {import('express').Response} res
 */
async function updateService(req, res) {
  const { id } = req.params;
  const { name, description, price, duration_minutes, is_active, thumbnail_url, dentist_ids } =
    req.body || {};

  const normalizedIsActive =
    typeof is_active === 'undefined' || is_active === null ? null : is_active ? 1 : 0;

  let normalizedPrice = null;
  if (typeof price !== 'undefined') {
    if (typeof price === 'number') {
      normalizedPrice = price;
    } else if (typeof price === 'string') {
      const cleaned = price.replace(/[^\d]/g, '');
      if (cleaned) {
        const parsed = Number(cleaned);
        normalizedPrice = Number.isFinite(parsed) ? parsed : null;
      } else {
        normalizedPrice = null;
      }
    }
  }

  let normalizedDuration = null;
  if (typeof duration_minutes !== 'undefined') {
    if (typeof duration_minutes === 'number') {
      normalizedDuration = duration_minutes;
    } else if (typeof duration_minutes === 'string') {
      const cleaned = duration_minutes.replace(/[^\d]/g, '');
      if (cleaned) {
        const parsed = Number(cleaned);
        normalizedDuration = Number.isFinite(parsed) ? parsed : null;
      } else {
        normalizedDuration = null;
      }
    }
  }

  try {
    const [result] = await pool.query(
      `UPDATE services 
       SET 
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         price = COALESCE(?, price),
         duration_minutes = COALESCE(?, duration_minutes),
         is_active = COALESCE(?, is_active),
         thumbnail_url = COALESCE(?, thumbnail_url)
       WHERE id = ?`,
      [
        name,
        description || null,
        normalizedPrice,
        normalizedDuration,
        normalizedIsActive,
        thumbnail_url || null,
        id,
      ]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    }
    if (Array.isArray(dentist_ids)) {
      await pool.query('DELETE FROM service_dentists WHERE service_id = ?', [id]);
      for (const did of dentist_ids.filter((x) => x != null && x !== '')) {
        await pool.query(
          'INSERT IGNORE INTO service_dentists (service_id, dentist_id) VALUES (?, ?)',
          [id, Number(did)]
        );
      }
    }
    res.json({ message: 'Cập nhật dịch vụ thành công' });
  } catch (err) {
    console.error('updateService error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * deleteService — Xoá dịch vụ.
 * Quyền: admin
 * Logic chính: DELETE theo id; bắt lỗi FK nếu đang dùng trong lịch hẹn/hồ sơ.
 * @param {import('express').Request} req - params: id
 * @param {import('express').Response} res
 */
async function deleteService(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM services WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    }
    return res.json({ message: 'Xoá dịch vụ thành công' });
  } catch (err) {
    console.error('deleteService error', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res
        .status(400)
        .json({ message: 'Không thể xoá vì đang được dùng trong lịch hẹn hoặc hồ sơ' });
    }
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getClinicSettings — Lấy cấu hình phòng khám (bản ghi đầu tiên).
 * Quyền: admin
 * Logic chính: SELECT clinic_settings ORDER BY id LIMIT 1; trả null nếu chưa có.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getClinicSettings(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, clinic_name, address, phone, email, working_hours, logo_file_id, logo_url, role_permissions_json, security_json, created_at, updated_at FROM clinic_settings ORDER BY id ASC LIMIT 1'
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('getClinicSettings error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateClinicSettings — Lưu hoặc tạo cấu hình phòng khám.
 * Quyền: admin
 * Logic chính: UPSERT clinic_settings (thông tin cơ bản, logo, role_permissions_json, security_json), invalidate cache.
 * @param {import('express').Request} req - body: clinic_name, address, phone, email, working_hours, logo_url, role_permissions, security
 * @param {import('express').Response} res
 */
async function updateClinicSettings(req, res) {
  const {
    clinic_name,
    address,
    phone,
    email,
    working_hours,
    logo_url,
    role_permissions,
    security,
  } = req.body || {};

  let roleJson = null;
  let securityJson = null;
  try {
    if (role_permissions !== undefined) {
      roleJson =
        role_permissions == null
          ? null
          : typeof role_permissions === 'string'
            ? role_permissions
            : JSON.stringify(role_permissions);
    }
    if (security !== undefined) {
      securityJson =
        security == null
          ? null
          : typeof security === 'string'
            ? security
            : JSON.stringify(security);
    }
  } catch {
    return res.status(400).json({ message: 'Dữ liệu cấu hình (roles/security) không hợp lệ' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM clinic_settings ORDER BY id ASC LIMIT 1');
    if (rows.length) {
      const id = rows[0].id;
      await pool.query(
        `UPDATE clinic_settings
         SET clinic_name = ?, address = ?, phone = ?, email = ?, working_hours = ?,
             logo_url = COALESCE(?, logo_url),
             role_permissions_json = COALESCE(?, role_permissions_json),
             security_json = COALESCE(?, security_json)
         WHERE id = ?`,
        [
          clinic_name,
          address,
          phone,
          email,
          working_hours,
          logo_url !== undefined ? (logo_url || null) : null,
          role_permissions !== undefined ? roleJson : null,
          security !== undefined ? securityJson : null,
          id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO clinic_settings (clinic_name, address, phone, email, working_hours, logo_url, role_permissions_json, security_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clinic_name,
          address,
          phone,
          email,
          working_hours,
          logo_url || null,
          role_permissions !== undefined ? roleJson : null,
          security !== undefined ? securityJson : null,
        ]
      );
    }
    invalidateClinicSettingsCache();
    res.json({ message: 'Lưu cấu hình phòng khám thành công' });
  } catch (err) {
    console.error('updateClinicSettings error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

// --- Quản lý ca (shifts) ---
/**
 * listShifts — Danh sách ca làm việc.
 * Quyền: admin / staff / dentist (JWT, không permission riêng)
 * Logic chính: SELECT shifts sắp xếp theo start_time; trả [] nếu bảng chưa tồn tại.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function listShifts(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, start_time, end_time, max_appointments_per_dentist, is_active FROM shifts ORDER BY start_time ASC'
    );
    res.json(rows || []);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    console.error('listShifts error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createShift — Tạo ca làm việc mới.
 * Quyền: admin
 * Logic chính: Validate name/start_time/end_time, INSERT shifts với max_appointments_per_dentist mặc định 10.
 * @param {import('express').Request} req - body: name, start_time, end_time, max_appointments_per_dentist, is_active
 * @param {import('express').Response} res
 */
async function createShift(req, res) {
  const { name, start_time, end_time, max_appointments_per_dentist, is_active } = req.body || {};
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ message: 'Thiếu tên ca hoặc giờ bắt đầu/kết thúc' });
  }
  const maxPer = max_appointments_per_dentist != null ? Number(max_appointments_per_dentist) : 10;
  try {
    const [result] = await pool.query(
      `INSERT INTO shifts (name, start_time, end_time, max_appointments_per_dentist, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [String(name).trim(), start_time, end_time, maxPer, is_active ? 1 : 0]
    );
    const [rows] = await pool.query(
      'SELECT id, name, start_time, end_time, max_appointments_per_dentist, is_active FROM shifts WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ message: 'Bảng ca chưa được tạo. Khởi động lại backend.' });
    }
    console.error('createShift error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateShift — Cập nhật ca làm việc.
 * Quyền: admin
 * Logic chính: Cập nhật động name/start_time/end_time/max_appointments_per_dentist/is_active.
 * @param {import('express').Request} req - params: id; body: name, start_time, end_time, max_appointments_per_dentist, is_active
 * @param {import('express').Response} res
 */
async function updateShift(req, res) {
  const { id } = req.params;
  const { name, start_time, end_time, max_appointments_per_dentist, is_active } = req.body || {};
  try {
    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(String(name).trim());
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      params.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      params.push(end_time);
    }
    if (max_appointments_per_dentist !== undefined) {
      updates.push('max_appointments_per_dentist = ?');
      params.push(Number(max_appointments_per_dentist));
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Không có trường nào để cập nhật' });
    }
    params.push(id);
    const [result] = await pool.query(`UPDATE shifts SET ${updates.join(', ')} WHERE id = ?`, params);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Không tìm thấy ca' });
    }
    const [rows] = await pool.query(
      'SELECT id, name, start_time, end_time, max_appointments_per_dentist, is_active FROM shifts WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateShift error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

// --- Phân công nhân sự (staff_shifts) ---
/**
 * getStaffSchedules — Lấy lịch phân công bác sĩ theo ca (10 ngày mở cửa tới).
 * Quyền: admin / staff / dentist (permission: staff_schedules)
 * Logic chính: Xác định ngày mở từ working_days, lấy shifts/assignments/dentists và stats capacity vs booked cho UI màu.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getStaffSchedules(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allDates = [];
    // Xem tối đa 60 ngày tới, sau đó lấy 10 ngày mở cửa đầu tiên
    const maxLookaheadDays = 60;
    for (let i = 0; i < maxLookaheadDays; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      allDates.push(formatDateKey(d));
    }
    const from = allDates[0];
    const to = allDates[allDates.length - 1];

    // Cấu hình ngày mở/đóng từ working_days
    const [workingRows] = await pool.query(
      `SELECT work_date, status FROM working_days WHERE work_date BETWEEN ? AND ?`,
      [from, to]
    );
    const overrideOpen = new Set();
    const overrideClosed = new Set();
    for (const row of workingRows || []) {
      const key = formatDateKey(row.work_date);
      if (row.status === 'open') {
        overrideOpen.add(key);
        overrideClosed.delete(key);
      } else if (row.status === 'closed') {
        overrideClosed.add(key);
        overrideOpen.delete(key);
      }
    }

    // Chỉ giữ lại những ngày mở cửa (logic thống nhất với Calendar):
    // - Mặc định: mọi ngày đều mở
    // - Nếu working_days.status = 'closed' thì đóng
    // - Nếu working_days.status = 'open' thì chắc chắn mở
    let openDates = allDates.filter((dateStr) => {
      if (overrideClosed.has(dateStr)) return false;
      return true;
    });

    // Chỉ lấy tối đa 10 ngày mở cửa bắt đầu từ hôm nay
    openDates = openDates.slice(0, 10);

    if (openDates.length === 0) {
      return res.json({
        dates: [],
        shifts: [],
        assignments: [],
        dentists: [],
        stats: [],
      });
    }

    const [shifts] = await pool.query(
      'SELECT id, name, start_time, end_time, max_appointments_per_dentist FROM shifts WHERE is_active = 1 ORDER BY start_time ASC'
    );

    const [rawAssignments] = await pool.query(
      `SELECT ss.id, ss.dentist_id, ss.shift_id, ss.work_date, ss.status
       FROM staff_shifts ss
       WHERE ss.work_date BETWEEN ? AND ?`,
      [from, to]
    );
    const assignments = (rawAssignments || []).map((row) => ({
      ...row,
      work_date: formatDateKey(row.work_date),
    }));

    const [dentists] = await pool.query(
      `SELECT d.id, d.user_id, d.is_active, u.full_name 
       FROM dentists d 
       JOIN users u ON d.user_id = u.id 
       ORDER BY u.full_name`
    );

    // Thống kê sức chứa & số lượng đặt lịch theo từng ngày/ca để hiển thị màu (đỏ/xanh/vàng)
    const [dentistCounts] = await pool.query(
      `SELECT ss.work_date, ss.shift_id, COUNT(DISTINCT ss.dentist_id) AS dentists_assigned
       FROM staff_shifts ss
       WHERE ss.work_date BETWEEN ? AND ? AND ss.status = 'assigned'
       GROUP BY ss.work_date, ss.shift_id`,
      [from, to]
    );

    const [bookedCounts] = await pool.query(
      `SELECT DATE(a.appointment_time) AS work_date, a.shift_id, COUNT(*) AS booked
       FROM appointments a
       WHERE DATE(a.appointment_time) BETWEEN ? AND ?
         AND a.shift_id IS NOT NULL
         AND a.status NOT IN ('canceled','no_show')
       GROUP BY DATE(a.appointment_time), a.shift_id`,
      [from, to]
    );

    const shiftById = new Map();
    for (const sh of shifts || []) {
      shiftById.set(sh.id, sh);
    }

    const statsMap = new Map(); // key: `${date}|${shift_id}`

    for (const row of dentistCounts || []) {
      const key = `${formatDateKey(row.work_date)}|${row.shift_id}`;
      const sh = shiftById.get(row.shift_id);
      const maxPer = (sh && sh.max_appointments_per_dentist) || 0;
      const capacity = (row.dentists_assigned || 0) * maxPer;
      statsMap.set(key, {
        work_date: row.work_date,
        shift_id: row.shift_id,
        dentists_assigned: row.dentists_assigned || 0,
        booked: 0,
        capacity,
      });
    }

    for (const row of bookedCounts || []) {
      const key = `${formatDateKey(row.work_date)}|${row.shift_id}`;
      const existing = statsMap.get(key);
      if (existing) {
        existing.booked = row.booked || 0;
      } else {
        const sh = shiftById.get(row.shift_id);
        const maxPer = (sh && sh.max_appointments_per_dentist) || 0;
        statsMap.set(key, {
          work_date: row.work_date,
          shift_id: row.shift_id,
          dentists_assigned: 0,
          booked: row.booked || 0,
          capacity: 0 * maxPer,
        });
      }
    }

    const stats = Array.from(statsMap.values()).filter((s) =>
      openDates.includes(formatDateKey(s.work_date))
    );

    res.json({
      dates: openDates,
      shifts: shifts || [],
      assignments,
      dentists: dentists || [],
      stats,
    });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        dates: [],
        shifts: [],
        assignments: [],
        dentists: [],
        stats: [],
      });
    }
    console.error('getStaffSchedules error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * updateStaffSchedules — Lưu phân công bác sĩ theo ca và ngày.
 * Quyền: admin / staff / dentist (permission: staff_schedules); dentist chỉ sửa ca của chính mình
 * Logic chính: Transaction ghi đè staff_shifts theo assignments; admin/staff xoá hết rồi INSERT lại, dentist chỉ bật/tắt ca riêng.
 * @param {import('express').Request} req - body: assignments [{ shift_id, work_date, dentist_ids }]
 * @param {import('express').Response} res
 */
async function updateStaffSchedules(req, res) {
  const { assignments } = req.body || {};
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ message: 'Thiếu mảng assignments' });
  }

  const role = req.user && req.user.role;
  let selfDentistId = null;

  // Nếu là bác sĩ: chỉ được phép chỉnh ca của chính mình
  if (role === 'dentist') {
    try {
      const [[dentistRow]] = await pool.query(
        'SELECT id FROM dentists WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      if (!dentistRow) {
        return res
          .status(403)
          .json({ message: 'Tài khoản hiện tại không gắn với hồ sơ bác sĩ nào' });
      }
      selfDentistId = dentistRow.id;
    } catch (err) {
      console.error('updateStaffSchedules dentist lookup error', err);
      return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of assignments) {
      const { shift_id, work_date, dentist_ids } = item;
      if (!shift_id || !work_date) continue;

      const ids = Array.isArray(dentist_ids)
        ? dentist_ids.filter((x) => x != null && x !== '')
        : [];

      if (role === 'dentist') {
        // Bác sĩ chỉ được bật/tắt ca của chính mình, không được thay đổi phân công của người khác
        const wantAssigned = ids.map(Number).includes(Number(selfDentistId));

        // Xoá phân công hiện tại của chính bác sĩ cho ca + ngày này
        await conn.query(
          'DELETE FROM staff_shifts WHERE shift_id = ? AND work_date = ? AND dentist_id = ?',
          [shift_id, work_date, selfDentistId]
        );

        if (wantAssigned) {
          await conn.query(
            `INSERT INTO staff_shifts (dentist_id, shift_id, work_date, status)
             VALUES (?, ?, ?, 'assigned')
             ON DUPLICATE KEY UPDATE status = 'assigned'`,
            [selfDentistId, shift_id, work_date]
          );
        }
      } else {
        // admin / staff: giữ hành vi cũ – ghi đè toàn bộ danh sách bác sĩ cho (shift_id, work_date)
        await conn.query(
          'DELETE FROM staff_shifts WHERE shift_id = ? AND work_date = ?',
          [shift_id, work_date]
        );
        for (const dentist_id of ids) {
          await conn.query(
            `INSERT INTO staff_shifts (dentist_id, shift_id, work_date, status)
             VALUES (?, ?, ?, 'assigned')
             ON DUPLICATE KEY UPDATE status = 'assigned'`,
            [dentist_id, shift_id, work_date]
          );
        }
      }
    }
    await conn.commit();
    res.json({ message: 'Lưu phân công thành công' });
  } catch (err) {
    await conn.rollback();
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ message: 'Bảng phân công chưa được tạo.' });
    }
    console.error('updateStaffSchedules error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  } finally {
    conn.release();
  }
}

/**
 * updateWorkingDay — Đánh dấu ngày mở cửa hoặc nghỉ cho phòng khám.
 * Quyền: admin / staff (permission: calendar_overview)
 * Logic chính: UPSERT working_days với status open/closed và note tùy chọn.
 * @param {import('express').Request} req - body: date, status ('open'|'closed'), note
 * @param {import('express').Response} res
 */
async function updateWorkingDay(req, res) {
  const { date, status, note } = req.body || {};
  if (!date) {
    return res.status(400).json({ message: 'Thiếu ngày cần cập nhật' });
  }
  if (status !== 'open' && status !== 'closed') {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }
  try {
    // Ghi đè rõ trạng thái ngày làm việc/nghỉ cho mọi ngày (kể cả cuối tuần)
    await pool.query(
      `INSERT INTO working_days (work_date, status, note)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)`,
      [date, status, note || null]
    );
    res.json({ message: 'Cập nhật lịch hoạt động thành công' });
  } catch (err) {
    console.error('updateWorkingDay error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

module.exports = {
  getDashboard,
  listAppointments,
  updateAppointmentStatus,
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listDentists,
  createDentist,
  updateDentist,
  deleteDentist,
  listServicesConfig,
  createService,
  updateService,
  deleteService,
  getClinicSettings,
  updateClinicSettings,
  listShifts,
  createShift,
  updateShift,
  getStaffSchedules,
  updateStaffSchedules,
  getCalendarOverview,
  updateWorkingDay,
};

