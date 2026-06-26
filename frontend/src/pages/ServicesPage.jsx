/**
 * FILE_GUIDE: ServicesPage.jsx — Danh sách dịch vụ có lọc + phân trang
 */
import { useEffect, useState } from 'react';
import { PublicApi, FILE_BASE } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import Pagination from '../components/Pagination';

/** Số dịch vụ mỗi trang — đồng bộ với tham số limit gửi lên API */
const PAGE_SIZE = 8;

/** Trang danh sách dịch vụ công khai — có lọc theo danh mục và phân trang */
function ServicesPage() {
  // Mảng dịch vụ của trang hiện tại
  const [services, setServices] = useState([]);
  // Bộ lọc danh mục: 'all' | 'general' | 'aesthetic' | 'surgery'
  const [activeFilter, setActiveFilter] = useState('all');
  // Trang hiện tại (bắt đầu từ 1)
  const [page, setPage] = useState(1);
  // Metadata phân trang từ API: tổng số bản ghi và limit
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE });
  // true khi đang gọi API
  const [loading, setLoading] = useState(true);
  // Thông báo lỗi nếu API thất bại
  const [error, setError] = useState('');

  // Tải lại danh sách mỗi khi đổi trang hoặc đổi bộ lọc
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    PublicApi.getServices({ page, limit: PAGE_SIZE, category: activeFilter })
      .then((data) => {
        if (!mounted) return;
        // API có thể trả mảng thuần hoặc object { data, pagination }
        if (Array.isArray(data)) {
          setServices(data);
          setPagination({ total: data.length, limit: PAGE_SIZE });
        } else {
          setServices(data.data || []);
          setPagination(data.pagination || { total: 0, limit: PAGE_SIZE });
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được danh sách dịch vụ');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, activeFilter]);

  // Cấu hình các nút lọc danh mục
  const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'general', label: 'Tổng quát' },
    { id: 'aesthetic', label: 'Thẩm mỹ' },
    { id: 'surgery', label: 'Phẫu thuật' },
  ];

  /** Đổi bộ lọc và reset về trang 1 (tránh trang trống sau khi lọc) */
  function handleFilterChange(filterId) {
    setActiveFilter(filterId);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* === HEADER TRANG: tiêu đề và mô tả === */}
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
          {/* === BỘ LỌC DANH MỤC === */}
          <div className="flex flex-wrap justify-center gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
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

          {/* === LƯỚI DỊCH VỤ: loading / error / danh sách === */}
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
              services.map((s) => (
                <article
                  key={s.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-primary/40 transition"
                >
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

          {/* === PHÂN TRANG: truyền page, total, limit và callback setPage === */}
          <Pagination
            page={page}
            total={pagination.total}
            limit={pagination.limit || PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

export default ServicesPage;
