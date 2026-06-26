const { getStaffPermissions } = require('../utils/clinicSettings');

function authorizeStaffPermission(permissionKey) {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== 'staff') {
      return next();
    }
    try {
      const perms = await getStaffPermissions();
      if (perms[permissionKey] === false) {
        return res.status(403).json({ message: 'Không có quyền thực hiện thao tác này' });
      }
      return next();
    } catch (err) {
      console.error('authorizeStaffPermission error', err);
      return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
  };
}

module.exports = { authorizeStaffPermission };
