import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <main className="mx-auto max-w-5xl px-4 py-10 grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] flex-1">
        <aside className="space-y-3">
          <h1 className="text-xl font-semibold text-text-main">Điều khoản & bảo mật</h1>
          <nav className="space-y-1 text-xs text-slate-600">
            <div className="rounded-button bg-primary/10 px-3 py-2 font-medium text-primary">
              1. Giới thiệu
            </div>
            <div className="rounded-button bg-white px-3 py-2 border border-slate-100">
              2. Quyền & nghĩa vụ
            </div>
            <div className="rounded-button bg-white px-3 py-2 border border-slate-100">
              3. Bảo mật dữ liệu
            </div>
          </nav>
        </aside>
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4 text-xs text-slate-700">
          <h2 className="text-sm font-semibold text-text-main">
            1. Mục đích và phạm vi thu thập thông tin
          </h2>
          <p>
            Hệ thống đặt lịch nha khoa được xây dựng nhằm giúp bệnh nhân dễ dàng đặt lịch, quản lý
            lịch sử khám và hỗ trợ phòng khám tối ưu vận hành. Thông tin được thu thập chỉ nhằm mục
            đích khám chữa bệnh và chăm sóc khách hàng.
          </p>
          <h2 className="text-sm font-semibold text-text-main">2. Bảo mật và lưu trữ dữ liệu</h2>
          <p>
            Dữ liệu y tế được lưu trữ trên hệ thống riêng, có phân quyền truy cập cho từng nhóm
            người dùng (admin, bác sĩ, nhân viên). Mọi chỉnh sửa hồ sơ bệnh án đều được ghi nhận
            trong hệ thống log để đảm bảo khả năng truy vết.
          </p>
          <p>
            Người dùng có quyền yêu cầu cập nhật hoặc ẩn một số thông tin liên hệ, tuy nhiên các dữ
            liệu y khoa quan trọng sẽ được lưu trữ theo quy định chuyên môn.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default TermsPage;

