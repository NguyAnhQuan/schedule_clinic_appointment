/**
 * FILE_GUIDE: DentistsPage.jsx — Danh sách bác sĩ, tìm kiếm, modal chi tiết
 */
import { useEffect, useState } from 'react';
import { PublicApi, FILE_BASE } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 9;

function DentistsPage() {
  const [dentists, setDentists] = useState([]);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailFetchedId, setDetailFetchedId] = useState(null);
  const [detailError, setDetailError] = useState('');
  const displayDetail =
    detailId && String(detailFetchedId) === String(detailId) ? detail : null;
  const detailLoading = !!detailId && String(detailFetchedId) !== String(detailId);
  const displayDetailError = detailId ? detailError : '';

  function renderStars(avg = 0) {
    const n = Math.max(0, Math.min(5, Math.round(Number(avg) || 0)));
    return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
  }

  function loadDentists(params = {}) {
    setLoading(true);
    setError('');
    PublicApi.getDentists({ page, limit: PAGE_SIZE, ...params })
      .then((data) => {
        if (Array.isArray(data)) {
          setDentists(data);
          setPagination({ total: data.length, limit: PAGE_SIZE });
        } else {
          setDentists(data.data || []);
          setPagination(data.pagination || { total: 0, limit: PAGE_SIZE });
        }
      })
      .catch((err) => setError(err.message || 'Không tải được danh sách bác sĩ'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDentists({ q, specialty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadDentists({ q, specialty, page: 1 });
  }

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    PublicApi.getDentistDetail(String(detailId))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDetailFetchedId(detailId);
        setDetailError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setDetail(null);
        setDetailFetchedId(detailId);
        setDetailError(err?.message || 'Không tải được thông tin bác sĩ');
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />

      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8 flex-1">
        {/* Header giống thiết kế meet_our_dentists */}
        <section className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-text-main">Đội ngũ bác sĩ</h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Đội ngũ bác sĩ, chuyên gia nhiều năm kinh nghiệm, luôn cập nhật kỹ thuật mới và đặt an
            toàn của bạn lên hàng đầu.
          </p>
        </section>

        {/* Thanh tìm kiếm + bộ lọc */}
        <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tìm kiếm theo tên / email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-2 flex items-center text-slate-400 text-xs">
                  🔍
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="VD: Nguyễn, Trần hoặc email bác sĩ"
                  className="w-full rounded-button border border-slate-200 pl-7 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="w-full md:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">Chuyên khoa</label>
              <select
                value={specialty}
                onChange={(e) => {
                  const next = e.target.value;
                  setSpecialty(next);
                  setPage(1);
                  loadDentists({ q, specialty: next, page: 1 });
                }}
                className="w-full rounded-button border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              >
                <option value="">Tất cả</option>
                <option value="Nha khoa tổng quát">Nha khoa tổng quát</option>
                <option value="Chỉnh nha">Chỉnh nha</option>
                <option value="Thẩm mỹ">Thẩm mỹ nha khoa</option>
                <option value="Phẫu thuật">Phẫu thuật hàm mặt</option>
              </select>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          {loading && <div className="text-sm text-slate-500">Đang tải danh sách bác sĩ...</div>}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {!loading &&
              !error &&
              dentists.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                      {d.avatar_url ? (
                        <img
                          src={FILE_BASE + (d.avatar_url.startsWith('/') ? d.avatar_url : `/${d.avatar_url}`)}
                          alt={d.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        d.full_name?.charAt(0) || 'B'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-text-main">{d.full_name}</div>
                      <div className="text-xs text-slate-500">{d.specialty || 'Nha khoa'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-4">{d.description}</div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    {Number(d.rating_count) > 0 ? (
                      <>
                        <span className="text-amber-600 font-medium">
                          {renderStars(d.avg_rating)}
                        </span>
                        <span className="text-slate-500">
                          {Number(d.avg_rating || 0).toFixed(1)}/5 ({d.rating_count})
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Chưa có đánh giá</span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{d.experience_year ?? 1}+ năm kinh nghiệm</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailId(d.id)}
                        className="rounded-button border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-50"
                      >
                        Xem chi tiết
                      </button>
                      <a
                        href={`/dat-lich?dentistId=${d.id}`}
                        className="rounded-button border border-primary/50 px-3 py-1 text-primary hover:bg-primary/5"
                      >
                        Đặt lịch
                      </a>
                    </div>
                  </div>
                </article>
              ))}
          </div>
          <Pagination
            page={page}
            total={pagination.total}
            limit={pagination.limit || PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>

        {/* Modal chi tiết bác sĩ */}
        {detailId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDetailId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Thông tin chi tiết bác sĩ</h2>
                  <button
                    type="button"
                    onClick={() => setDetailId(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>
                {detailLoading && (
                  <div className="py-8 text-center text-sm text-slate-500">Đang tải...</div>
                )}
                {!detailLoading && displayDetail && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 flex items-center justify-center text-2xl font-semibold text-primary">
                        {displayDetail.avatar_url ? (
                          <img
                            src={FILE_BASE + (displayDetail.avatar_url.startsWith('/') ? displayDetail.avatar_url : `/${displayDetail.avatar_url}`)}
                            alt={displayDetail.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          displayDetail.full_name?.charAt(0) || 'B'
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{displayDetail.full_name}</div>
                        <div className="text-sm text-slate-500">{displayDetail.specialty || 'Nha khoa'}</div>
                        <div className="text-xs text-slate-500">
                          {displayDetail.experience_year ?? 0}+ năm kinh nghiệm
                        </div>
                        {displayDetail.phone && (
                          <div className="text-xs text-slate-600 mt-1">Liên hệ: {displayDetail.phone}</div>
                        )}
                      </div>
                    </div>
                    {displayDetail.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-700 mb-1">Giới thiệu</div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{displayDetail.description}</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-700">Đánh giá</div>
                        {Number(displayDetail.rating_count) > 0 ? (
                          <div className="text-[11px] text-slate-600">
                            <span className="text-amber-600 font-medium">
                              {renderStars(displayDetail.avg_rating)}
                            </span>
                            <span className="ml-2">
                              {Number(displayDetail.avg_rating || 0).toFixed(1)}/5 ({displayDetail.rating_count})
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">Chưa có đánh giá</div>
                        )}
                      </div>

                      {displayDetail.reviews?.length ? (
                        <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                          {displayDetail.reviews.map((r) => (
                            <div
                              key={`${r.appointment_id}-${r.created_at}`}
                              className="rounded-lg bg-white border border-slate-100 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[11px] font-medium text-slate-800">
                                  {r.patient_name || 'Khách hàng'}
                                </div>
                                <div className="text-[11px] text-amber-600 font-medium">
                                  {renderStars(r.rating_stars)}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {r.service_name || 'Dịch vụ'} • Lịch #{r.appointment_id}
                              </div>
                              {r.comment && (
                                <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">
                                  {r.comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2">
                        Các dịch vụ bác sĩ thực hiện
                      </div>
                      {displayDetail.services?.length ? (
                        <ul className="space-y-1.5">
                          {displayDetail.services.map((s) => (
                            <li
                              key={s.id}
                              className="text-xs text-slate-600 flex justify-between items-center rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span>{s.name}</span>
                              {s.duration_minutes && (
                                <span className="text-slate-400">{s.duration_minutes} phút</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500">Chưa gắn dịch vụ cụ thể.</p>
                      )}
                    </div>
                    <div className="pt-2">
                      <a
                        href={`/dat-lich?dentistId=${displayDetail.id}`}
                        className="inline-flex items-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        Đặt lịch với bác sĩ này
                      </a>
                    </div>
                  </div>
                )}
                {!detailLoading && displayDetailError && (
                  <div className="py-6 text-center text-sm text-red-600">{displayDetailError}</div>
                )}
                {!detailLoading && !displayDetail && !displayDetailError && (
                  <div className="py-6 text-center text-sm text-slate-500">
                    Không tải được thông tin.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

export default DentistsPage;

