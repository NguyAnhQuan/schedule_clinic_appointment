import { useEffect, useState } from 'react';
import { PublicApi, FILE_BASE } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function HomePage() {
  const [departments, setDepartments] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    let mounted = true;
    PublicApi.getDentistsByDepartment()
      .then((data) => {
        if (mounted) setDepartments(data.departments || []);
      })
      .catch(() => {
        if (mounted) setDepartments([]);
      })
      .finally(() => {
        if (mounted) setLoadingTeam(false);
      });

    PublicApi.getServices({ page: 1, limit: 6 })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data.data || [];
        setFeaturedServices(list.slice(0, 6));
      })
      .catch(() => {
        if (mounted) setFeaturedServices([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function mediaUrl(url) {
    if (!url) return '';
    return url.startsWith('http') ? url : `${FILE_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="relative pt-16 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 lg:px-8 relative">
            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
              <div className="lg:col-span-6 text-center lg:text-left mb-10 lg:mb-0 relative z-10">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
                  <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                  Nhận bệnh nhân mới mỗi ngày
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-main mb-4 leading-tight">
                  Nụ cười bạn có thể<br />
                  <span className="text-primary relative inline-block">tự tin khoe ra</span>
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
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">★</span>
                    <span>Đánh giá 4.9/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">24/7</span>
                    <span>Hỗ trợ đặt lịch online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">ISO</span>
                    <span>Tiêu chuẩn vô trùng</span>
                  </div>
                </div>
              </div>

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
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">☺</div>
                    <div className="text-xs">
                      <p className="font-semibold text-text-main">1.500+ nụ cười hài lòng</p>
                      <p className="text-[11px] text-slate-500">Khách hàng đánh giá 5 sao trên nhiều nền tảng.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white border-y border-slate-100">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                { value: '12+', label: 'Bác sĩ chuyên khoa' },
                { value: '4', label: 'Khoa điều trị' },
                { value: '6+', label: 'Dịch vụ chuẩn hóa' },
                { value: '98%', label: 'Khách hài lòng' },
              ].map((stat) => (
                <div key={stat.label} className="p-4">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-slate-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-bg-light">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">Dịch vụ nổi bật</h2>
              <p className="text-sm text-slate-600">
                Các gói dịch vụ được chuẩn hóa về thời gian và chi phí, dễ dàng đặt lịch online.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredServices.map((s) => (
                <article
                  key={s.id}
                  className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="text-sm font-semibold text-text-main mb-2">{s.name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-3">{s.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600">
                      {Number(s.price).toLocaleString('vi-VN')}đ
                    </span>
                    <a href={`/dat-lich?serviceId=${s.id}`} className="text-primary hover:underline">
                      Đặt lịch
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center mt-8">
              <a href="/dich-vu" className="text-sm font-medium text-primary hover:underline">
                Xem tất cả dịch vụ →
              </a>
            </div>
          </div>
        </section>

        <section className="py-14 bg-white">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">Đội ngũ bác sĩ theo khoa</h2>
              <p className="text-sm text-slate-600">
                Mỗi khoa có đội ngũ bác sĩ giàu kinh nghiệm, sẵn sàng tư vấn và điều trị cho bạn.
              </p>
            </div>

            {loadingTeam && <div className="text-sm text-slate-500 text-center">Đang tải đội ngũ...</div>}

            <div className="space-y-12">
              {departments.map((dept) => (
                <div key={dept.specialty}>
                  <h3 className="text-lg font-semibold text-text-main mb-4 border-l-4 border-primary pl-3">
                    {dept.specialty}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-5">
                    {(dept.dentists || []).map((d) => (
                      <article
                        key={d.id}
                        className="rounded-2xl border border-slate-100 bg-bg-light p-4 flex gap-3"
                      >
                        <div className="h-14 w-14 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary font-semibold">
                          {d.avatar_url ? (
                            <img src={mediaUrl(d.avatar_url)} alt={d.full_name} className="h-full w-full object-cover" />
                          ) : (
                            d.full_name?.charAt(0) || 'B'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text-main">{d.full_name}</div>
                          <div className="text-xs text-slate-500">{d.experience_year}+ năm kinh nghiệm</div>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-3">{d.description}</p>
                          <a
                            href={`/bac-si?dentistId=${d.id}`}
                            className="inline-block mt-2 text-xs text-primary hover:underline"
                          >
                            Xem hồ sơ
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <a
                href="/bac-si"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-button border border-primary text-sm font-medium text-primary hover:bg-primary/5"
              >
                Xem toàn bộ đội ngũ
              </a>
            </div>
          </div>
        </section>

        <section className="py-14 bg-bg-light">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">Quy trình khám bệnh</h2>
              <p className="text-sm text-slate-600">Minh bạch từng bước, giúp bạn yên tâm khi đến phòng khám.</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Đặt lịch online', desc: 'Chọn dịch vụ, bác sĩ và khung giờ phù hợp.' },
                { step: '02', title: 'Xác nhận lịch', desc: 'Lễ tân gọi xác nhận và nhắc lịch trước ngày khám.' },
                { step: '03', title: 'Khám & điều trị', desc: 'Bác sĩ khám, tư vấn phác đồ và thực hiện dịch vụ.' },
                { step: '04', title: 'Theo dõi sau khám', desc: 'Lưu hồ sơ, hẹn tái khám và hỗ trợ chăm sóc tại nhà.' },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl bg-white p-5 border border-slate-100">
                  <div className="text-primary font-bold text-lg mb-2">{item.step}</div>
                  <h3 className="text-sm font-semibold text-text-main mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-white">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">Khách hàng nói gì</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Chị Mai L.', text: 'Đặt lịch online rất nhanh, bác sĩ tư vấn kỹ và nhẹ tay.' },
                { name: 'Anh Tuấn P.', text: 'Phòng khám sạch sẽ, chi phí minh bạch, không phát sinh bất ngờ.' },
                { name: 'Chị Hương T.', text: 'Con tôi khám răng ở đây rất hợp tác, bác sĩ rất kiên nhẫn.' },
              ].map((t) => (
                <blockquote key={t.name} className="rounded-2xl bg-bg-light p-5 border border-slate-100">
                  <p className="text-xs text-slate-600 italic mb-3">&ldquo;{t.text}&rdquo;</p>
                  <footer className="text-xs font-semibold text-text-main">{t.name}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Sẵn sàng chăm sóc nụ cười của bạn?</h2>
            <p className="text-sm text-white/90 mb-6 max-w-xl mx-auto">
              Đặt lịch ngay hôm nay để được tư vấn miễn phí và chọn khung giờ phù hợp nhất.
            </p>
            <a
              href="/dat-lich"
              className="inline-flex items-center justify-center px-6 py-3 rounded-button bg-white text-primary text-sm font-semibold hover:bg-slate-50"
            >
              Đặt lịch khám ngay
            </a>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

export default HomePage;
