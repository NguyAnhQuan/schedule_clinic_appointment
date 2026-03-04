import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    AdminApi.getDashboard()
      .then(setData)
      .catch((err) => setError(err.message || 'Không tải được dashboard'));
  }, [navigate]);

  return (
    <AdminLayout active="dashboard" title="Dashboard Overview">
      {/* Stats grid – bám thiết kế admin_dashboard_overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-sm">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-primary">
              <span className="material-icons">people</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="material-icons text-xs">trending_up</span>
              +12%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tổng bệnh nhân</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {data?.total_patients ?? '—'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
              <span className="material-icons">event_available</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="material-icons text-xs">trending_up</span>
              +5%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Lịch hẹn hôm nay</h3>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {data?.today_appointments ?? '—'}
          </p>
          <div className="mt-2 text-xs text-slate-400">
            Tổng lịch hẹn: {data?.total_appointments ?? '—'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
              <span className="material-icons">monitor_heart</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="material-icons text-xs">check_circle</span>
              Stable
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Tình trạng hệ thống</h3>
          <p className="text-base font-semibold text-emerald-600 mt-1">Hoạt động ổn định</p>
        </div>
      </section>

      {/* Widgets ca & phân công (nâng cấp) */}
      {(data?.shifts_today != null || data?.dentists_on_duty != null || data?.fill_rate != null) && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-xs font-medium">Số ca hôm nay</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data?.shifts_today ?? '—'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-xs font-medium">Bác sĩ đang trực</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data?.dentists_on_duty ?? '—'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-xs font-medium">Tỉ lệ lấp đầy ca (%)</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data?.fill_rate ?? 0}%</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-xs font-medium">Bệnh nhân theo ca</h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {(data?.patients_by_shift || []).map((s, i) => (
                <li key={i}>{s.shift_name}: {s.patient_count}</li>
              ))}
              {(!data?.patients_by_shift || data.patients_by_shift.length === 0) && <li>—</li>}
            </ul>
          </div>
        </section>
      )}

      {/* Charts section – chỉ là placeholder UI giống thiết kế */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly visits (cột) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Weekly Visits</h3>
            <button type="button" className="text-slate-400 hover:text-primary">
              <span className="material-icons">more_horiz</span>
            </button>
          </div>
          <div className="h-56 w-full flex items-end justify-between gap-2 px-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, idx) => (
              <div
                // chỉ là chiều cao giả lập
                key={d}
                className="w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-all relative group"
                style={{ height: `${30 + idx * 8}%` }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {d}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 px-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Revenue overview (line giả) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Revenue Overview</h3>
            <div className="flex gap-2">
              <select className="bg-bg-light border-none text-xs rounded text-slate-600 py-1 pl-2 pr-6">
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="h-56 w-full relative">
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300 pointer-events-none">
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-slate-100 w-full" />
            </div>
            <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 100">
              <path
                className="fill-primary/10"
                d="M0 100 L0 60 Q 20 40 40 55 T 80 30 L 100 20 L 100 100 Z"
              />
              <path
                className="stroke-primary"
                d="M0 60 Q 20 40 40 55 T 80 30 L 100 20"
                fill="none"
                strokeLinecap="round"
                strokeWidth="3"
              />
              {[0, 40, 80, 100].map((x, i) => (
                <circle
                  // điểm minh hoạ
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="fill-white stroke-primary stroke-2"
                  cx={x}
                  cy={i === 0 ? 60 : i === 1 ? 55 : i === 2 ? 30 : 20}
                  r="2"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>WK 1</span>
            <span>WK 2</span>
            <span>WK 3</span>
            <span>WK 4</span>
          </div>
        </div>
      </section>

      {/* Upcoming appointments – bảng chi tiết giống thiết kế */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden text-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-lg text-slate-800">Lịch hẹn sắp tới</h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              className="px-3 py-1.5 bg-bg-light text-slate-600 rounded hover:bg-slate-200 transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-slate-500 hover:text-primary transition-colors"
            >
              Ngày mai
            </button>
            <a
              href="/admin/appointments"
              className="ml-2 text-primary hover:underline whitespace-nowrap"
            >
              Xem tất cả
            </a>
          </div>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-y border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Bệnh nhân</th>
                <th className="px-6 py-3 font-semibold">Nha sĩ</th>
                <th className="px-6 py-3 font-semibold">Thời gian</th>
                <th className="px-6 py-3 font-semibold">Dịch vụ</th>
                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                <th className="px-6 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.upcoming_appointments?.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {(a.patient_name || '?')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {a.patient_name || '—'}
                        </div>
                        {a.patient_code && (
                          <div className="text-xs text-slate-500">{a.patient_code}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {a.dentist_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-slate-400 text-sm">schedule</span>
                      <span>{a.appointment_time?.replace('T', ' ') || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {a.service_name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {a.status ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-primary transition-colors"
                      title="Xem chi tiết lịch hẹn"
                    >
                      <span className="material-icons text-lg">edit_note</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.upcoming_appointments?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                    Chưa có lịch hẹn sắp tới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}

export default AdminDashboardPage;

