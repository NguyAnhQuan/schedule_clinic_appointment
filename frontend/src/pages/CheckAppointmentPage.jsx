import { useState, useEffect } from 'react';
import { PublicApi, AdminApi, getAuthToken, getAuthUser, authHeaders } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã đến',
  in_progress: 'Đang khám',
  completed: 'Hoàn thành',
  canceled: 'Đã huỷ',
  no_show: 'Không đến',
};

function CheckAppointmentPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [rateModal, setRateModal] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [existingRating, setExistingRating] = useState(null);
  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    AdminApi.getMyAppointments()
      .then((data) => setMyAppointments(Array.isArray(data) ? data : []))
      .catch(() => setMyAppointments([]));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!rateModal) return;
    setRatingStars(0);
    setRatingComment('');
    setRatingDone(false);
    setRatingError('');
    PublicApi.getAppointmentRating(rateModal.id)
      .then((r) => setExistingRating(r.rating_stars != null ? r : null))
      .catch(() => setExistingRating(null));
  }, [rateModal]);

  async function handleSubmitRating(e) {
    e.preventDefault();
    if (!rateModal || ratingStars < 1) return;
    setRatingSubmitting(true);
    setRatingError('');
    try {
      const user = getAuthUser();
      const payload = {
        stars: ratingStars,
        comment: ratingComment.trim() || undefined,
        phone: (rateModal.phone || user?.phone || phone || '').trim() || undefined,
      };
      if (!payload.phone) {
        setRatingError('Không có số điện thoại để xác minh. Vui lòng đăng nhập hoặc tra cứu bằng SĐT đặt lịch.');
        setRatingSubmitting(false);
        return;
      }
      const opts = isLoggedIn ? { headers: authHeaders() } : {};
      await PublicApi.submitAppointmentRating(rateModal.id, payload, opts);
      setRatingDone(true);
      setExistingRating({ rating_stars: ratingStars, comment: ratingComment });
      setTimeout(() => setRateModal(null), 1500);
    } catch (err) {
      setRatingError(err.message || 'Gửi đánh giá thất bại');
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await PublicApi.getAppointmentStatus(phone, code);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Không tìm thấy lịch hẹn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
        {/* nền tròn mờ như thiết kế */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-60 h-60 bg-sky-300/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md z-10 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-text-main">Tra cứu lịch hẹn</h1>
            <p className="text-xs text-slate-600">
              Chỉ cần số điện thoại và mã lịch hẹn, bạn có thể xem nhanh trạng thái mới nhất mà
              không cần đăng nhập.
            </p>
          </div>

          {isLoggedIn && myAppointments.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="text-sm font-semibold text-text-main mb-3">
                Lịch hẹn đã đăng ký trên tài khoản của bạn
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {myAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[11px]"
                  >
                    <div>
                      <span className="font-medium">#{a.id}</span>
                      <span className="text-slate-500 ml-2">
                        {a.appointment_time?.replace('T', ' ')}
                      </span>
                      <div className="text-slate-600 mt-0.5">
                        {a.service_name || '—'} • {a.dentist_name || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium text-[10px]">
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                      {a.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            setRateModal({
                              id: a.id,
                              phone: a.patient_phone,
                              service_name: a.service_name,
                            })
                          }
                          className="text-amber-600 hover:text-amber-700 text-[10px] font-medium"
                        >
                          Đánh giá
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-white p-5 shadow-xl border border-slate-100"
          >
            <div className="flex items-center gap-2 text-[11px] text-primary font-medium bg-primary/5 p-2.5 rounded-lg border border-primary/10">
              <span>🔒</span>
              <span>Thông tin được bảo mật. Chỉ hiển thị cho chủ số điện thoại.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Số điện thoại đã đặt lịch *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-button border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                placeholder="VD: 0912345678"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mã lịch hẹn (ID) *
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-button border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                placeholder="VD: 15"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-button bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Đang tra cứu...' : 'Xem trạng thái lịch hẹn'}
            </button>
          </form>

          {result && (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary/20 text-xs text-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text-main">Kết quả tra cứu</div>
                <div className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
                  Trạng thái: {STATUS_LABELS[result.status] || result.status}
                </div>
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between">
                  <span>Mã lịch hẹn</span>
                  <span className="font-medium">#{result.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Họ tên</span>
                  <span className="font-medium">{result.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ</span>
                  <span className="font-medium">{result.service_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời gian</span>
                  <span className="font-medium">
                    {result.appointment_time?.replace('T', ' ') || '—'}
                  </span>
                </div>
              </div>
              {result.status === 'completed' && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setRateModal({
                        id: result.id,
                        phone: result.phone || phone,
                        service_name: result.service_name,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                  >
                    <span className="material-icons text-sm">star</span>
                    Đánh giá trải nghiệm
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Modal đánh giá trải nghiệm */}
          {rateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Đánh giá trải nghiệm</h2>
                  <button
                    type="button"
                    onClick={() => setRateModal(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  Lịch #{rateModal.id} – {rateModal.service_name}
                </p>
                {ratingDone ? (
                  <p className="text-sm text-emerald-600 font-medium">Cảm ơn bạn đã đánh giá!</p>
                ) : existingRating && existingRating.rating_stars != null ? (
                  <div className="text-[11px] text-slate-600">
                    <p className="font-medium text-slate-700">Bạn đã đánh giá:</p>
                    <p className="flex items-center gap-1 mt-1">
                      {'★'.repeat(existingRating.rating_stars)}
                      {'☆'.repeat(5 - existingRating.rating_stars)}
                      <span className="ml-1">({existingRating.rating_stars}/5)</span>
                    </p>
                    {existingRating.comment && (
                      <p className="mt-1 text-slate-500">{existingRating.comment}</p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitRating} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Chọn số sao (1–5) *
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRatingStars(n)}
                            className={`w-9 h-9 rounded-full text-lg transition ${
                              ratingStars >= n
                                ? 'bg-amber-400 text-amber-900'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Nhận xét (tùy chọn)
                      </label>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                        placeholder="Chia sẻ trải nghiệm của bạn..."
                      />
                    </div>
                    {!isLoggedIn && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Số điện thoại đặt lịch (để xác minh) *
                        </label>
                        <input
                          type="tel"
                          value={rateModal.phone || ''}
                          readOnly
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-slate-50"
                        />
                      </div>
                    )}
                    {ratingError && (
                      <div className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
                        {ratingError}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRateModal(null)}
                        className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 text-[11px] font-medium"
                      >
                        Đóng
                      </button>
                      <button
                        type="submit"
                        disabled={ratingSubmitting || ratingStars < 1}
                        className="flex-1 py-2 rounded-lg bg-primary text-white text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        {ratingSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default CheckAppointmentPage;

