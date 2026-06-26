/**
 * FILE_GUIDE: upload.js — Multer cấu hình upload file (avatar, ảnh dịch vụ)
 * Lưu vào thư mục uploads/, trả URL tương đối /uploads/...
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Tạo cấu hình lưu trữ disk của Multer cho một thư mục con trong `uploads/`.
 * Tự tạo thư mục nếu chưa có; tên file = tên gốc (slug) + timestamp để tránh trùng.
 *
 * @param {string} folder - Tên thư mục con, ví dụ `'avatars'`, `'services'`, `'clinic'`.
 * @returns {import('multer').StorageEngine} Engine lưu file vào `backend/uploads/<folder>/`.
 */
function makeStorage(folder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const uploadPath = path.join(__dirname, '..', 'uploads', folder);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname) || '.jpg';
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
      const unique = Date.now();
      cb(null, `${base}-${unique}${ext}`);
    },
  });
}

const avatarUpload = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const serviceUpload = multer({
  storage: makeStorage('services'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const clinicUpload = multer({
  storage: makeStorage('clinic'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Middleware Multer: nhận một file field `file`, lưu avatar (tối đa 5MB) vào `uploads/avatars/`. */
const uploadAvatar = avatarUpload.single('file');

/** Middleware Multer: nhận một file field `file`, lưu ảnh dịch vụ (tối đa 5MB) vào `uploads/services/`. */
const uploadServiceImage = serviceUpload.single('file');

/** Middleware Multer: nhận một file field `file`, lưu logo phòng khám (tối đa 5MB) vào `uploads/clinic/`. */
const uploadClinicLogo = clinicUpload.single('file');

module.exports = {
  uploadAvatar,
  uploadServiceImage,
  uploadClinicLogo,
};

