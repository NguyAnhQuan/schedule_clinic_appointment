import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl bg-white p-6 shadow-xl border border-amber-100 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-xl">
            !
          </div>
          <h1 className="text-lg font-semibold text-text-main">Bạn không có quyền truy cập</h1>
          <p className="text-xs text-slate-600">
            Tài khoản hiện tại không đủ quyền để truy cập khu vực này. Vui lòng đăng nhập bằng tài
            khoản có quyền cao hơn hoặc liên hệ quản trị hệ thống.
          </p>
          <div className="flex flex-col gap-2 text-xs">
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
            >
              Đăng nhập lại
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-button border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

export default ForbiddenPage;

