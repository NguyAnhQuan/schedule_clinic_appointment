/**
 * FILE_GUIDE: AdminCalendarPage.jsx — Lịch tổng quan theo tháng
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken, getAuthUser } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function toLocalDateStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthRange(date) {
  const d = new Date(date);
  d.setDate(1);
  const firstDay = toLocalDateStr(d);
  const last = new Date(d);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);
  const lastDay = toLocalDateStr(last);
  return { from: firstDay, to: lastDay };
}

function formatMonthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

function AdminCalendarPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const role = authUser?.role;
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    today.setDate(1);
    return toLocalDateStr(today);
  });
  const [days, setDays] = useState([]);
  const [openOverrideDates, setOpenOverrideDates] = useState([]);
  const [closedOverrideDates, setClosedOverrideDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalDate, setModalDate] = useState(null);
  const [modalStatus, setModalStatus] = useState('open');
  const [modalNote, setModalNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
  }, [navigate, currentMonth]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { from, to } = getMonthRange(currentMonth);
      const res = await AdminApi.getCalendarOverview({ from, to });
      setDays(res.days || []);
      setOpenOverrideDates(res.open_override_dates || []);
      setClosedOverrideDates(res.closed_override_dates || []);
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu lịch');
    } finally {
      setLoading(false);
    }
  }

  const monthDate = new Date(currentMonth);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = toLocalDateStr(new Date());
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const openOverrideSet = new Set(openOverrideDates);
  const closedOverrideSet = new Set(closedOverrideDates);

  function getDayInfo(dateStr) {
    return dayMap.get(dateStr);
  }

  function isClosedDate(dateStr) {
    if (openOverrideSet.has(dateStr)) return false;
    if (closedOverrideSet.has(dateStr)) return true;
    // Mặc định: ngày mở cửa, chỉ đóng khi có cấu hình trong working_days
    return false;
  }

  function getDayStatus(dateStr) {
    // Chỉ coi là "closed" khi có cấu hình ngày nghỉ
    if (isClosedDate(dateStr)) return 'closed';

    const info = getDayInfo(dateStr);
    if (!info) return 'open';

    // Nếu chưa có cấu hình sức chứa, coi như ngày mở nhưng "chưa có lịch"
    if (!info.capacity || info.capacity <= 0) {
      return 'open';
    }

    const ratio = (info.booked || 0) / info.capacity;
    if ((info.booked || 0) >= info.capacity) return 'full';
    if (ratio > 0.5) return 'busy';
    if (ratio > 0) return 'filling';
    return 'open';
  }

  function getNoteSnippet(info) {
    if (!info || !info.note) return '';
    const raw = String(info.note).trim();
    if (!raw) return '';
    const maxLen = 20;
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen - 1)}…`;
  }

  function getBadgeClass(dateStr) {
    const status = getDayStatus(dateStr);
    if (dateStr < todayStr) {
      return 'bg-slate-100 text-slate-600 border-slate-300';
    }
    switch (status) {
      case 'full':
        return 'bg-red-500 text-white border-red-600';
      case 'busy':
        return 'bg-emerald-200 text-emerald-900 border-emerald-500';
      case 'filling':
        return 'bg-amber-200 text-amber-900 border-amber-500';
      case 'open':
        return 'bg-primary/15 text-primary border-primary/50';
      default:
        // Ngày nghỉ: hiển thị tối màu (gần màu đen)
        return 'bg-slate-900 text-white border-slate-900';
    }
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  function changeMonth(delta) {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + delta);
    d.setDate(1);
    setCurrentMonth(toLocalDateStr(d));
  }

  async function handleClickDate(day) {
    if (!day) return;
    const dateStr = toLocalDateStr(new Date(year, month, day));
    // Chỉ admin + staff mới được chỉnh, và chỉ cho các ngày sau hôm nay
    if (role === 'dentist' || dateStr <= todayStr) return;
    const isClosed = isClosedDate(dateStr);
    setModalDate(dateStr);
    setModalStatus(isClosed ? 'closed' : 'open');
    setModalNote('');
  }

  async function handleSaveDay() {
    if (!modalDate) return;
    try {
      setSaving(true);
      await AdminApi.updateWorkingDay(modalDate, modalStatus, modalNote || undefined);
      setModalDate(null);
      setModalNote('');
      await load();
    } catch (err) {
      // hiển thị lỗi chung trên banner
      setError(err.message || 'Không thể cập nhật lịch hoạt động ngày này');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="calendar" title="Quản lý lịch (Calendar)">
      <div className="space-y-6 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Quản lý lịch</h1>
            <p className="text-xs text-slate-500">
              Xem nhanh các ngày mở cửa, số bác sĩ trực và mức độ lấp đầy lịch hẹn trong tháng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <span className="material-icons text-base">chevron_left</span>
            </button>
            <div className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
              {formatMonthLabel(currentMonth)}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <span className="material-icons text-base">chevron_right</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-400 mb-3">
            <span>Th 2</span>
            <span>Th 3</span>
            <span>Th 4</span>
            <span>Th 5</span>
            <span>Th 6</span>
            <span>Th 7</span>
            <span>CN</span>
          </div>
          {loading ? (
            <p className="text-slate-500 text-sm">Đang tải...</p>
          ) : (
            <div className="grid grid-cols-7 gap-2 text-xs">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }
                const dateStr = toLocalDateStr(new Date(year, month, day));
                const info = getDayInfo(dateStr);
                const badgeClass = getBadgeClass(dateStr);
                const isToday = dateStr === todayStr;
                const status = getDayStatus(dateStr);
                const noteSnippet = getNoteSnippet(info);
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleClickDate(day)}
                    className={`aspect-square w-full rounded-xl border text-left flex flex-col justify-between p-1.5 ${
                      dateStr < todayStr ? 'cursor-default' : 'hover:border-primary/60 hover:shadow-sm'
                    } ${badgeClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-semibold ${isToday ? 'underline' : ''}`}>
                        {day}
                      </span>
                      {info && (
                        <span className="text-[9px] font-semibold">
                          {info.dentists_on_duty || 0} BS
                        </span>
                      )}
                    </div>
                    {noteSnippet && (
                      <div className="mt-1 text-[9px] leading-tight text-center font-medium">
                        {noteSnippet}
                      </div>
                    )}
                    <div className="mt-1 text-[9px] leading-tight">
                      {status === 'closed' ? (
                        <span>Đóng cửa</span>
                      ) : info && info.capacity > 0 ? (
                        <span>
                          {info.booked}/{info.capacity} slot
                        </span>
                      ) : (
                        <span>Chưa có lịch</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-primary/15 border border-primary/50" />
            <span>Ngày mở (còn nhiều slot)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100" />
            <span>Ngày bận (đã đặt &gt; 50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-200 border border-red-400" />
            <span>Ngày đầy slot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-100 border border-slate-300" />
            <span>Ngày đã qua</span>
          </div>
        </div>

        {modalDate && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Chỉnh sửa trạng thái ngày</h3>
              <p className="text-xs text-slate-500 mb-4">
                Ngày {modalDate}
              </p>
              <div className="space-y-3 text-xs">
                <fieldset>
                  <legend className="mb-2 font-medium text-slate-700">Trạng thái</legend>
                  <label className="flex items-center gap-2 mb-1 cursor-pointer">
                    <input
                      type="radio"
                      name="day-status"
                      checked={modalStatus === 'open'}
                      onChange={() => setModalStatus('open')}
                    />
                    <span>Mở cửa (nhận lịch hẹn)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="day-status"
                      checked={modalStatus === 'closed'}
                      onChange={() => setModalStatus('closed')}
                    />
                    <span>Đóng cửa (nghỉ / bảo trì)</span>
                  </label>
                </fieldset>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ghi chú (tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Ví dụ: Nghỉ lễ, bảo trì hệ thống..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setModalDate(null);
                    setModalNote('');
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveDay}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminCalendarPage;

