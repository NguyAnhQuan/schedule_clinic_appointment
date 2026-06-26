/**
 * FILE_GUIDE: AdminRouteGuard.jsx — Redirect /admin/login nếu không có token
 */
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken, getAuthUser, getStoredRolePermissions } from '../../services/api';

function AdminRouteGuard({ allowedRoles, permissionKey, children }) {
  const location = useLocation();
  const token = getAuthToken();
  const user = getAuthUser();
  const role = user?.role;
  const rolePerms = getStoredRolePermissions();
  const staffPerms = rolePerms?.staff || {};

  // Không có token hoặc không có user/role hợp lệ -> 403
  if (!token || !role) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  // Nếu là staff và route có gắn permissionKey thì check thêm theo cấu hình trong Settings
  if (role === 'staff' && permissionKey) {
    const allowed = staffPerms[permissionKey] !== false;
    if (!allowed) {
      return <Navigate to="/403" replace state={{ from: location }} />;
    }
  }

  return children;
}

export default AdminRouteGuard;

