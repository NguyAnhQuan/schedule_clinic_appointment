import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl font-bold text-primary">404</div>
          <div className="text-sm font-semibold text-text-main">Không tìm thấy trang</div>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi. Vui lòng kiểm tra lại URL hoặc
            quay về trang chủ.
          </p>
          <Link
            to="/"
            className="inline-flex items-center rounded-button bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
          >
            Về trang chủ
          </Link>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

export default NotFoundPage;

