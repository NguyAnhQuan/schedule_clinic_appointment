/**
 * FILE_GUIDE: BookingSuccessPage.jsx — Màn hình sau khi đặt lịch thành công
 */
import { useParams, Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function BookingSuccessPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-emerald-100 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <span className="text-2xl text-emerald-600">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-text-main">Đặt lịch thành công</h1>
          <p className="text-xs text-slate-600">
            Cảm ơn bạn đã tin tưởng Nha khoa Demo. Phòng khám sẽ liên hệ xác nhận lại lịch hẹn trong
            thời gian sớm nhất.
          </p>
          <div className="rounded-2xl bg-bg-light px-4 py-3 text-left text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Mã lịch hẹn</span>
              <span className="font-semibold text-text-main">#{id}</span>
            </div>
            <div className="flex justify-between">
              <span>Trạng thái</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Đang chờ xác nhận
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <Link
              to="/tra-cuu"
              className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
            >
              Tra cứu trạng thái lịch hẹn
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

export default BookingSuccessPage;

