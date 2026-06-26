/**
 * FILE_GUIDE: ForbiddenPage.jsx — 403 không có quyền
 */
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar minimal />
      {/* --- Nội dung chính: thông báo 403 --- */}
      <div className="flex-1 flex items-center justify-center px-4">
        {/* Card 403: mã lỗi, mô tả, nút đăng nhập lại / về trang chủ */}
        <div className="max-w-md w-full rounded-3xl bg-white p-7 shadow-xl border border-amber-100 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-2xl font-bold">
            403
          </div>
          <h1 className="text-lg font-semibold text-text-main">Bạn không có quyền truy cập</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tài khoản hiện tại không đủ quyền để truy cập khu vực này. Nếu bạn nghĩ đây là nhầm lẫn,
            vui lòng liên hệ quản trị hệ thống hoặc đăng nhập bằng tài khoản có phân quyền cao hơn.
          </p>
          {/* --- Nhóm nút hành động --- */}
          <div className="flex flex-col sm:flex-row gap-2 text-xs justify-center">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
            >
              <span className="material-icons text-xs mr-1">login</span>
              Đăng nhập lại
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="material-icons text-xs mr-1">home</span>
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export default ForbiddenPage;

