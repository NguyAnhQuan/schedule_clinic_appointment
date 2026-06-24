import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function HomePage() {
  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      {/* Hero giống layout trong ThietKe/dental_clinic_home */}
      <main className="flex-1">
        <section className="relative pt-16 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 lg:px-8 relative">
            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
              {/* Text */}
              <div className="lg:col-span-6 text-center lg:text-left mb-10 lg:mb-0 relative z-10">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
                  <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                  Nhận bệnh nhân mới mỗi ngày
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-main mb-4 leading-tight">
                  Nụ cười bạn có thể<br />
                  <span className="text-primary relative inline-block">
                    tự tin khoe ra
                  </span>
                </h1>
                <p className="text-sm md:text-base text-slate-600 mb-6 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  Trải nghiệm dịch vụ nha khoa hiện đại, nhẹ nhàng và minh bạch chi phí. Đặt lịch
                  online, theo dõi lịch sử khám và đồng hành cùng bác sĩ riêng cho cả gia đình.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <a
                    href="/dat-lich"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-button text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                  >
                    Đặt lịch ngay
                  </a>
                  <a
                    href="/dich-vu"
                    className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 text-sm font-medium rounded-button text-slate-700 bg-white hover:bg-slate-50 transition-all"
                  >
                    Xem dịch vụ
                  </a>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-500 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                      ★
                    </span>
                    <span>Đánh giá 4.9/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                      24/7
                    </span>
                    <span>Hỗ trợ đặt lịch online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                      ISO
                    </span>
                    <span>Tiêu chuẩn vô trùng</span>
                  </div>
                </div>
              </div>

              {/* Hero image + card giống thiết kế */}
              <div className="lg:col-span-6 relative mt-6 lg:mt-0">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute -bottom-10 -left-16 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-2">
                  <div className="aspect-[4/3] relative rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src="/images/hero-dental.jpg"
                      alt="Bác sĩ nha khoa trong phòng khám hiện đại"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
                      ☺
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-text-main">1.500+ nụ cười hài lòng</p>
                      <p className="text-[11px] text-slate-500">
                        Khách hàng đánh giá 5 sao trên nhiều nền tảng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section dịch vụ khớp style thiết kế (3 card tĩnh) */}
        <section className="py-12 bg-white">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">
                Dịch vụ nha khoa toàn diện
              </h2>
              <p className="text-sm text-slate-600">
                Từ khám tổng quát, cạo vôi – tẩy trắng đến trồng răng, chỉnh nha. Tất cả trong cùng
                một hệ thống, quy trình rõ ràng.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="group p-6 rounded-2xl bg-bg-light border border-transparent hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-150 duration-500" />
                <div className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center mb-4 relative z-10">
                  <span className="text-lg font-semibold">KT</span>
                </div>
                <h3 className="text-base font-semibold text-text-main mb-2 relative z-10">
                  Khám & tư vấn tổng quát
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed relative z-10">
                  Kiểm tra toàn bộ răng miệng, chụp phim (nếu cần) và xây dựng kế hoạch điều trị
                  phù hợp.
                </p>
              </div>

              <div className="group p-6 rounded-2xl bg-bg-light border border-transparent hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-150 duration-500" />
                <div className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center mb-4 relative z-10">
                  <span className="text-lg font-semibold">CX</span>
                </div>
                <h3 className="text-base font-semibold text-text-main mb-2 relative z-10">
                  Cạo vôi, đánh bóng – chăm sóc định kỳ
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed relative z-10">
                  Loại bỏ mảng bám, vôi răng và đánh bóng bề mặt, giúp nướu khỏe và hơi thở dễ chịu.
                </p>
              </div>

              <div className="group p-6 rounded-2xl bg-bg-light border border-transparent hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-150 duration-500" />
                <div className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center mb-4 relative z-10">
                  <span className="text-lg font-semibold">TM</span>
                </div>
                <h3 className="text-base font-semibold text-text-main mb-2 relative z-10">
                  Thẩm mỹ nụ cười
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed relative z-10">
                  Tẩy trắng, dán sứ, chỉnh nha… với công nghệ hiện đại, đảm bảo hài hòa khuôn mặt
                  và chức năng ăn nhai.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

export default HomePage;

