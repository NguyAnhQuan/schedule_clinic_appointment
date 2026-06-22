const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'dental_clinic';

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

async function initDatabase() {
  // Đảm bảo database tồn tại bằng một kết nối tạm KHÔNG gắn sẵn database
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

  // Lúc này database đã tồn tại, có thể dùng pool (đã gắn database) an toàn
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

    // Đảm bảo cấu trúc bảng/cột mới tồn tại nếu DB đã tạo từ trước
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

    // Đảm bảo các cột mới tồn tại nếu DB đã tạo từ trước
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

    // Seed minimal data if empty
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
           VALUES (?, '/uploads/avatars/dentist-1.svg', 'Nha khoa tổng quát', 5, 'Bác sĩ nha khoa với kinh nghiệm 5 năm.', 1)`,
          [dentistUsers[0].id]
        );
      }

      // Seed services
      await connection.query(
        `INSERT INTO services (name, description, price, duration_minutes, is_active, thumbnail_url)
         VALUES
         ('Khám tổng quát', 'Khám và tư vấn sức khoẻ răng miệng tổng quát.', 200000, 30, 1, '/uploads/services/service-general.svg'),
         ('Cạo vôi và đánh bóng', 'Làm sạch vôi răng và đánh bóng bề mặt răng.', 400000, 45, 1, '/uploads/services/service-cleaning.svg'),
         ('Tẩy trắng răng', 'Dịch vụ tẩy trắng răng an toàn.', 1500000, 60, 1, '/uploads/services/service-whitening.svg')`
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

    // Seed shifts if empty
    const [shiftCount] = await connection.query('SELECT COUNT(*) AS count FROM shifts');
    if (shiftCount[0].count === 0) {
      await connection.query(
        `INSERT INTO shifts (name, start_time, end_time, max_appointments_per_dentist, is_active)
         VALUES
         ('Ca sáng', '08:00:00', '11:30:00', 10, 1),
         ('Ca chiều', '13:30:00', '17:30:00', 10, 1)`
      );
    }

    // Seed staff_shifts mẫu: 1 bác sĩ trực 7 ngày tới (cả 2 ca) để user có thể đặt lịch ngay
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

    // Bổ sung ảnh mẫu cho dữ liệu đã seed (hoặc DB cũ chưa có ảnh)
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-general.svg'
       WHERE name = 'Khám tổng quát' AND (thumbnail_url IS NULL OR thumbnail_url = '')`
    );
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-cleaning.svg'
       WHERE name = 'Cạo vôi và đánh bóng' AND (thumbnail_url IS NULL OR thumbnail_url = '')`
    );
    await connection.query(
      `UPDATE services SET thumbnail_url = '/uploads/services/service-whitening.svg'
       WHERE name = 'Tẩy trắng răng' AND (thumbnail_url IS NULL OR thumbnail_url = '')`
    );
    await connection.query(
      `UPDATE dentists SET avatar_url = '/uploads/avatars/dentist-1.svg'
       WHERE avatar_url IS NULL OR avatar_url = ''`
    );
    await connection.query(
      `UPDATE clinic_settings SET logo_url = '/uploads/clinic/logo.svg'
       WHERE logo_url IS NULL OR logo_url = ''`
    );

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

