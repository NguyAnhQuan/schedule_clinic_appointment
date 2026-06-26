/**
 * FILE_GUIDE: public.controller.js — Logic API phía khách (đặt lịch, tra cứu)
 * =============================================================================
 * Các hàm chính:
 *   getServices          — Danh sách dịch vụ (+ dentist_ids)
 *   getDentists          — Lọc theo service_id, specialty, phân trang
 *   getDentistsByDepartment — 3 BS/khoa cho trang chủ
 *   getAvailableDates    — Ngày có BS trực + làm được dịch vụ
 *   getShiftsForDate     — Ca trong ngày + số giờ trống (appointmentSlots.js)
 *   getDentistsForBooking— BS trong ca còn slot
 *   getSlotsForBooking   — Giờ cụ thể 8:00, 9:00…
 *   createAppointment    — Transaction: validate → tìm BN → INSERT pending
 *   getAppointmentStatus — Tra cứu bằng SĐT + mã lịch
 */
const { pool } = require('../config/db');
const { normalizePhone, normalizePhoneInput, phonesMatch } = require('../utils/phone');
const {
  getBookedIntervals,
  parseAppointmentStartMinutes,
  slotOverlapsBooked,
  countAvailableSlotsInShift,
  countShiftSlotsWithAnyDentist,
  listAvailableSlotTimes,
} = require('../utils/appointmentSlots');

/**
 * formatDateKey — Chuẩn hóa giá trị ngày thành chuỗi YYYY-MM-DD
 * @param {Date|string|null|undefined} value - Giá trị ngày từ DB (Date object hoặc chuỗi ISO)
 * Logic:
 *   1. Trả về chuỗi rỗng nếu value falsy
 *   2. Nếu là Date: lấy năm/tháng/ngày, pad 2 chữ số cho tháng và ngày
 *   3. Nếu là chuỗi: cắt 10 ký tự đầu (phần ngày)
 * Trả về: Chuỗi 'YYYY-MM-DD' hoặc '' nếu không có giá trị
 */
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

/**
 * inferServiceCategory — Suy luận nhóm dịch vụ từ tên dịch vụ
 * @param {string} name - Tên dịch vụ (tiếng Việt hoặc tiếng Anh)
 * Logic:
 *   1. Chuyển tên về chữ thường để so khớp từ khóa
 *   2. Khớp từ khóa tổng quát → 'general', thẩm mỹ → 'aesthetic', phẫu thuật → 'surgery'
 *   3. Không khớp → 'other'
 * Trả về: 'general' | 'aesthetic' | 'surgery' | 'other'
 */
function inferServiceCategory(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('tổng quát') || lower.includes('khám') || lower.includes('cạo')) return 'general';
  if (lower.includes('tẩy trắng') || lower.includes('thẩm mỹ') || lower.includes('veneer')) return 'aesthetic';
  if (lower.includes('nhổ') || lower.includes('implant') || lower.includes('phẫu')) return 'surgery';
  return 'other';
}

/**
 * attachDentistIdsToServices — Gắn danh sách bác sĩ và nhóm dịch vụ vào từng dịch vụ
 * @param {Array<Object>} rows - Mảng dịch vụ từ bảng services
 * Logic:
 *   1. Query bảng service_dentists để lấy liên kết service_id ↔ dentist_id
 *   2. Nhóm dentist_id theo service_id vào object byService
 *   3. Map mỗi dịch vụ: thêm dentist_ids và category (qua inferServiceCategory)
 * Trả về: Mảng dịch vụ đã bổ sung dentist_ids và category
 */
async function attachDentistIdsToServices(rows) {
  const [links] = await pool.query('SELECT service_id, dentist_id FROM service_dentists');
  const byService = {};
  for (const row of links) {
    const sid = Number(row.service_id);
    const did = Number(row.dentist_id);
    if (!byService[sid]) byService[sid] = [];
    byService[sid].push(did);
  }
  return rows.map((s) => ({
    ...s,
    dentist_ids: byService[Number(s.id)] || [],
    category: inferServiceCategory(s.name),
  }));
}

/**
 * getServices — API danh sách dịch vụ đang hoạt động (có lọc nhóm, phân trang)
 * @param {import('express').Request} req - Query: page, limit, category
 * @param {import('express').Response} res
 * Logic:
 *   1. Lấy tất cả dịch vụ is_active = 1
 *   2. Gắn dentist_ids và category qua attachDentistIdsToServices
 *   3. Lọc theo category nếu có (bỏ qua khi category = 'all')
 *   4. Nếu có page: slice phân trang (limit tối đa 50), trả { data, pagination }
 *   5. Không có page: trả mảng đầy đủ
 * Trả về: JSON danh sách dịch vụ hoặc 500 khi lỗi
 */
async function getServices(req, res) {
  const { page, limit = 12, category } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price, duration_minutes, thumbnail_url FROM services WHERE is_active = 1 ORDER BY id ASC'
    );
    let result = await attachDentistIdsToServices(rows);
    if (category && category !== 'all') {
      result = result.filter((s) => s.category === category);
    }
    if (page) {
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Math.min(50, Number(limit)));
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
    console.error('getServices error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * buildDentistsBaseSql — Tạo câu SQL SELECT cơ sở cho danh sách bác sĩ
 * @param {boolean} [withRatings=true] - Có JOIN bảng đánh giá hay không
 * Logic:
 *   1. withRatings = true: JOIN subquery tính avg_rating, rating_count từ appointment_ratings
 *   2. withRatings = false: trả 0 cho avg_rating và rating_count (fallback khi thiếu bảng)
 *   3. Luôn JOIN users (role = 'dentist') và lọc d.is_active = 1
 * Trả về: Chuỗi SQL SELECT (chưa có WHERE bổ sung, ORDER BY, LIMIT)
 */
function buildDentistsBaseSql(withRatings = true) {
  if (withRatings) {
    return `
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
  }
  return `
    SELECT d.id, d.avatar_url, u.full_name, u.email, u.phone,
           d.specialty, d.experience_year, d.description,
           0 AS avg_rating, 0 AS rating_count
    FROM dentists d
    JOIN users u ON d.user_id = u.id AND u.role = 'dentist'
    WHERE d.is_active = 1
  `;
}

/**
 * appendDentistFilters — Nối điều kiện lọc vào câu SQL bác sĩ
 * @param {string} sql - Câu SQL gốc
 * @param {Array} params - Mảng tham số bind (mutate in-place)
 * @param {Object} filters - Bộ lọc: q, specialty, service_id
 * @param {string} [filters.q] - Từ khóa tìm theo tên hoặc email
 * @param {string} [filters.specialty] - Lọc theo chuyên khoa (LIKE)
 * @param {number|string} [filters.service_id] - Chỉ BS thực hiện được dịch vụ này
 * Logic:
 *   1. q → AND (full_name LIKE ? OR email LIKE ?)
 *   2. specialty → AND specialty LIKE ?
 *   3. service_id → AND id IN (SELECT dentist_id FROM service_dentists ...)
 * Trả về: Chuỗi SQL đã nối thêm điều kiện
 */
function appendDentistFilters(sql, params, { q, specialty, service_id }) {
  let next = sql;
  if (q) {
    next += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (specialty) {
    next += ' AND d.specialty LIKE ?';
    params.push(`%${specialty}%`);
  }
  if (service_id) {
    next += ' AND d.id IN (SELECT dentist_id FROM service_dentists WHERE service_id = ?)';
    params.push(Number(service_id));
  }
  return next;
}

/**
 * queryDentists — Truy vấn DB lấy danh sách bác sĩ (có/không phân trang)
 * @param {Object} filters - Bộ lọc truyền cho appendDentistFilters
 * @param {Object} [options] - Tùy chọn phân trang
 * @param {number|string} [options.page] - Số trang (nếu có thì bật phân trang)
 * @param {number|string} [options.limit] - Số bản ghi/trang (mặc định 9, tối đa 50)
 * Logic:
 *   1. Ghép SQL base + filter + ORDER BY specialty, full_name
 *   2. Có page: chạy COUNT riêng, rồi SELECT LIMIT/OFFSET
 *   3. Không page: SELECT toàn bộ
 * Trả về: { rows, pagination } — pagination = null khi không phân trang
 */
async function queryDentists(filters, { page, limit } = {}) {
  const params = [];
  let sql = appendDentistFilters(buildDentistsBaseSql(true), params, filters);
  sql += ' ORDER BY d.specialty ASC, u.full_name ASC';

  if (page) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 9));
    const offset = (pageNum - 1) * limitNum;
    const countSql = appendDentistFilters(
      'SELECT COUNT(*) AS total FROM dentists d JOIN users u ON d.user_id = u.id AND u.role = \'dentist\' WHERE d.is_active = 1',
      [],
      filters
    );
    const [[{ total }]] = await pool.query(countSql, [...params]);
    const [rows] = await pool.query(`${sql} LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
    return {
      rows,
      pagination: { page: pageNum, limit: limitNum, total },
    };
  }

  const [rows] = await pool.query(sql, params);
  return { rows, pagination: null };
}

/**
 * getDentists — API danh sách bác sĩ (lọc + phân trang)
 * @param {import('express').Request} req - Query: q, specialty, service_id, page, limit
 * @param {import('express').Response} res
 * Logic:
 *   1. Gọi queryDentists với bộ lọc từ query string
 *   2. Có pagination → trả { data, pagination }; không → trả mảng rows
 *   3. Fallback: nếu lỗi ER_NO_SUCH_TABLE (thiếu bảng rating), chạy lại không JOIN rating
 * Trả về: JSON danh sách bác sĩ hoặc 500 khi lỗi
 */
async function getDentists(req, res) {
  const { q, specialty, service_id, page, limit } = req.query;
  try {
    const result = await queryDentists({ q, specialty, service_id }, { page, limit });
    if (result.pagination) {
      return res.json({ data: result.rows, pagination: result.pagination });
    }
    res.json(result.rows);
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      try {
        const params = [];
        let sql = appendDentistFilters(buildDentistsBaseSql(false), params, { q, specialty, service_id });
        sql += ' ORDER BY d.specialty ASC, u.full_name ASC';
        if (page) {
          const pageNum = Math.max(1, Number(page));
          const limitNum = Math.max(1, Math.min(50, Number(limit) || 9));
          const offset = (pageNum - 1) * limitNum;
          const countParams = [];
          const countSql = appendDentistFilters(
            'SELECT COUNT(*) AS total FROM dentists d JOIN users u ON d.user_id = u.id AND u.role = \'dentist\' WHERE d.is_active = 1',
            countParams,
            { q, specialty, service_id }
          );
          const [[{ total }]] = await pool.query(countSql, countParams);
          const [rows] = await pool.query(`${sql} LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
          return res.json({
            data: rows,
            pagination: { page: pageNum, limit: limitNum, total },
          });
        }
        const [rows] = await pool.query(sql, params);
        return res.json(rows);
      } catch (e2) {
        console.error('getDentists fallback error', e2);
      }
    }
    console.error('getDentists error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getDentistsByDepartment — API nhóm bác sĩ theo chuyên khoa (cho trang chủ)
 * @param {import('express').Request} req - Query: per_department (mặc định 3, tối đa 10)
 * @param {import('express').Response} res
 * Logic:
 *   1. Lấy toàn bộ bác sĩ qua queryDentists (không lọc, không phân trang)
 *   2. Nhóm theo specialty (mặc định 'Khác' nếu trống)
 *   3. Mỗi nhóm giữ tối đa per_department bác sĩ
 * Trả về: JSON { departments: [{ specialty, dentists }] }
 */
async function getDentistsByDepartment(req, res) {
  const perDept = Math.min(10, Math.max(1, Number(req.query.per_department) || 3));
  try {
    const { rows } = await queryDentists({}, {});
    const grouped = {};
    for (const row of rows) {
      const key = row.specialty || 'Khác';
      if (!grouped[key]) grouped[key] = [];
      if (grouped[key].length < perDept) grouped[key].push(row);
    }
    res.json({
      departments: Object.entries(grouped).map(([specialty, dentists]) => ({
        specialty,
        dentists,
      })),
    });
  } catch (err) {
    console.error('getDentistsByDepartment error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getDentistById — API chi tiết một bác sĩ (dịch vụ, đánh giá, review)
 * @param {import('express').Request} req - Params: id (dentist_id)
 * @param {import('express').Response} res
 * Logic:
 *   1. SELECT bác sĩ active kèm thông tin user
 *   2. Không tìm thấy → 404
 *   3. Lấy danh sách dịch vụ BS thực hiện từ service_dentists
 *   4. Lấy avg_rating, rating_count và tối đa 50 review gần nhất
 *   5. Bỏ qua lỗi thiếu bảng appointment_ratings (giữ rating = 0)
 * Trả về: JSON hồ sơ bác sĩ đầy đủ hoặc 404/500
 */
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

/**
 * getAvailableDates — API danh sách ngày có thể đặt lịch cho dịch vụ
 * @param {import('express').Request} req - Query: service_id (bắt buộc), dentist_id (tùy chọn)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate service_id
 *   2. Tìm ngày DISTINCT từ staff_shifts: BS active, làm được dịch vụ, ca active, status = assigned
 *   3. Giới hạn từ hôm nay đến +60 ngày, tối đa 30 ngày trả về
 *   4. dentist_id (nếu có): chỉ ngày BS đó trực
 *   5. formatDateKey chuẩn hóa từng ngày
 * Trả về: JSON { dates: string[] } hoặc 400/500
 */
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

/**
 * getShiftsForDate — API danh sách ca trong ngày còn slot trống
 * @param {import('express').Request} req - Query: service_id, date (bắt buộc), dentist_id (tùy chọn)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate service_id và date
 *   2. Lấy tất cả ca active, duyệt từng ca
 *   3. Với mỗi ca: tìm BS trực ca đó, làm được dịch vụ, status = assigned
 *   4. Không có BS → bỏ qua ca
 *   5. Tính slots_left: 1 BS cụ thể → countAvailableSlotsInShift; nhiều BS → countShiftSlotsWithAnyDentist
 *   6. Chỉ trả ca có slots_left > 0
 * Trả về: JSON mảng ca kèm slots_left, duration_minutes hoặc 400/500
 */
async function getShiftsForDate(req, res) {
  const { service_id: serviceId, date, dentist_id: dentistIdRaw } = req.query;
  const dentistId = dentistIdRaw ? Number(dentistIdRaw) : null;
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
      // Tìm bác sĩ được phân ca này trong ngày và thực hiện được dịch vụ
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

      // Thu thập khoảng thời gian đã đặt của từng BS trong ca
      const intervalsByDentist = [];
      for (const { dentist_id } of dentistsOnShift) {
        intervalsByDentist.push(await getBookedIntervals(pool, dentist_id, sh.id, date));
      }

      // Đã chọn BS cụ thể: đếm slot trống của BS đó; chưa chọn: gộp slot của mọi BS (mỗi slot chỉ cần 1 BS rảnh)
      const totalSlots = dentistId
        ? countAvailableSlotsInShift(
            sh.start_time,
            sh.end_time,
            duration,
            intervalsByDentist[0] || []
          )
        : countShiftSlotsWithAnyDentist(
            sh.start_time,
            sh.end_time,
            duration,
            intervalsByDentist
          );
      if (totalSlots <= 0) continue;

      result.push({
        id: sh.id,
        name: sh.name,
        start_time: sh.start_time,
        end_time: sh.end_time,
        slots_left: totalSlots,
        duration_minutes: duration,
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

/**
 * getDentistsForBooking — API bác sĩ trong ca còn slot để đặt lịch
 * @param {import('express').Request} req - Query: service_id, shift_id, date (bắt buộc)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate đủ 3 tham số
 *   2. Lấy BS trực ca, làm được dịch vụ, kèm rating
 *   3. Với mỗi BS: tính slots_left qua getBookedIntervals + countAvailableSlotsInShift
 *   4. Lọc chỉ BS có slots_left > 0
 * Trả về: JSON mảng bác sĩ hoặc 400/500
 */
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
    const [[shiftRow]] = await pool.query(
      'SELECT start_time, end_time FROM shifts WHERE id = ? AND is_active = 1 LIMIT 1',
      [shiftId]
    );
    const [[serviceRow]] = await pool.query(
      'SELECT duration_minutes FROM services WHERE id = ? LIMIT 1',
      [serviceId]
    );
    const duration = (serviceRow && serviceRow.duration_minutes) || 30;
    const withSlots = await Promise.all(
      (list || []).map(async (d) => {
        const bookedIntervals = await getBookedIntervals(pool, d.id, shiftId, date);
        const slotsLeft = shiftRow
          ? countAvailableSlotsInShift(
              shiftRow.start_time,
              shiftRow.end_time,
              duration,
              bookedIntervals
            )
          : 0;
        return { ...d, slots_left: slotsLeft };
      })
    );
    res.json(withSlots.filter((d) => d.slots_left > 0));
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    console.error('getDentistsForBooking error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getSlotsForBooking — API các khung giờ cụ thể còn trống trong ca
 * @param {import('express').Request} req - Query: service_id, dentist_id, shift_id, date (bắt buộc)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate đủ 4 tham số
 *   2. Kiểm tra BS active và thực hiện được dịch vụ
 *   3. Kiểm tra BS có phân ca assigned trong ngày
 *   4. Lấy start/end ca và duration dịch vụ
 *   5. listAvailableSlotTimes tính các giờ trống (loại trừ lịch đã đặt)
 * Trả về: JSON { slots: string[] } hoặc 400/500
 */
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
    const bookedIntervals = await getBookedIntervals(pool, dentistId, shiftId, date);
    const slots = listAvailableSlotTimes(shift.start_time, shift.end_time, duration, bookedIntervals);
    res.json({ slots });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ slots: [] });
    }
    console.error('getSlotsForBooking error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * createAppointment — API tạo lịch hẹn mới (transaction)
 * @param {import('express').Request} req - Body: full_name, phone, email, service_id, dentist_id, shift_id, appointment_time, note, use_account
 * @param {import('express').Response} res
 * Logic:
 *   1. Gộp thông tin từ body hoặc req.user (khi use_account)
 *   2. Validate họ tên, dịch vụ, thời gian, SĐT hợp lệ
 *   3. BEGIN TRANSACTION
 *   4. Kiểm tra dịch vụ active; parse appointment_time → workDate, newStartMin
 *   5. Nếu có shift_id: validate ca, BS (hoặc auto-pick BS rảnh trong ca)
 *   6. Tìm/tạo bệnh nhân theo SĐT (phonesMatch)
 *   7. INSERT appointments status = 'pending', COMMIT
 * Trả về: 201 { id, message } hoặc 400/500
 */
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
  // Đăng nhập + use_account: ưu tiên thông tin từ tài khoản, fallback body
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
  finalPhone = normalizePhoneInput(finalPhone);
  if (!finalPhone) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
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

    // Chuẩn hóa datetime MySQL và tách ngày làm việc
    const apptDateTime = appointment_time.replace('T', ' ').slice(0, 19);
    const workDate = apptDateTime.slice(0, 10);
    const shiftIdNum = shift_id ? Number(shift_id) : null;
    let dentistIdFinal = dentist_id ? Number(dentist_id) : null;
    const newStartMin = parseAppointmentStartMinutes(apptDateTime);
    const duration = service.duration_minutes || 30;

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
        // Khách đã chọn BS: kiểm tra BS làm dịch vụ, trực ca, và slot không trùng lịch
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
        const bookedIntervals = await getBookedIntervals(
          conn,
          dentistIdFinal,
          shiftIdNum,
          workDate
        );
        if (slotOverlapsBooked(newStartMin, duration, bookedIntervals)) {
          await conn.rollback();
          return res.status(400).json({
            message: 'Khung giờ này trùng với lịch hẹn khác của bác sĩ',
          });
        }
      } else {
        // Chưa chọn BS: duyệt ứng viên trong ca, gán BS đầu tiên còn slot trống
        const [candidates] = await conn.query(
          `SELECT ss.dentist_id FROM staff_shifts ss
           JOIN service_dentists sd ON sd.dentist_id = ss.dentist_id AND sd.service_id = ?
           WHERE ss.shift_id = ? AND ss.work_date = ? AND ss.status = 'assigned'`,
          [service_id, shiftIdNum, workDate]
        );
        let picked = null;
        for (const c of candidates) {
          const bookedIntervals = await getBookedIntervals(
            conn,
            c.dentist_id,
            shiftIdNum,
            workDate
          );
          if (!slotOverlapsBooked(newStartMin, duration, bookedIntervals)) {
            picked = c.dentist_id;
            break;
          }
        }
        if (!picked) {
          await conn.rollback();
          return res.status(400).json({ message: 'Không còn khung giờ trống trong ca này' });
        }
        dentistIdFinal = picked;
      }
    }

    // Tìm BN theo SĐT (so khớp linh hoạt); không có thì tạo mới
    const [existingRows] = await conn.query('SELECT id, phone FROM patients');
    const existing = existingRows.find((row) => phonesMatch(row.phone, finalPhone));

    let patientId;
    if (existing) {
      patientId = existing.id;
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

/**
 * getAppointmentStatus — API tra cứu trạng thái lịch hẹn bằng SĐT + mã
 * @param {import('express').Request} req - Query: phone, id (appointment_id)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate phone và id
 *   2. Chuẩn hóa SĐT qua normalizePhoneInput
 *   3. JOIN appointments, patients, services, dentists để lấy chi tiết
 *   4. So khớp SĐT bằng phonesMatch — không khớp → 404 (bảo mật)
 * Trả về: JSON thông tin lịch hẹn hoặc 400/404/500
 */
async function getAppointmentStatus(req, res) {
  const { phone, id } = req.query;
  if (!phone || !id) {
    return res.status(400).json({ message: 'Thiếu SĐT hoặc mã lịch hẹn' });
  }

  const normalizedPhone = normalizePhoneInput(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
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
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length || !phonesMatch(rows[0].phone, normalizedPhone)) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getAppointmentStatus error', err);
    res.status(500).json({ message: 'Lỗi hệ thống' });
  }
}

/**
 * getAppointmentRating — API lấy đánh giá đã gửi cho một lịch hẹn
 * @param {import('express').Request} req - Params: id (appointment_id)
 * @param {import('express').Response} res
 * Logic:
 *   1. SELECT từ appointment_ratings theo appointment_id
 *   2. Chưa có đánh giá → trả null cho các trường
 * Trả về: JSON { rating_stars, comment, created_at } hoặc 500
 */
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

/**
 * submitAppointmentRating — API gửi/cập nhật đánh giá lịch hẹn đã hoàn thành
 * @param {import('express').Request} req - Params: id; Body: stars (1-5), comment, phone (xác minh)
 * @param {import('express').Response} res
 * Logic:
 *   1. Validate stars trong khoảng 1–5
 *   2. Lấy lịch hẹn + SĐT bệnh nhân; không tồn tại → 404
 *   3. Chỉ cho đánh giá khi status = 'completed'
 *   4. Xác minh SĐT: body.phone hoặc req.user.phone phải khớp SĐT đặt lịch
 *   5. INSERT hoặc UPDATE (ON DUPLICATE KEY) vào appointment_ratings
 * Trả về: JSON { message } hoặc 400/403/404/500
 */
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
  getDentistsByDepartment,
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
