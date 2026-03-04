import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
            ⏱
          </div>
          <h1 className="text-lg font-semibold text-text-main">Hệ thống đang bảo trì</h1>
          <p className="text-xs text-slate-600">
            Chúng tôi đang nâng cấp hệ thống đặt lịch để phục vụ bạn tốt hơn. Vui lòng quay lại sau
            ít phút hoặc đặt lịch trực tiếp qua hotline.
          </p>
          <div className="rounded-2xl bg-bg-light px-4 py-3 text-xs text-slate-700 text-left space-y-1">
            <div>
              Hotline: <span className="font-semibold text-text-main">028 1234 5678</span>
            </div>
            <div>Email: contact@nhakhoademo.vn</div>
            <div>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

export default MaintenancePage;

