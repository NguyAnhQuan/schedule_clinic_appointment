/**
 * FILE_GUIDE: NotFoundPage.jsx — 404
 */
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar minimal />
      <div className="flex-1 flex items-center justify-center px-4">
        {/* Card 404 */}
        <div className="text-center space-y-4 max-w-md w-full">
          <div className="text-5xl md:text-6xl font-extrabold text-primary tracking-tight">
            404
          </div>
          <div className="text-sm md:text-base font-semibold text-text-main">
            Không tìm thấy trang bạn yêu cầu
          </div>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            Đường dẫn bạn truy cập không tồn tại, đã bị thay đổi hoặc hiện không còn được sử dụng.
            Vui lòng kiểm tra lại URL, quay về trang chủ hoặc sử dụng menu để tiếp tục thao tác.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="material-icons text-xs mr-1">arrow_back</span>
            Quay lại trang trước
          </button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export default NotFoundPage;

