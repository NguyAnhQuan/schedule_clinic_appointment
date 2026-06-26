/**
 * FILE_GUIDE: AdminRouteGuard.jsx — Redirect /admin/login nếu không có token
 */
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken, getAuthUser, getStoredRolePermissions } from '../../services/api';

/**
 * Bảo vệ route /admin/*: kiểm tra token, role và (với staff) quyền chi tiết.
 * Không đủ điều kiện → redirect /403 kèm state.from để biết URL gốc.
 *
 * @param {string[]} allowedRoles - Các role được phép (admin, staff, dentist…)
 * @param {string} [permissionKey] - Key quyền staff trong Settings (vd. 'appointments')
 * @param {React.ReactNode} children - Trang admin cần render
 */
function AdminRouteGuard({ allowedRoles, permissionKey, children }) {
  const location = useLocation();
  const token = getAuthToken();
  const user = getAuthUser();
  const role = user?.role;
  const rolePerms = getStoredRolePermissions();
  const staffPerms = rolePerms?.staff || {};

  // Bước 1: chưa đăng nhập hoặc không có role → 403 (không cho vào admin)
  if (!token || !role) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  // Bước 2: role không nằm trong danh sách route cho phép → 403
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  // Bước 3: staff phải có permissionKey bật trong cấu hình (mặc định true nếu không set false)
  if (role === 'staff' && permissionKey) {
    const allowed = staffPerms[permissionKey] !== false;
    if (!allowed) {
      return <Navigate to="/403" replace state={{ from: location }} />;
    }
  }

  // Đủ điều kiện → render trang con
  return children;
}

export default AdminRouteGuard;

