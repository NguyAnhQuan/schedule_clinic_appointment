/**
 * FILE_GUIDE: AdminStaffSchedulesPage.jsx — Xếp lịch trực bác sĩ theo ngày/ca
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken, getAuthUser } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Định dạng nhãn ngày ngắn (Th 2, 26/06) cho lịch trực.
 * @param {string} dateStr — YYYY-MM-DD
 * @returns {string}
 */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Chuyển Date sang chuỗi YYYY-MM-DD theo múi giờ local.
 * @param {Date|string|number} date
 * @returns {string}
 */
function toLocalDateStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function AdminStaffSchedulesPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const role = authUser?.role;

  // --- Tìm kiếm bác sĩ theo tên/chuyên khoa ---
  const [search, setSearch] = useState('');

  // --- Dữ liệu lịch: dates (10 ngày), shifts, assignments, dentists, stats ---
  const [data, setData] = useState({ dates: [], shifts: [], assignments: [], dentists: [], stats: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Modal chỉnh lịch trực 1 bác sĩ (map date|shiftId → checked) ---
  const [editingDentist, setEditingDentist] = useState(null);
  const [modalAssignments, setModalAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  // --- Mount: kiểm tra token, tải lịch phân công ---
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
  }, [navigate]);

  /**
   * Tải lịch phân ca 10 ngày tới; bác sĩ chỉ thấy hồ sơ của chính mình.
   */
  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await AdminApi.getStaffSchedules();
      let dentists = res.dentists || [];

      // Nếu là bác sĩ: chỉ xem và chỉnh sửa ca của chính mình
      if (role === 'dentist' && authUser?.id && Array.isArray(dentists)) {
        const own = dentists.filter((d) => Number(d.user_id) === Number(authUser.id));
        dentists = own;
      }

      setData({
        dates: res.dates || [],
        shifts: res.shifts || [],
        assignments: res.assignments || [],
        dentists,
        stats: res.stats || [],
      });
    } catch (err) {
      setError(err.message || 'Không tải được lịch phân công');
    } finally {
      setLoading(false);
    }
  }

  /** Lấy các assignment đang active (status = assigned) của 1 bác sĩ. */
  function getAssignmentsForDentist(dentistId) {
    return (data.assignments || []).filter(
      (a) => Number(a.dentist_id) === Number(dentistId) && a.status === 'assigned'
    );
  }

  /**
   * Tóm tắt lịch 1 ngày: Off duty | khung giờ ca trực | "Ngày hôm nay" nếu hôm nay và không có ca.
   * @returns {{ label: string, type: 'off'|'on'|'today' }}
   */
  function getSummaryForDay(dentistId, dateStr) {
    const items = getAssignmentsForDentist(dentistId).filter((a) => a.work_date === dateStr);
    if (!items.length) {
      if (dateStr === todayStr) {
        return { label: 'Ngày hôm nay', type: 'today' };
      }
      return { label: 'Off duty', type: 'off' };
    }

    const times = [];
    for (const a of items) {
      const sh = (data.shifts || []).find((s) => Number(s.id) === Number(a.shift_id));
      if (sh) {
        times.push(`${String(sh.start_time).slice(0, 5)}–${String(sh.end_time).slice(0, 5)}`);
      }
    }
    if (!times.length) return { label: 'Off duty', type: 'off' };
    const uniq = Array.from(new Set(times));
    return { label: uniq.join(', '), type: 'on' };
  }

  const todayStr = toLocalDateStr(new Date());

  /** Ngày đã qua (không cho sửa lịch trực). */
  function isPast(dateStr) {
    return dateStr < todayStr;
  }

  /** Ngày hôm nay hoặc quá khứ — khoá chỉnh sửa trong modal. */
  function isLocked(dateStr) {
    return dateStr <= todayStr;
  }

  /** Mở modal: xây map modalAssignments từ assignments hiện tại của bác sĩ. */
  function openEditModal(dentist) {
    if (!data.dates.length) {
      return;
    }
    setEditingDentist(dentist);

    const map = {};
    for (const date of data.dates) {
      for (const sh of data.shifts) {
        const key = `${date}|${sh.id}`;
        const assigned = (data.assignments || []).some(
          (a) =>
            a.work_date === date &&
            Number(a.shift_id) === Number(sh.id) &&
            Number(a.dentist_id) === Number(dentist.id) &&
            a.status === 'assigned'
        );
        map[key] = assigned;
      }
    }
    setModalAssignments(map);
  }

  /** Bật/tắt 1 ô ca trong modal (key = date|shiftId). */
  function toggleModalCell(date, shiftId) {
    const key = `${date}|${shiftId}`;
    setModalAssignments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  /**
   * Lưu thay đổi lịch trực: chỉ gửi payload cho các ô đã đổi (merge dentist_ids theo ca/ngày).
   */
  async function handleSaveSchedule() {
    if (!editingDentist || !data.dates.length || !data.shifts.length) return;
    setSaving(true);
    setError('');
    try {
      const assignmentsPayload = [];

    for (const date of data.dates) {
      if (isPast(date)) continue;
      for (const sh of data.shifts) {
        const key = `${date}|${sh.id}`;
        const shouldHave = !!modalAssignments[key];

        const currentDentists = (data.assignments || [])
          .filter(
            (a) =>
              a.work_date === date &&
              Number(a.shift_id) === Number(sh.id) &&
              a.status === 'assigned'
          )
          .map((a) => a.dentist_id);

        const hasNow = currentDentists.some((id) => Number(id) === Number(editingDentist.id));
        if (shouldHave === hasNow) continue;

        const nextDentists = currentDentists.filter(
          (id) => Number(id) !== Number(editingDentist.id)
        );
        if (shouldHave) {
          nextDentists.push(editingDentist.id);
        }

        assignmentsPayload.push({
          shift_id: sh.id,
          work_date: date,
          dentist_ids: nextDentists,
        });
      }
    }

    if (assignmentsPayload.length) {
      await AdminApi.updateStaffSchedules({ assignments: assignmentsPayload });
    }
      setEditingDentist(null);
      setModalAssignments({});
      await load();
    } catch (err) {
      setError(err.message || 'Lưu lịch trực thất bại');
    } finally {
      setSaving(false);
    }
  }

  /** Bật/tắt trạng thái is_active của bác sĩ (toggle nhanh trên card). */
  async function toggleActive(dentist) {
    try {
      await AdminApi.updateDentist(dentist.id, { is_active: !dentist.is_active });
      await load();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái bác sĩ');
    }
  }

  /** Danh sách bác sĩ sau khi lọc theo search (tên/chuyên khoa). */
  const filteredDentists = useMemo(() => {
    const list = data.dentists || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (d) =>
        String(d.full_name || '').toLowerCase().includes(q) ||
        String(d.specialty || '').toLowerCase().includes(q)
    );
  }, [data.dentists, search]);

  return (
    <AdminLayout active="staff-schedules" title="Quản lý nhân sự & lịch trực">
      <div className="space-y-6 text-sm">
        {/* --- Tiêu đề & ô tìm kiếm bác sĩ --- */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Dentist Management</h1>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý hồ sơ, trạng thái và lịch trực cho 10 ngày làm việc sắp tới.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="material-icons text-slate-400 text-lg absolute left-2 top-1.5">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bác sĩ..."
                className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs w-52"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {/* --- Lưới card bác sĩ hoặc trạng thái đang tải --- */}
        {loading ? (
          <p className="text-slate-500">Đang tải dữ liệu nhân sự và lịch trực...</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredDentists.map((d) => {
              const assignments = getAssignmentsForDentist(d.id);
              const activeDays = new Set(assignments.map((a) => a.work_date));
              const isActive = !!d.is_active;

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="relative">
                        <img
                          src={
                            d.avatar_url ||
                            'https://ui-avatars.com/api/?name=' +
                              encodeURIComponent(d.full_name || 'Dentist') +
                              '&background=137fec&color=ffffff'
                          }
                          alt={d.full_name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-100"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            isActive ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{d.full_name}</h3>
                        <p className="text-sm text-slate-500 mb-2">
                          {d.specialty || 'Nha sĩ'}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          { (d.experience_year || 0) >= 5 ? 'Full-Time' : 'Part-Time' }
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <label className="inline-flex items-center cursor-pointer text-xs gap-2">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isActive}
                          onChange={() => toggleActive(d)}
                        />
                        <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        <span className="text-slate-600 w-24 text-right">
                          {isActive ? 'Đang hoạt động' : 'Tạm tắt'}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => openEditModal(d)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5"
                      >
                        Sửa lịch trực
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className="material-icons text-base text-primary">schedule</span>
                        Lịch làm việc
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {activeDays.size}/
                        {(data.dates || []).length}
                        {' '}ngày có ca trực
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(data.dates || []).map((date) => {
                        const summary = getSummaryForDay(d.id, date);
                        const isOff = summary.type === 'off';
                        const isToday = summary.type === 'today';
                        return (
                          <div
                            key={date}
                            className="flex items-center text-xs"
                          >
                            <div className="w-28 font-medium text-slate-500">
                              {formatDateLabel(date)}
                            </div>
                            <div
                              className={`flex-1 rounded-lg px-3 py-1 ${
                                isToday
                                  ? 'bg-primary/10 text-primary border border-primary/30'
                                  : isOff
                                    ? 'bg-slate-50 text-slate-400 border border-slate-100'
                                    : 'bg-primary/5 text-slate-800 border border-primary/10'
                              }`}
                            >
                              {summary.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {!filteredDentists.length && (
              <div className="col-span-full text-center text-xs text-slate-500 py-8">
                Không tìm thấy bác sĩ phù hợp với bộ lọc.
              </div>
            )}
          </div>
        )}

        {/* --- Modal chỉnh lịch trực theo ngày/ca --- */}
        {editingDentist && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Chỉnh sửa lịch trực</h3>
              <p className="text-xs text-slate-500 mb-4">
                {editingDentist.full_name} · 10 ngày làm việc sắp tới
              </p>
              <div className="text-[11px] text-slate-500 mb-2">
                Chọn ca mà bác sĩ sẽ trực cho từng ngày trong tuần. Những ngày đã qua sẽ không thể chỉnh sửa.
              </div>
              <div className="max-h-72 overflow-y-auto text-xs space-y-3">
                {(data.dates || []).map((date) => (
                  <div key={date} className="border border-slate-100 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">
                        {formatDateLabel(date)}
                      </span>
                      {isLocked(date) && (
                        <span className="text-[10px] text-slate-400">Đã qua</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(data.shifts || []).map((sh) => {
                        const key = `${date}|${sh.id}`;
                        const checked = !!modalAssignments[key];
                        const disabled = isLocked(date);
                        return (
                          <button
                            key={sh.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleModalCell(date, sh.id)}
                            className={`px-2.5 py-1 rounded-full border text-[11px] ${
                              disabled
                                ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                                : checked
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:bg-primary/5'
                            }`}
                          >
                            {sh.name}{' '}
                            <span className="text-[9px] text-slate-400">
                              {String(sh.start_time).slice(0, 5)}-{String(sh.end_time).slice(0, 5)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDentist(null);
                    setModalAssignments({});
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
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

export default AdminStaffSchedulesPage;
