/**
 * FILE_GUIDE: MaintenancePage.jsx — Trang bảo trì
 */
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar minimal />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {/* Card thông báo bảo trì */}
        <div className="max-w-lg w-full rounded-3xl bg-white p-7 shadow-xl border border-slate-100 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl">
            ⏱
          </div>
          <h1 className="text-xl font-semibold text-text-main">Hệ thống đang bảo trì</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chúng tôi đang thực hiện bảo trì định kỳ để nâng cấp hiệu năng, tăng cường bảo mật và
            cải thiện trải nghiệm đặt lịch. Trong thời gian này bạn tạm thời không thể truy cập hệ
            thống.
          </p>
          <div className="rounded-2xl bg-bg-light px-4 py-3 text-xs text-slate-700 text-left space-y-1 border border-slate-100">
            <div className="font-semibold text-slate-800 mb-1">Liên hệ hỗ trợ đặt lịch:</div>
            <div>
              Hotline:{' '}
              <span className="font-semibold text-text-main tracking-wide">
                028 1234 5678
              </span>
            </div>
            <div>Email: contact@nhakhoademo.vn</div>
            <div>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</div>
          </div>
          <p className="text-[11px] text-slate-400">
            Nếu bạn đang có lịch hẹn trong hôm nay, vui lòng liên hệ trực tiếp qua hotline để được
            xác nhận hoặc thay đổi thời gian.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export default MaintenancePage;

