/**
 * FILE_GUIDE: db.js — Kết nối MySQL, schema, seed dữ liệu mẫu
 * =============================================================================
 * - pool: connection pool dùng xuyên suốt controllers.
 * - initDatabase(): tạo DB/bảng nếu chưa có, migration cột, seed shifts/services…
 * - enrichDemoData(): 12 bác sĩ (4 khoa × 3), bệnh nhân, lịch hẹn mẫu.
 * - Các hàm ensure*: idempotent — chạy lại không nhân đôi dữ liệu.
 * - DEMO_PASSWORD: mật khẩu mặc định tài khoản demo (admin123).
 */
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'dental_clinic';

const DEMO_PASSWORD = 'admin123';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

/**
 * Chuyển đối tượng Date sang chuỗi ngày ISO (YYYY-MM-DD).
 * Dùng khi ghi work_date vào DB hoặc so khớp ngày làm việc.
 *
 * @param {Date} d - Đối tượng ngày cần định dạng.
 * @returns {string} Chuỗi ngày dạng 'YYYY-MM-DD'.
 * @idempotent Có — cùng một Date cho cùng một kết quả (theo UTC của toISOString).
 */
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Cộng thêm số ngày vào một mốc thời gian, trả về Date mới (không sửa đối tượng gốc).
 *
 * @param {Date|string|number} base - Mốc thời gian ban đầu.
 * @param {number} days - Số ngày cộng thêm (có thể âm để lùi ngày).
 * @returns {Date} Đối tượng Date mới sau khi cộng ngày.
 * @idempotent Có — cùng base và days luôn cho cùng kết quả.
 */
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Tra cứu id người dùng theo email trong bảng users.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL đang dùng.
 * @param {string} email - Email cần tìm (khóa logic của ensureUser).
 * @returns {Promise<number|null>} id người dùng nếu tồn tại, ngược lại null.
 * @idempotent Có — chỉ đọc, không thay đổi dữ liệu.
 */
async function getUserIdByEmail(connection, email) {
  const [rows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0]?.id || null;
}

/**
 * Đảm bảo tài khoản users tồn tại: tìm theo email, nếu chưa có thì INSERT.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {string} passwordHash - Mật khẩu đã băm (bcrypt).
 * @param {{ full_name: string, phone: string, email: string, role: string, avatar_url?: string }} user - Thông tin tài khoản.
 * @returns {Promise<number>} id người dùng (có sẵn hoặc vừa tạo).
 * @idempotent Có — chạy lại với cùng email không tạo bản ghi trùng; không cập nhật user đã tồn tại.
 */
async function ensureUser(connection, passwordHash, user) {
  const existingId = await getUserIdByEmail(connection, user.email);
  if (existingId) return existingId;
  const [result] = await connection.query(
    `INSERT INTO users (full_name, phone, email, password_hash, role, status, avatar_url)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [
      user.full_name,
      user.phone,
      user.email,
      passwordHash,
      user.role,
      user.avatar_url || null,
    ]
  );
  return result.insertId;
}

/**
 * Đảm bảo bệnh nhân tồn tại: tìm theo số điện thoại, nếu chưa có thì INSERT.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {{ full_name: string, phone: string, email?: string, note?: string, avatar_url?: string }} patient - Thông tin bệnh nhân.
 * @returns {Promise<number>} id bệnh nhân (có sẵn hoặc vừa tạo).
 * @idempotent Có — cùng phone không tạo bản ghi mới; không cập nhật bệnh nhân đã tồn tại.
 */
async function ensurePatient(connection, patient) {
  const [rows] = await connection.query('SELECT id FROM patients WHERE phone = ? LIMIT 1', [
    patient.phone,
  ]);
  if (rows.length) return rows[0].id;
  const [result] = await connection.query(
    `INSERT INTO patients (full_name, phone, email, note, avatar_url)
     VALUES (?, ?, ?, ?, ?)`,
    [
      patient.full_name,
      patient.phone,
      patient.email || null,
      patient.note || null,
      patient.avatar_url || null,
    ]
  );
  return result.insertId;
}

/**
 * Đảm bảo dịch vụ tồn tại theo tên: INSERT mới hoặc UPDATE mô tả/giá/thời lượng/ảnh nếu đã có.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {{ name: string, description: string, price: number, duration_minutes: number, thumbnail_url?: string }} service - Dữ liệu dịch vụ.
 * @returns {Promise<number>} id dịch vụ.
 * @idempotent Có theo name — không nhân đôi dòng; lần chạy sau có thể cập nhật các trường mô tả/giá.
 */
async function ensureService(connection, service) {
  const [rows] = await connection.query('SELECT id FROM services WHERE name = ? LIMIT 1', [
    service.name,
  ]);
  if (rows.length) {
    await connection.query(
      `UPDATE services
       SET description = ?, price = ?, duration_minutes = ?, is_active = 1,
           thumbnail_url = COALESCE(?, thumbnail_url)
       WHERE id = ?`,
      [
        service.description,
        service.price,
        service.duration_minutes,
        service.thumbnail_url || null,
        rows[0].id,
      ]
    );
    return rows[0].id;
  }
  const [result] = await connection.query(
    `INSERT INTO services (name, description, price, duration_minutes, is_active, thumbnail_url)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [
      service.name,
      service.description,
      service.price,
      service.duration_minutes,
      service.thumbnail_url || null,
    ]
  );
  return result.insertId;
}

/**
 * Đảm bảo hồ sơ bác sĩ (dentists) gắn với user_id: INSERT hoặc UPDATE chuyên khoa/kinh nghiệm/mô tả.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {number} userId - id tài khoản users có role dentist.
 * @param {{ specialty: string, experience_year: number, description: string, avatar_url?: string }} dentist - Thông tin chuyên môn.
 * @returns {Promise<number>} id bác sĩ trong bảng dentists.
 * @idempotent Có theo user_id — không tạo hai dentist cho một user; lần sau có thể cập nhật metadata.
 */
async function ensureDentist(connection, userId, dentist) {
  const [rows] = await connection.query('SELECT id FROM dentists WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
  if (rows.length) {
    await connection.query(
      `UPDATE dentists
       SET specialty = ?, experience_year = ?, description = ?, is_active = 1,
           avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [
        dentist.specialty,
        dentist.experience_year,
        dentist.description,
        dentist.avatar_url || null,
        rows[0].id,
      ]
    );
    return rows[0].id;
  }
  const [result] = await connection.query(
    `INSERT INTO dentists (user_id, avatar_url, specialty, experience_year, description, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      userId,
      dentist.avatar_url || '/uploads/avatars/dentist-1.jpg',
      dentist.specialty,
      dentist.experience_year,
      dentist.description,
    ]
  );
  return result.insertId;
}

/**
 * Gán bác sĩ cho từng dịch vụ demo theo quy tắc chuyên khoa (4 khoa × 6 dịch vụ).
 * Ví dụ: tẩy trắng → Thẩm mỹ; nhổ khôn → Phẫu thuật + Tổng quát.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {number[]} serviceIds - Mảng 6 id dịch vụ theo thứ tự seed (khám, cạo vôi, tẩy trắng, trám, nhổ khôn, implant).
 * @param {Record<string, number[]>} dentistsBySpecialty - Map chuyên khoa → danh sách dentist_id.
 * @returns {Promise<void>}
 * @idempotent Có — gọi linkServiceDentists (INSERT IGNORE), không tạo liên kết trùng.
 */
async function linkServicesByDepartments(connection, serviceIds, dentistsBySpecialty) {
  const general = dentistsBySpecialty['Nha khoa tổng quát'] || [];
  const ortho = dentistsBySpecialty['Chỉnh nha'] || [];
  const aesthetic = dentistsBySpecialty['Thẩm mỹ nha khoa'] || [];
  const surgery = dentistsBySpecialty['Phẫu thuật hàm mặt'] || [];

  const [generalExam, cleaning, whitening, filling, wisdom, implant] = serviceIds;
  await linkServiceDentists(connection, generalExam, [...general, ...surgery, ...ortho]);
  await linkServiceDentists(connection, cleaning, general);
  await linkServiceDentists(connection, whitening, aesthetic);
  await linkServiceDentists(connection, filling, general);
  await linkServiceDentists(connection, wisdom, [...surgery, ...general]);
  await linkServiceDentists(connection, implant, [...surgery, ...general]);
}

const DENTIST_DEPARTMENTS = [
  {
    specialty: 'Nha khoa tổng quát',
    doctors: [
      {
        email: 'dentist1@clinic.local',
        full_name: 'Bs. Nguyễn Văn An',
        phone: '0900000001',
        experience_year: 8,
        description:
          'Bác sĩ Nguyễn Văn An có hơn 8 năm kinh nghiệm khám và điều trị răng miệng tổng quát, tư vấn phác đồ điều trị cá nhân hóa.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
      {
        email: 'dentist4@clinic.local',
        full_name: 'Bs. Phạm Thị Lan',
        phone: '0900000014',
        experience_year: 5,
        description:
          'Bác sĩ Phạm Thị Lan chuyên khám tổng quát và chăm sóc răng miệng định kỳ cho cả gia đình.',
        avatar_url: '/uploads/avatars/dentist-2.jpg',
      },
      {
        email: 'dentist5@clinic.local',
        full_name: 'Bs. Hoàng Văn Đức',
        phone: '0900000015',
        experience_year: 7,
        description:
          'Bác sĩ Hoàng Văn Đức có kinh nghiệm điều trị sâu răng, viêm nướu và tư vấn phòng ngừa.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
    ],
  },
  {
    specialty: 'Chỉnh nha',
    doctors: [
      {
        email: 'dentist2@clinic.local',
        full_name: 'Bs. Trần Thị Cường',
        phone: '0900000011',
        experience_year: 6,
        description:
          'Bác sĩ Trần Thị Cường chuyên chỉnh nha mắc cài và khay trong suốt, theo dõi tiến trình điều trị sát sao.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
      {
        email: 'dentist6@clinic.local',
        full_name: 'Bs. Nguyễn Thị Hương',
        phone: '0900000016',
        experience_year: 9,
        description:
          'Bác sĩ Nguyễn Thị Hương tư vấn chỉnh nha cho trẻ em và người lớn, ưu tiên thẩm mỹ và chức năng.',
        avatar_url: '/uploads/avatars/dentist-2.jpg',
      },
      {
        email: 'dentist7@clinic.local',
        full_name: 'Bs. Lê Quốc Bảo',
        phone: '0900000017',
        experience_year: 4,
        description:
          'Bác sĩ Lê Quốc Bảo hỗ trợ điều trị chỉnh nha và theo dõi tái khám định kỳ cho bệnh nhân.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
    ],
  },
  {
    specialty: 'Thẩm mỹ nha khoa',
    doctors: [
      {
        email: 'dentist3@clinic.local',
        full_name: 'Bs. Lê Minh Khoa',
        phone: '0900000012',
        experience_year: 10,
        description:
          'Bác sĩ Lê Minh Khoa tập trung tẩy trắng, dán sứ veneer và phục hồi thẩm mỹ nụ cười.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
      {
        email: 'dentist8@clinic.local',
        full_name: 'Bs. Trần Mai Phương',
        phone: '0900000018',
        experience_year: 8,
        description:
          'Bác sĩ Trần Mai Phương chuyên thiết kế nụ cười và điều chỉnh màu sắc răng tự nhiên.',
        avatar_url: '/uploads/avatars/dentist-2.jpg',
      },
      {
        email: 'dentist9@clinic.local',
        full_name: 'Bs. Võ Anh Tuấn',
        phone: '0900000019',
        experience_year: 6,
        description:
          'Bác sĩ Võ Anh Tuấn có kinh nghiệm tẩy trắng răng và phục hình thẩm mỹ an toàn.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
    ],
  },
  {
    specialty: 'Phẫu thuật hàm mặt',
    doctors: [
      {
        email: 'dentist10@clinic.local',
        full_name: 'Bs. Đặng Minh Khang',
        phone: '0900000020',
        experience_year: 12,
        description:
          'Bác sĩ Đặng Minh Khang chuyên nhổ răng khôn, tiểu phẫu và cấy implant.',
        avatar_url: '/uploads/avatars/dentist-2.jpg',
      },
      {
        email: 'dentist11@clinic.local',
        full_name: 'Bs. Bùi Thị Ngọc',
        phone: '0900000021',
        experience_year: 9,
        description:
          'Bác sĩ Bùi Thị Ngọc có kinh nghiệm phẫu thuật hàm mặt và điều trị răng khôn phức tạp.',
        avatar_url: '/uploads/avatars/dentist-1.jpg',
      },
      {
        email: 'dentist12@clinic.local',
        full_name: 'Bs. Phan Văn Hùng',
        phone: '0900000022',
        experience_year: 11,
        description:
          'Bác sĩ Phan Văn Hùng tư vấn và thực hiện các thủ thuật phẫu thuật trong miệng an toàn.',
        avatar_url: '/uploads/avatars/dentist-2.jpg',
      },
    ],
  },
];

/**
 * Seed 12 bác sĩ demo (4 khoa × 3 người) từ DENTIST_DEPARTMENTS: tạo user + dentist cho từng bác sĩ.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {string} passwordHash - Mật khẩu bcrypt dùng chung cho tài khoản demo.
 * @returns {Promise<{ dentistIds: number[], dentistsBySpecialty: Record<string, number[]> }>}
 *   dentistIds: tất cả id bác sĩ; dentistsBySpecialty: nhóm theo tên chuyên khoa.
 * @idempotent Có — ensureUser/ensureDentist không nhân đôi theo email/user_id.
 */
async function ensureDepartmentDentists(connection, passwordHash) {
  const dentistIds = [];
  const dentistsBySpecialty = {};

  for (const dept of DENTIST_DEPARTMENTS) {
    dentistsBySpecialty[dept.specialty] = [];
    for (const doc of dept.doctors) {
      const userId = await ensureUser(connection, passwordHash, {
        full_name: doc.full_name,
        phone: doc.phone,
        email: doc.email,
        role: 'dentist',
        avatar_url: doc.avatar_url,
      });
      const dentistId = await ensureDentist(connection, userId, {
        specialty: dept.specialty,
        experience_year: doc.experience_year,
        description: doc.description,
        avatar_url: doc.avatar_url,
      });
      dentistIds.push(dentistId);
      dentistsBySpecialty[dept.specialty].push(dentistId);
    }
  }

  return { dentistIds, dentistsBySpecialty };
}

/**
 * Liên kết một dịch vụ với nhiều bác sĩ trong bảng service_dentists.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {number} serviceId - id dịch vụ.
 * @param {number[]} dentistIds - Danh sách id bác sĩ được phép thực hiện dịch vụ.
 * @returns {Promise<void>}
 * @idempotent Có — dùng INSERT IGNORE, cặp (service_id, dentist_id) trùng bị bỏ qua.
 */
async function linkServiceDentists(connection, serviceId, dentistIds) {
  for (const dentistId of dentistIds) {
    await connection.query('INSERT IGNORE INTO service_dentists (service_id, dentist_id) VALUES (?, ?)', [
      serviceId,
      dentistId,
    ]);
  }
}

/**
 * Gán lịch trực (staff_shifts) cho danh sách bác sĩ: mỗi ngày × mỗi ca active trong dayCount ngày tới.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {number[]} dentistIds - Danh sách id bác sĩ cần gán ca.
 * @param {number} [dayCount=14] - Số ngày tính từ hôm nay (0 = hôm nay).
 * @returns {Promise<void>} Không làm gì nếu không có ca active hoặc dentistIds rỗng.
 * @idempotent Có — INSERT IGNORE theo khóa (dentist_id, shift_id, work_date).
 */
async function ensureStaffShiftsForDentists(connection, dentistIds, dayCount = 14) {
  const [shiftRows] = await connection.query('SELECT id FROM shifts WHERE is_active = 1');
  if (!shiftRows.length || !dentistIds.length) return;

  for (let i = 0; i < dayCount; i++) {
    const workDate = formatDate(addDays(new Date(), i));
    for (const dentistId of dentistIds) {
      for (const shift of shiftRows) {
        await connection.query(
          `INSERT IGNORE INTO staff_shifts (dentist_id, shift_id, work_date, status)
           VALUES (?, ?, ?, 'assigned')`,
          [dentistId, shift.id, workDate]
        );
      }
    }
  }
}

/**
 * Đảm bảo các ngày làm việc (working_days) được đánh dấu 'open' trong dayCount ngày tới.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL.
 * @param {number} [dayCount=30] - Số ngày tính từ hôm nay.
 * @returns {Promise<void>}
 * @idempotent Có — INSERT IGNORE theo work_date; ngày đã có không bị ghi đè.
 */
async function ensureWorkingDays(connection, dayCount = 30) {
  for (let i = 0; i < dayCount; i++) {
    const workDate = formatDate(addDays(new Date(), i));
    await connection.query(
      `INSERT IGNORE INTO working_days (work_date, status, note) VALUES (?, 'open', NULL)`,
      [workDate]
    );
  }
}

/**
 * Bổ sung dữ liệu demo phong phú sau seed tối thiểu: admin/staff/khách, 12 bác sĩ, dịch vụ,
 * bệnh nhân, ca trực, lịch hẹn mẫu, đánh giá, hồ sơ bệnh án, cấu hình phòng khám.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Kết nối MySQL (thường từ initDatabase).
 * @returns {Promise<void>}
 * @idempotent Phần lớn có — ensure* và INSERT IGNORE; lịch hẹn chỉ thêm khi COUNT < 20 và không trùng khóa logic.
 */
async function enrichDemoData(connection) {
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Phần người dùng nội bộ & khách hàng ---
  const userIds = {
    admin: await ensureUser(connection, passwordHash, {
      full_name: 'Quản trị hệ thống',
      phone: '0900000000',
      email: 'admin@clinic.local',
      role: 'admin',
    }),
    staff1: await ensureUser(connection, passwordHash, {
      full_name: 'Lễ tân Ngọc Hân',
      phone: '0900000002',
      email: 'staff1@clinic.local',
      role: 'staff',
    }),
    staff2: await ensureUser(connection, passwordHash, {
      full_name: 'Lễ tân Minh Tuấn',
      phone: '0900000013',
      email: 'staff2@clinic.local',
      role: 'staff',
    }),
    customer1: await ensureUser(connection, passwordHash, {
      full_name: 'Phạm Thu Hà',
      phone: '0912001001',
      email: 'customer1@example.com',
      role: 'customer',
    }),
    customer2: await ensureUser(connection, passwordHash, {
      full_name: 'Hoàng Văn Đức',
      phone: '0912001002',
      email: 'customer2@example.com',
      role: 'customer',
    }),
  };

  // --- Phần bác sĩ theo khoa (12 người, 4 chuyên khoa) ---
  const { dentistIds, dentistsBySpecialty } = await ensureDepartmentDentists(
    connection,
    passwordHash
  );

  // --- Phần dịch vụ ---
  const serviceIds = [
    await ensureService(connection, {
      name: 'Khám tổng quát',
      description: 'Khám và tư vấn sức khỏe răng miệng tổng quát.',
      price: 200000,
      duration_minutes: 30,
      thumbnail_url: '/uploads/services/service-general.jpg',
    }),
    await ensureService(connection, {
      name: 'Cạo vôi và đánh bóng',
      description: 'Làm sạch vôi răng và đánh bóng bề mặt răng.',
      price: 400000,
      duration_minutes: 45,
      thumbnail_url: '/uploads/services/service-cleaning.jpg',
    }),
    await ensureService(connection, {
      name: 'Tẩy trắng răng',
      description: 'Dịch vụ tẩy trắng răng an toàn tại phòng khám.',
      price: 1500000,
      duration_minutes: 60,
      thumbnail_url: '/uploads/services/service-whitening.jpg',
    }),
    await ensureService(connection, {
      name: 'Trám răng composite',
      description: 'Trám răng sâu bằng composite màu răng tự nhiên.',
      price: 350000,
      duration_minutes: 40,
      thumbnail_url: '/uploads/services/service-general.jpg',
    }),
    await ensureService(connection, {
      name: 'Nhổ răng khôn',
      description: 'Nhổ răng khôn an toàn, có gây tê và hướng dẫn chăm sóc sau thủ thuật.',
      price: 2500000,
      duration_minutes: 60,
      thumbnail_url: '/uploads/services/service-cleaning.jpg',
    }),
    await ensureService(connection, {
      name: 'Tư vấn cấy Implant',
      description: 'Khám, chụp phim và tư vấn phương án cấy implant phù hợp.',
      price: 500000,
      duration_minutes: 45,
      thumbnail_url: '/uploads/services/service-whitening.jpg',
    }),
  ];

  await linkServicesByDepartments(connection, serviceIds, dentistsBySpecialty);

  // --- Phần bệnh nhân ---
  const patientSeeds = [
    { full_name: 'Trần Thị Bích', phone: '0912345678', email: 'patient1@example.com', note: 'Khách hàng demo đầu tiên.' },
    { full_name: 'Nguyễn Hoài Nam', phone: '0912345001', email: 'nam.nguyen@example.com', note: 'Đau răng hàm, cần tái khám định kỳ.' },
    { full_name: 'Lê Thị Mai', phone: '0912345002', email: 'mai.le@example.com', note: 'Muốn tẩy trắng răng trước lễ cưới.' },
    { full_name: 'Phạm Quốc Huy', phone: '0912345003', email: 'huy.pham@example.com', note: 'Răng khôn mọc lệch, cần tư vấn nhổ.' },
    { full_name: 'Võ Thị Lan', phone: '0912345004', email: 'lan.vo@example.com', note: 'Khách quen, cạo vôi 6 tháng/lần.' },
    { full_name: 'Đặng Minh Tuấn', phone: '0912345005', email: 'tuan.dang@example.com', note: 'Trám răng cửa sau tai nạn nhỏ.' },
    { full_name: 'Bùi Thu Trang', phone: '0912345006', email: 'trang.bui@example.com', note: 'Đang chỉnh nha, tái khám định kỳ.' },
    { full_name: 'Huỳnh Văn Phúc', phone: '0912345007', email: 'phuc.huynh@example.com', note: 'Tư vấn implant răng hàm.' },
    { full_name: 'Đỗ Thị Hồng', phone: '0912345008', email: 'hong.do@example.com', note: 'Khám tổng quát cho con.' },
    { full_name: 'Phạm Thu Hà', phone: '0912001001', email: 'customer1@example.com', note: 'Tài khoản khách hàng đã đăng ký.' },
    { full_name: 'Hoàng Văn Đức', phone: '0912001002', email: 'customer2@example.com', note: 'Khách hàng thân thiết.' },
    { full_name: 'Trương Anh Khoa', phone: '0912345009', email: 'khoa.truong@example.com', note: 'Đặt lịch online lần đầu.' },
    { full_name: 'Ngô Thị Yến', phone: '0912345010', email: 'yen.ngo@example.com', note: 'Nhạy cảm khi khám răng.' },
    { full_name: 'Lý Văn Bình', phone: '0912345011', email: 'binh.ly@example.com', note: 'Cần lịch sáng sớm.' },
    { full_name: 'Cao Thị Như', phone: '0912345012', email: 'nhu.cao@example.com', note: 'Ưu tiên bác sĩ nữ.' },
  ];

  const patientIds = [];
  for (const p of patientSeeds) {
    patientIds.push(await ensurePatient(connection, p));
  }

  // --- Phần ca làm việc, lịch trực bác sĩ & ngày mở cửa ---
  const [shiftRows] = await connection.query(
    "SELECT id, name, start_time FROM shifts WHERE is_active = 1 ORDER BY start_time ASC"
  );
  const morningShift = shiftRows.find((s) => s.name.includes('sáng')) || shiftRows[0];
  const afternoonShift = shiftRows.find((s) => s.name.includes('chiều')) || shiftRows[1] || morningShift;

  if (morningShift) {
    await connection.query('UPDATE appointments SET shift_id = ? WHERE shift_id IS NULL', [
      morningShift.id,
    ]);
  }

  await ensureStaffShiftsForDentists(connection, dentistIds, 14);
  await ensureWorkingDays(connection, 30);

  // --- Phần lịch hẹn mẫu (chỉ bổ sung khi chưa đủ dữ liệu) ---
  const [apptCountRows] = await connection.query('SELECT COUNT(*) AS count FROM appointments');
  if (apptCountRows[0].count < 20) {
    const appointmentPlans = [
      { dayOffset: -14, hour: 9, status: 'completed', serviceIdx: 0, dentistIdx: 0, patientIdx: 0, shift: morningShift, public_note: 'Khám định kỳ', internal_note: 'Đã hoàn thành khám tổng quát' },
      { dayOffset: -10, hour: 10, status: 'completed', serviceIdx: 1, dentistIdx: 0, patientIdx: 1, shift: morningShift, public_note: 'Cạo vôi định kỳ', internal_note: 'Hoàn thành, hẹn tái khám 6 tháng' },
      { dayOffset: -7, hour: 14, status: 'completed', serviceIdx: 2, dentistIdx: 2, patientIdx: 2, shift: afternoonShift, public_note: 'Tẩy trắng răng', internal_note: 'Kết quả tốt, dặn kiêng đồ màu' },
      { dayOffset: -5, hour: 9, status: 'completed', serviceIdx: 3, dentistIdx: 0, patientIdx: 5, shift: morningShift, public_note: 'Trám răng cửa', internal_note: 'Trám composite ổn định' },
      { dayOffset: -3, hour: 15, status: 'completed', serviceIdx: 0, dentistIdx: 1, patientIdx: 6, shift: afternoonShift, public_note: 'Tái khám chỉnh nha', internal_note: 'Điều chỉnh khay lần 2' },
      { dayOffset: 1, hour: 8, status: 'confirmed', serviceIdx: 0, dentistIdx: 0, patientIdx: 3, shift: morningShift, public_note: 'Khám răng khôn', internal_note: 'Chuẩn bị chụp phim' },
      { dayOffset: 2, hour: 10, status: 'confirmed', serviceIdx: 4, dentistIdx: 0, patientIdx: 3, shift: morningShift, public_note: 'Tư vấn nhổ răng khôn', internal_note: '' },
      { dayOffset: 3, hour: 14, status: 'confirmed', serviceIdx: 2, dentistIdx: 2, patientIdx: 4, shift: afternoonShift, public_note: 'Tẩy trắng', internal_note: '' },
      { dayOffset: 4, hour: 9, status: 'pending', serviceIdx: 1, dentistIdx: 0, patientIdx: 8, shift: morningShift, public_note: 'Cạo vôi cho bé', internal_note: '' },
      { dayOffset: 5, hour: 11, status: 'pending', serviceIdx: 5, dentistIdx: 2, patientIdx: 7, shift: morningShift, public_note: 'Tư vấn implant', internal_note: '' },
      { dayOffset: 6, hour: 15, status: 'confirmed', serviceIdx: 3, dentistIdx: 1, patientIdx: 9, shift: afternoonShift, public_note: 'Trám răng', internal_note: '' },
      { dayOffset: 7, hour: 9, status: 'confirmed', serviceIdx: 0, dentistIdx: 1, patientIdx: 10, shift: morningShift, public_note: 'Khám tổng quát', internal_note: '' },
      { dayOffset: -2, hour: 16, status: 'canceled', serviceIdx: 1, dentistIdx: 0, patientIdx: 11, shift: afternoonShift, public_note: 'Khách hủy vì bận việc', internal_note: 'Đã gọi xác nhận hủy' },
      { dayOffset: -1, hour: 10, status: 'no_show', serviceIdx: 0, dentistIdx: 0, patientIdx: 12, shift: morningShift, public_note: 'Không đến', internal_note: 'Gọi 2 lần không nghe máy' },
      { dayOffset: 8, hour: 13, status: 'pending', serviceIdx: 2, dentistIdx: 2, patientIdx: 13, shift: afternoonShift, public_note: 'Muốn làm trắng răng', internal_note: '' },
      { dayOffset: 9, hour: 8, status: 'confirmed', serviceIdx: 1, dentistIdx: 0, patientIdx: 14, shift: morningShift, public_note: 'Cạo vôi buổi sáng', internal_note: '' },
      { dayOffset: 10, hour: 10, status: 'confirmed', serviceIdx: 0, dentistIdx: 2, patientIdx: 2, shift: morningShift, public_note: 'Tái khám sau tẩy trắng', internal_note: '' },
      { dayOffset: 12, hour: 14, status: 'pending', serviceIdx: 5, dentistIdx: 1, patientIdx: 7, shift: afternoonShift, public_note: 'Tư vấn implant hàm dưới', internal_note: '' },
    ];

    const insertedAppointmentIds = [];
    for (const plan of appointmentPlans) {
      const apptTime = addDays(new Date(), plan.dayOffset);
      apptTime.setHours(plan.hour, 0, 0, 0);
      const patientId = patientIds[plan.patientIdx % patientIds.length];
      const dentistId = dentistIds[plan.dentistIdx % dentistIds.length];
      const serviceId = serviceIds[plan.serviceIdx % serviceIds.length];
      const shiftId = plan.shift?.id || morningShift?.id || null;

      const [exists] = await connection.query(
        `SELECT id FROM appointments
         WHERE patient_id = ? AND dentist_id = ? AND service_id = ?
           AND appointment_time = ? LIMIT 1`,
        [patientId, dentistId, serviceId, apptTime]
      );
      if (exists.length) continue;

      const [result] = await connection.query(
        `INSERT INTO appointments
         (patient_id, dentist_id, service_id, shift_id, appointment_time, status, public_note, internal_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          dentistId,
          serviceId,
          shiftId,
          apptTime,
          plan.status,
          plan.public_note,
          plan.internal_note,
        ]
      );
      insertedAppointmentIds.push({ id: result.insertId, status: plan.status, patientIdx: plan.patientIdx });
    }

    // --- Phần đánh giá lịch hẹn đã hoàn thành ---
    const [completedAppts] = await connection.query(
      `SELECT id FROM appointments WHERE status = 'completed' ORDER BY id ASC`
    );
    const ratingComments = [
      'Bác sĩ tư vấn rất kỹ, phòng khám sạch sẽ.',
      'Thủ thuật nhẹ nhàng, không đau nhiều.',
      'Nhân viên thân thiện, đặt lịch online tiện lợi.',
      'Kết quả điều trị tốt, sẽ quay lại.',
      'Rất hài lòng với dịch vụ.',
    ];
    for (let i = 0; i < completedAppts.length; i++) {
      const apptId = completedAppts[i].id;
      const stars = 4 + (i % 2);
      await connection.query(
        `INSERT IGNORE INTO appointment_ratings (appointment_id, rating_stars, comment)
         VALUES (?, ?, ?)`,
        [apptId, stars, ratingComments[i % ratingComments.length]]
      );
    }

    // --- Phần hồ sơ bệnh án mẫu ---
    const recordSamples = [
      { diagnosis: 'Viêm nướu nhẹ, vôi răng vừa', treatment: 'Cạo vôi, hướng dẫn vệ sinh răng miệng' },
      { diagnosis: 'Sâu răng cửa mức độ I', treatment: 'Trám composite, tái khám sau 1 tuần' },
      { diagnosis: 'Răng ố vàng do thói quen uống cà phê', treatment: 'Tẩy trắng tại phòng khám, dặn kiêng thực phẩm màu' },
      { diagnosis: 'Sai lệch khớp cắn nhẹ', treatment: 'Tiếp tục đeo khay chỉnh nha, hẹn tái khám 4 tuần' },
      { diagnosis: 'Mất răng hàm, xương ổn định', treatment: 'Tư vấn cấy implant, chụp CBCT trước phẫu thuật' },
    ];
    for (let i = 0; i < Math.min(completedAppts.length, recordSamples.length); i++) {
      const apptId = completedAppts[i].id;
      const [apptRow] = await connection.query(
        'SELECT patient_id FROM appointments WHERE id = ? LIMIT 1',
        [apptId]
      );
      if (!apptRow.length) continue;
      const [existsRecord] = await connection.query(
        'SELECT id FROM medical_records WHERE appointment_id = ? LIMIT 1',
        [apptId]
      );
      if (existsRecord.length) continue;
      const sample = recordSamples[i];
      await connection.query(
        `INSERT INTO medical_records (patient_id, appointment_id, diagnosis, treatment)
         VALUES (?, ?, ?, ?)`,
        [apptRow[0].patient_id, apptId, sample.diagnosis, sample.treatment]
      );
    }
  }

  // --- Phần cấu hình phòng khám ---
  const [clinicCount] = await connection.query('SELECT COUNT(*) AS count FROM clinic_settings');
  if (clinicCount[0].count === 0) {
    await connection.query(
      `INSERT INTO clinic_settings (clinic_name, address, phone, email, working_hours, logo_url)
       VALUES ('Nha Khoa Dental Clinic', '123 Đường ABC, Quận 1, TP.HCM', '02812345678', 'contact@nhakhoademo.vn', 'Thứ 2 - Thứ 7: 8h00 - 20h00', '/uploads/clinic/logo.svg')`
    );
  } else {
    await connection.query(
      `UPDATE clinic_settings
       SET clinic_name = 'Nha Khoa Dental Clinic',
           logo_url = COALESCE(NULLIF(logo_url, ''), '/uploads/clinic/logo.svg')
       WHERE clinic_name = 'Nha khoa Demo' OR logo_url IS NULL OR logo_url = ''`
    );
  }
}

/**
 * Khởi tạo toàn bộ database: tạo DB/schema, migration cột/bảng thiếu, seed tối thiểu,
 * enrich demo, cập nhật ảnh mẫu và hết hạn lịch quá khứ. Gọi một lần khi server khởi động.
 *
 * @returns {Promise<void>}
 * @idempotent Có — CREATE IF NOT EXISTS, migration có điều kiện, seed chỉ khi bảng trống;
 *   enrichDemoData và các ensure* an toàn khi chạy lại.
 */
async function initDatabase() {
  // --- Phần tạo database (bootstrap không gắn sẵn tên DB) ---
  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    multipleStatements: true,
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } finally {
    await bootstrap.end();
  }

  // --- Phần kết nối pool và tạo schema bảng ---
  const connection = await pool.getConnection();
  try {
    await connection.query(`USE \`${DB_NAME}\`;`);

    const schemaSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','dentist','staff','customer') NOT NULL DEFAULT 'customer',
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        note TEXT,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dentists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        specialty VARCHAR(255),
        experience_year INT,
        description TEXT,
        is_active TINYINT(1) DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS dentist_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dentist_id INT NOT NULL,
        work_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status ENUM('available','off') NOT NULL DEFAULT 'available',
        note TEXT,
        FOREIGN KEY (dentist_id) REFERENCES dentists(id)
      );

      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(15,2) NOT NULL DEFAULT 0,
        duration_minutes INT NOT NULL DEFAULT 30,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        thumbnail_url VARCHAR(500)
      );

      CREATE TABLE IF NOT EXISTS service_dentists (
        service_id INT NOT NULL,
        dentist_id INT NOT NULL,
        PRIMARY KEY (service_id, dentist_id),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        max_appointments_per_dentist INT NOT NULL DEFAULT 10,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dentist_id INT NOT NULL,
        shift_id INT NOT NULL,
        work_date DATE NOT NULL,
        status ENUM('assigned','canceled') NOT NULL DEFAULT 'assigned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_dentist_shift_date (dentist_id, shift_id, work_date),
        FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        dentist_id INT NOT NULL,
        service_id INT NOT NULL,
        shift_id INT,
        appointment_time DATETIME NOT NULL,
        status ENUM('pending','confirmed','checked_in','in_progress','completed','canceled','no_show') NOT NULL DEFAULT 'pending',
        public_note TEXT,
        internal_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (dentist_id) REFERENCES dentists(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS medical_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        appointment_id INT NOT NULL,
        diagnosis TEXT,
        treatment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      );

      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_category ENUM('xray','avatar','service','clinic','document') NOT NULL,
        related_table ENUM('patients','dentists','services','medical_records') NOT NULL,
        related_id INT NOT NULL,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS clinic_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clinic_name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(255),
        working_hours VARCHAR(255),
        logo_file_id INT,
        logo_url VARCHAR(500),
        role_permissions_json TEXT,
        security_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (logo_file_id) REFERENCES files(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action ENUM('create','update','delete') NOT NULL,
        target_table VARCHAR(100) NOT NULL,
        target_id INT NOT NULL,
        old_data JSON,
        new_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      );

      CREATE TABLE IF NOT EXISTS working_days (
        work_date DATE PRIMARY KEY,
        status ENUM('open','closed') NOT NULL DEFAULT 'open',
        note VARCHAR(255)
      );
    `;

    await connection.query(schemaSql);

    // --- Phần migration cột và bảng (DB cũ thiếu cấu trúc mới) ---
    const [userRoleEnum] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
      [DB_NAME]
    );
    const roleType = userRoleEnum[0]?.COLUMN_TYPE || '';
    if (!roleType.includes('customer')) {
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN role ENUM('admin','dentist','staff','customer') NOT NULL DEFAULT 'customer'"
      );
    }

    const [serviceThumbCols] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'services' AND COLUMN_NAME = 'thumbnail_url'`,
      [DB_NAME]
    );
    if (serviceThumbCols.length === 0) {
      await connection.query('ALTER TABLE services ADD COLUMN thumbnail_url VARCHAR(500)');
    }

    const [patientAvatarCols] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'avatar_url'`,
      [DB_NAME]
    );
    if (patientAvatarCols.length === 0) {
      await connection.query('ALTER TABLE patients ADD COLUMN avatar_url VARCHAR(500)');
    }

    const [userAvatarCols] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'`,
      [DB_NAME]
    );
    if (userAvatarCols.length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)');
    }

    const [passwordUpdatedCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_updated_at'`,
      [DB_NAME]
    );
    if (passwordUpdatedCols.length === 0) {
      await connection.query(
        'ALTER TABLE users ADD COLUMN password_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'
      );
      await connection.query('UPDATE users SET password_updated_at = created_at WHERE password_updated_at IS NULL');
    }

    const [dentistAvatarCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'dentists' AND COLUMN_NAME = 'avatar_url'`,
      [DB_NAME]
    );
    if (dentistAvatarCols.length === 0) {
      await connection.query('ALTER TABLE dentists ADD COLUMN avatar_url VARCHAR(500)');
    }

    const [clinicLogoUrlCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clinic_settings' AND COLUMN_NAME = 'logo_url'`,
      [DB_NAME]
    );
    if (clinicLogoUrlCols.length === 0) {
      await connection.query('ALTER TABLE clinic_settings ADD COLUMN logo_url VARCHAR(500)');
    }

    const [clinicRolePermCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clinic_settings' AND COLUMN_NAME = 'role_permissions_json'`,
      [DB_NAME]
    );
    if (clinicRolePermCols.length === 0) {
      await connection.query('ALTER TABLE clinic_settings ADD COLUMN role_permissions_json TEXT');
    }

    const [clinicSecurityCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clinic_settings' AND COLUMN_NAME = 'security_json'`,
      [DB_NAME]
    );
    if (clinicSecurityCols.length === 0) {
      await connection.query('ALTER TABLE clinic_settings ADD COLUMN security_json TEXT');
    }

    const [serviceDentistsTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'service_dentists'`,
      [DB_NAME]
    );
    if (serviceDentistsTable.length === 0) {
      await connection.query(`
        CREATE TABLE service_dentists (
          service_id INT NOT NULL,
          dentist_id INT NOT NULL,
          PRIMARY KEY (service_id, dentist_id),
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
          FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE
        )
      `);
    }

    const [ratingsTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appointment_ratings'`,
      [DB_NAME]
    );
    if (ratingsTable.length === 0) {
      await connection.query(`
        CREATE TABLE appointment_ratings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          appointment_id INT NOT NULL UNIQUE,
          rating_stars TINYINT NOT NULL,
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        )
      `);
    }

    const [workingDaysTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'working_days'`,
      [DB_NAME]
    );
    if (workingDaysTable.length === 0) {
      await connection.query(`
        CREATE TABLE working_days (
          work_date DATE PRIMARY KEY,
          status ENUM('open','closed') NOT NULL DEFAULT 'open',
          note VARCHAR(255)
        )
      `);
    }

    const [shiftsTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'shifts'`,
      [DB_NAME]
    );
    if (shiftsTable.length === 0) {
      await connection.query(`
        CREATE TABLE shifts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          max_appointments_per_dentist INT NOT NULL DEFAULT 10,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }

    const [staffShiftsTable] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'staff_shifts'`,
      [DB_NAME]
    );
    if (staffShiftsTable.length === 0) {
      await connection.query(`
        CREATE TABLE staff_shifts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dentist_id INT NOT NULL,
          shift_id INT NOT NULL,
          work_date DATE NOT NULL,
          status ENUM('assigned','canceled') NOT NULL DEFAULT 'assigned',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_dentist_shift_date (dentist_id, shift_id, work_date),
          FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE,
          FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
        )
      `);
    }

    const [apptShiftCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'shift_id'`,
      [DB_NAME]
    );
    if (apptShiftCol.length === 0) {
      await connection.query(
        'ALTER TABLE appointments ADD COLUMN shift_id INT NULL AFTER service_id, ADD CONSTRAINT fk_appointments_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL'
      ).catch(() => {
        connection.query('ALTER TABLE appointments ADD COLUMN shift_id INT NULL AFTER service_id');
      });
    }

    // --- Phần seed dữ liệu tối thiểu (khi bảng users trống) ---
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);

      await connection.query(
        `INSERT INTO users (full_name, phone, email, password_hash, role, status)
         VALUES 
         ('Quản trị hệ thống', '0900000000', 'admin@clinic.local', ?, 'admin', 'active'),
         ('Bs. Nguyễn Văn A', '0900000001', 'dentist1@clinic.local', ?, 'dentist', 'active'),
         ('Lễ tân 1', '0900000002', 'staff1@clinic.local', ?, 'staff', 'active')`,
        [passwordHash, passwordHash, passwordHash]
      );

      // Create dentists from dentist users
      const [dentistUsers] = await connection.query(
        "SELECT id FROM users WHERE role = 'dentist'"
      );
      if (dentistUsers.length > 0) {
        await connection.query(
          `INSERT INTO dentists (user_id, avatar_url, specialty, experience_year, description, is_active)
           VALUES (?, '/uploads/avatars/dentist-1.jpg', 'Nha khoa tổng quát', 5, 'Bác sĩ nha khoa với kinh nghiệm 5 năm.', 1)`,
          [dentistUsers[0].id]
        );
      }

      // Seed services
      await connection.query(
        `INSERT INTO services (name, description, price, duration_minutes, is_active, thumbnail_url)
         VALUES
         ('Khám tổng quát', 'Khám và tư vấn sức khoẻ răng miệng tổng quát.', 200000, 30, 1, '/uploads/services/service-general.jpg'),
         ('Cạo vôi và đánh bóng', 'Làm sạch vôi răng và đánh bóng bề mặt răng.', 400000, 45, 1, '/uploads/services/service-cleaning.jpg'),
         ('Tẩy trắng răng', 'Dịch vụ tẩy trắng răng an toàn.', 1500000, 60, 1, '/uploads/services/service-whitening.jpg')`
      );

      // Gắn bác sĩ đầu tiên với tất cả dịch vụ (để flow đặt lịch theo ca hoạt động)
      const [dentistsForLink] = await connection.query('SELECT id FROM dentists LIMIT 1');
      const [serviceIds] = await connection.query('SELECT id FROM services');
      if (dentistsForLink.length && serviceIds.length) {
        const dentistId = dentistsForLink[0].id;
        for (const s of serviceIds) {
          await connection.query(
            'INSERT IGNORE INTO service_dentists (service_id, dentist_id) VALUES (?, ?)',
            [s.id, dentistId]
          );
        }
      }

      // Seed one patient and appointment
      const [patientResult] = await connection.query(
        `INSERT INTO patients (full_name, phone, email, note)
         VALUES ('Trần Thị B', '0912345678', 'patient1@example.com', 'Khách hàng demo đầu tiên.')`
      );
      const patientId = patientResult.insertId;

      const [dentists] = await connection.query('SELECT id FROM dentists LIMIT 1');
      const [services] = await connection.query('SELECT id FROM services LIMIT 1');

      if (dentists.length > 0 && services.length > 0) {
        const dentistId = dentists[0].id;
        const serviceId = services[0].id;
        const appointmentTime = new Date();
        appointmentTime.setDate(appointmentTime.getDate() + 1);
        appointmentTime.setHours(9, 0, 0, 0);

        await connection.query(
          `INSERT INTO appointments (patient_id, dentist_id, service_id, appointment_time, status, public_note, internal_note)
           VALUES (?, ?, ?, ?, 'confirmed', 'Lịch hẹn demo', 'Khách hàng demo để test hệ thống')`,
          [patientId, dentistId, serviceId, appointmentTime]
        );
      }

      // Seed clinic settings
      await connection.query(
        `INSERT INTO clinic_settings (clinic_name, address, phone, email, working_hours, logo_url)
         VALUES ('Nha khoa Demo', '123 Đường ABC, Quận 1, TP.HCM', '02812345678', 'contact@nhakhoademo.vn', 'Thứ 2 - Thứ 7: 8h00 - 20h00', '/uploads/clinic/logo.svg')`
      );
    }

    // --- Phần seed ca làm việc (shifts) ---
    const [shiftCount] = await connection.query('SELECT COUNT(*) AS count FROM shifts');
    if (shiftCount[0].count === 0) {
      await connection.query(
        `INSERT INTO shifts (name, start_time, end_time, max_appointments_per_dentist, is_active)
         VALUES
         ('Ca sáng', '08:00:00', '11:30:00', 10, 1),
         ('Ca chiều', '13:30:00', '17:30:00', 10, 1)`
      );
    }

    // --- Phần seed lịch trực mẫu (staff_shifts, 7 ngày × 2 ca) ---
    const [staffShiftCount] = await connection.query('SELECT COUNT(*) AS count FROM staff_shifts');
    if (staffShiftCount[0].count === 0) {
      const [dents] = await connection.query('SELECT id FROM dentists LIMIT 1');
      const [shiftRows] = await connection.query('SELECT id FROM shifts WHERE is_active = 1');
      if (dents.length && shiftRows.length) {
        const dentistId = dents[0].id;
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const workDate = d.toISOString().slice(0, 10);
          for (const sh of shiftRows) {
            await connection.query(
              `INSERT IGNORE INTO staff_shifts (dentist_id, shift_id, work_date, status)
               VALUES (?, ?, ?, 'assigned')`,
              [dentistId, sh.id, workDate]
            );
          }
        }
      }
    }

    // --- Phần bổ sung dữ liệu demo phong phú ---
    await enrichDemoData(connection);

    // --- Phần cập nhật đường dẫn ảnh mẫu ---
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-general.jpg'
       WHERE name = 'Khám tổng quát'`
    );
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-cleaning.jpg'
       WHERE name = 'Cạo vôi và đánh bóng'`
    );
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-whitening.jpg'
       WHERE name = 'Tẩy trắng răng'`
    );
    await connection.query(
      `UPDATE dentists SET avatar_url = '/uploads/avatars/dentist-1.jpg'`
    );
    await connection.query(
      `UPDATE clinic_settings SET logo_url = '/uploads/clinic/logo.svg'
       WHERE logo_url IS NULL OR logo_url = '' OR logo_url LIKE '%.png'`
    );

    // --- Phần hết hạn lịch hẹn quá khứ (no_show) ---
    const { expirePastAppointments } = require('../utils/expireAppointments');
    const expired = await expirePastAppointments(connection);
    if (expired > 0) {
      console.log(`Đã cập nhật ${expired} lịch hẹn quá hạn thành không đến (no_show)`);
    }

    console.log('Database initialized and seeded');
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  DB_NAME,
};

