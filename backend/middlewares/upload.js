/**
 * FILE_GUIDE: upload.js — Multer cấu hình upload file (avatar, ảnh dịch vụ)
 * Lưu vào thư mục uploads/, trả URL tương đối /uploads/...
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

module.exports = {
  uploadAvatar: avatarUpload.single('file'),
  uploadServiceImage: serviceUpload.single('file'),
  uploadClinicLogo: clinicUpload.single('file'),
};

