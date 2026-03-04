import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã đến',
  in_progress: 'Đang khám',
  completed: 'Hoàn thành',
  canceled: 'Đã huỷ',
  no_show: 'Không đến',
};

function AdminAppointmentsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [dentistFilter, setDentistFilter] = useState('');
  const [items, setItems] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [keyword, setKeyword] = useState('');
  const [actionAppointment, setActionAppointment] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
    AdminApi.getShifts().then((d) => setShifts(Array.isArray(d) ? d : [])).catch(() => setShifts([]));
    AdminApi.getDentists().then((d) => setDentists(Array.isArray(d) ? d : [])).catch(() => setDentists([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams() {
    const p = {};
    if (statusFilter) p.status = statusFilter;
    if (dateFilter) p.date = dateFilter;
    if (shiftFilter) p.shift_id = shiftFilter;
    if (dentistFilter) p.dentist_id = dentistFilter;
    return p;
  }

  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      const q = { ...buildParams(), ...params };
      const data = await AdminApi.getAppointments(q);
      setItems(data.data || []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  }

  async function loadSilent(params = {}) {
    try {
      const q = { ...buildParams(), ...params };
      Object.keys(q).forEach((k) => { if (q[k] === '' || q[k] == null) delete q[k]; });
      const data = await AdminApi.getAppointments(q);
      const list = Array.isArray(data?.data) ? data.data : [];
      setItems(list);
    } catch {
      setItems((prev) => prev.length ? prev : []);
    }
  }

  function handleFilterChange(value) {
    setStatusFilter(value);
    load({ ...buildParams(), status: value || undefined });
  }

  function handleResetFilters() {
    setStatusFilter('');
    setDateFilter('');
    setShiftFilter('');
    setDentistFilter('');
    setKeyword('');
    load();
  }

  return (
    <AdminLayout active="appointments" title="Appointment Management">
      <div className="space-y-6 text-xs">
        {/* Thanh tiêu đề + mô tả ngắn */}
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900">Quản lý lịch hẹn</h1>
          <p className="text-[11px] text-slate-500">
            Xem và lọc tất cả lịch hẹn theo trạng thái, bệnh nhân và dịch vụ.
          </p>
        </div>

        {/* Thanh filter + chế độ xem – lấy cảm hứng từ thiết kế manage_clinic_appointments */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* View toggle (chỉ UI, chưa có lịch dạng calendar) */}
          <div className="bg-slate-100 rounded-lg p-1 flex items-center shadow-inner text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-1.5 rounded-md font-medium ${
                viewMode === 'calendar'
                  ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-md font-medium ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              Table List
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); load({ ...buildParams(), date: e.target.value || undefined }); }}
              className="rounded-lg border border-slate-300 bg-white text-slate-700 py-2 pl-3 pr-3 text-[11px]"
            />
            <div className="relative">
              <select
                value={shiftFilter}
                onChange={(e) => { setShiftFilter(e.target.value); load({ ...buildParams(), shift_id: e.target.value || undefined }); }}
                className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-[11px] cursor-pointer"
              >
                <option value="">Tất cả ca</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span className="absolute right-2 top-2.5 pointer-events-none text-slate-400 material-icons text-sm">expand_more</span>
            </div>
            <div className="relative">
              <select
                value={dentistFilter}
                onChange={(e) => { setDentistFilter(e.target.value); load({ ...buildParams(), dentist_id: e.target.value || undefined }); }}
                className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-[11px] cursor-pointer"
              >
                <option value="">Tất cả bác sĩ</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
              <span className="absolute right-2 top-2.5 pointer-events-none text-slate-400 material-icons text-sm">expand_more</span>
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-[11px] cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option value={k} key={k}>{v}</option>
                ))}
              </select>
              <span className="absolute right-2 top-2.5 pointer-events-none text-slate-400 material-icons text-sm">expand_more</span>
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm bệnh nhân / dịch vụ..."
              className="pl-3 pr-3 py-2 text-[11px] rounded-lg border border-slate-300 bg-white text-slate-700 w-40"
            />
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-600 hover:text-primary bg-white border border-slate-300 rounded-lg"
              onClick={handleResetFilters}
            >
              <span className="material-icons text-sm">filter_list</span>
              Lọc lại
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* Tuỳ viewMode: bảng hoặc lịch dạng đơn giản */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ngày</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ca</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Giờ</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bệnh nhân</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bác sĩ</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dịch vụ</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-[11px] text-slate-500">Đang tải...</td>
                    </tr>
                  )}
                  {!loading &&
                    items
                      .filter((a) => {
                        if (!keyword.trim()) return true;
                        const q = keyword.toLowerCase();
                        return (
                          (a.patient_name || '').toLowerCase().includes(q) ||
                          (a.service_name || '').toLowerCase().includes(q) ||
                          (a.dentist_name || '').toLowerCase().includes(q)
                        );
                      })
                      .map((a) => (
                    <tr key={a.id} className="group hover:bg-primary/5 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {a.appointment_date ? String(a.appointment_date).slice(0, 10) : (a.appointment_time ? String(a.appointment_time).slice(0, 10) : '—')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{a.shift_name || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {a.appointment_time_slot ? String(a.appointment_time_slot).slice(0, 5) : (a.appointment_time ? String(a.appointment_time).slice(11, 16) : '—')}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.patient_name || '—'}</p>
                          <p className="text-[11px] text-slate-500">{a.phone || '—'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{a.dentist_name || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{a.service_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            a.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : a.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : a.status === 'canceled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {STATUS_LABELS[a.status] || a.status || 'Khác'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setActionAppointment(a)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-medium text-slate-700 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                        >
                          <span className="material-icons text-sm">settings</span>
                          Thao tác
                        </button>
                      </td>
                    </tr>
                      ))}
                  {!loading && !items.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-[11px] text-slate-500">Không có lịch hẹn nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Lịch theo ngày (demo)</h2>
              <span className="text-[11px] text-slate-500">
                Hiển thị dựa trên danh sách lịch hẹn hiện tại
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[11px]">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {a.appointment_time?.replace('T', ' ') || '—'}
                    </span>
                    <span className="text-slate-500">{STATUS_LABELS[a.status] || a.status}</span>
                  </div>
                  <div className="text-slate-700">{a.patient_name}</div>
                  <div className="text-slate-500">{a.service_name}</div>
                </div>
              ))}
              {!items.length && (
                <div className="text-[11px] text-slate-500">Không có lịch hẹn nào.</div>
              )}
            </div>
          </div>
        )}

        {/* Modal xác nhận thao tác lịch hẹn */}
        {actionAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Thao tác lịch hẹn</h2>
                <button
                  type="button"
                  onClick={() => { setActionAppointment(null); setUpdating(false); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="space-y-3 text-[11px] text-slate-700 mb-5">
                <p><span className="font-medium">Bệnh nhân:</span> {actionAppointment.patient_name}</p>
                <p><span className="font-medium">Dịch vụ:</span> {actionAppointment.service_name}</p>
                <p><span className="font-medium">Thời gian:</span> {actionAppointment.appointment_time?.replace('T', ' ') || '—'}</p>
                <p><span className="font-medium">Trạng thái hiện tại:</span> {STATUS_LABELS[actionAppointment.status] || actionAppointment.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {actionAppointment.status === 'pending' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await AdminApi.updateAppointmentStatus(actionAppointment.id, 'confirmed');
                        setActionAppointment(null);
                        loadSilent(buildParams());
                      } catch (err) {
                        alert(err.message || 'Không cập nhật được');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-medium hover:bg-emerald-200 disabled:opacity-50"
                  >
                    Xác nhận lịch
                  </button>
                )}
                {['pending', 'confirmed'].includes(actionAppointment.status) && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await AdminApi.updateAppointmentStatus(actionAppointment.id, 'checked_in');
                        setActionAppointment(null);
                        loadSilent(buildParams());
                      } catch (err) {
                        alert(err.message || 'Không cập nhật được');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-sky-100 text-sky-800 text-[11px] font-medium hover:bg-sky-200 disabled:opacity-50"
                  >
                    Đã đến
                  </button>
                )}
                {['confirmed', 'checked_in', 'in_progress'].includes(actionAppointment.status) && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await AdminApi.updateAppointmentStatus(actionAppointment.id, 'in_progress');
                        setActionAppointment(null);
                        loadSilent(buildParams());
                      } catch (err) {
                        alert(err.message || 'Không cập nhật được');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-medium hover:bg-amber-200 disabled:opacity-50"
                  >
                    Đang khám
                  </button>
                )}
                {['checked_in', 'in_progress'].includes(actionAppointment.status) && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await AdminApi.updateAppointmentStatus(actionAppointment.id, 'completed');
                        setActionAppointment(null);
                        loadSilent(buildParams());
                      } catch (err) {
                        alert(err.message || 'Không cập nhật được');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-primary/20 text-primary text-[11px] font-medium hover:bg-primary/30 disabled:opacity-50"
                  >
                    Hoàn thành
                  </button>
                )}
                {!['canceled', 'no_show'].includes(actionAppointment.status) && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={async () => {
                      if (!window.confirm('Bạn có chắc muốn huỷ lịch hẹn này?')) return;
                      setUpdating(true);
                      try {
                        await AdminApi.updateAppointmentStatus(actionAppointment.id, 'canceled');
                        setActionAppointment(null);
                        loadSilent(buildParams());
                      } catch (err) {
                        alert(err.message || 'Không huỷ được');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-[11px] font-medium hover:bg-red-200 disabled:opacity-50"
                  >
                    Huỷ lịch
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminAppointmentsPage;

