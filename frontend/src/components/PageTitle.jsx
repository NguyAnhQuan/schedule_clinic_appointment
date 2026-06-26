/**
 * FILE_GUIDE: PageTitle.jsx — Đổi document.title theo URL
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Tên site hiển thị trong thẻ <title> của trình duyệt */
export const SITE_NAME = 'Nha Khoa Dental Clinic';

/**
 * Bảng ánh xạ prefix URL → tiêu đề trang.
 * Thứ tự quan trọng: route cụ thể (vd. /admin/login) phải đứng trước route cha (/admin).
 */
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

/**
 * Tìm tiêu đề phù hợp với pathname hiện tại.
 * Route '/' chỉ khớp chính xác; các route khác khớp exact hoặc prefix (pathname bắt đầu bằng prefix/).
 */
function resolveTitle(pathname) {
  const match = ROUTE_TITLES.find(({ prefix }) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match?.title || 'Trang không tồn tại';
}

/**
 * Component vô hình — chỉ cập nhật document.title khi URL đổi.
 * Không render gì ra DOM (return null).
 */
function PageTitle() {
  // Lấy pathname từ React Router — tự cập nhật khi navigate
  const { pathname } = useLocation();

  // Mỗi khi pathname thay đổi, đặt lại tiêu đề tab trình duyệt
  useEffect(() => {
    const page = resolveTitle(pathname);
    // Trang chủ dùng format đặc biệt; các trang khác: "Tiêu đề | Tên site"
    document.title =
      pathname === '/' ? `${SITE_NAME} — Đặt lịch khám online` : `${page} | ${SITE_NAME}`;
  }, [pathname]);

  return null;
}

export default PageTitle;
