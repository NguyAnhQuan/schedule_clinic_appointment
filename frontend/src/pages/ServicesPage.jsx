import { useEffect, useState } from 'react';
import { PublicApi, FILE_BASE } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function inferCategory(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('tổng quát') || lower.includes('khám')) return 'general';
  if (lower.includes('tẩy trắng') || lower.includes('thẩm mỹ')) return 'aesthetic';
  if (lower.includes('nhổ') || lower.includes('tiểu phẫu') || lower.includes('phẫu')) return 'surgery';
  return 'other';
}

function ServicesPage() {
  const [services, setServices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    PublicApi.getServices()
      .then((data) => {
        if (mounted) {
          const withCategory = data.map((s) => ({
            ...s,
            category: inferCategory(s.name),
          }));
          setServices(withCategory);
        }
      })
      .catch((err) => {
        setError(err.message || 'Không tải được danh sách dịch vụ');
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'general', label: 'Tổng quát' },
    { id: 'aesthetic', label: 'Thẩm mỹ' },
    { id: 'surgery', label: 'Phẫu thuật' },
  ];

  const displayedServices =
    activeFilter === 'all'
      ? services
      : services.filter((s) => s.category === activeFilter);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header giống thiết kế services_overview */}
        <section className="bg-white border-b border-slate-100 py-10">
          <div className="mx-auto max-w-6xl px-4 lg:px-8 text-center space-y-4">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wide">
              Hệ thống dịch vụ phòng khám
            </span>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-main">
              Tổng quan dịch vụ nha khoa
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
              Từ chăm sóc định kỳ đến điều trị chuyên sâu, các gói dịch vụ được chuẩn hóa rõ ràng về
              thời gian và chi phí, giúp bạn dễ dàng lựa chọn.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 lg:px-8 py-10 space-y-6">
          <div className="flex flex-wrap justify-center gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  activeFilter === f.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {loading && (
              <div className="col-span-full text-sm text-slate-500">Đang tải dịch vụ...</div>
            )}
            {error && (
              <div className="col-span-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {!loading &&
              !error &&
              displayedServices.map((s) => (
                <article
                  key={s.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-primary/40 transition"
                >
                  {/* Ảnh dịch vụ: kích thước cố định (cùng tỷ lệ cho mọi thẻ) */}
                  <div className="w-full h-44 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {s.thumbnail_url ? (
                      <img
                        src={s.thumbnail_url.startsWith('http') ? s.thumbnail_url : `${FILE_BASE}${s.thumbnail_url}`}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-icons text-slate-300 text-6xl">medical_services</span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-text-main">{s.name}</h2>
                        <p className="mt-2 text-xs text-slate-600 line-clamp-3">{s.description}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <div className="font-semibold text-emerald-600">
                          {Number(s.price).toLocaleString('vi-VN')}đ
                        </div>
                        <div className="mt-1 text-slate-500">{s.duration_minutes} phút</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="rounded-full bg-primary/5 px-3 py-1 text-primary">
                        Thủ tục minh bạch
                      </span>
                      <a
                        href={`/dat-lich?serviceId=${s.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Đặt lịch dịch vụ này
                      </a>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

export default ServicesPage;

