/**
 * FILE_GUIDE: PageTitle.jsx — Đổi document.title theo URL
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_NAME = 'Nha Khoa Dental Clinic';

const ROUTE_TITLES = [
  { prefix: '/admin/login', title: 'Đăng nhập' },
  { prefix: '/admin/appointments', title: 'Lịch hẹn' },
  { prefix: '/admin/patients', title: 'Bệnh nhân' },
  { prefix: '/admin/accounts', title: 'Tài khoản' },
  { prefix: '/admin/dentists', title: 'Bác sĩ' },
  { prefix: '/admin/services-config', title: 'Dịch vụ' },
  { prefix: '/admin/staff-schedules', title: 'Phân ca' },
  { prefix: '/admin/calendar', title: 'Lịch phòng khám' },
  { prefix: '/admin/settings', title: 'Cài đặt' },
  { prefix: '/admin/profile', title: 'Hồ sơ' },
  { prefix: '/admin', title: 'Quản trị' },
  { prefix: '/dat-lich/thanh-cong', title: 'Đặt lịch thành công' },
  { prefix: '/dat-lich', title: 'Đặt lịch' },
  { prefix: '/dich-vu', title: 'Dịch vụ' },
  { prefix: '/bac-si', title: 'Đội ngũ bác sĩ' },
  { prefix: '/tra-cuu', title: 'Tra cứu lịch hẹn' },
  { prefix: '/terms', title: 'Điều khoản' },
  { prefix: '/maintenance', title: 'Bảo trì hệ thống' },
  { prefix: '/403', title: 'Không có quyền' },
  { prefix: '/', title: 'Trang chủ' },
];

function resolveTitle(pathname) {
  const match = ROUTE_TITLES.find(({ prefix }) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match?.title || 'Trang không tồn tại';
}

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = resolveTitle(pathname);
    document.title =
      pathname === '/' ? `${SITE_NAME} — Đặt lịch khám online` : `${page} | ${SITE_NAME}`;
  }, [pathname]);

  return null;
}

export default PageTitle;
