import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminPatientRecordsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    AdminApi.getPatientRecords(id)
      .then(setData)
      .catch((err) => setError(err.message || 'Không tải được hồ sơ bệnh án'));
  }, [id, navigate]);

  const patient = data?.patient;
  const records = data?.records || [];

  return (
    <AdminLayout active="patients" title="Patient Medical Records">
      <div className="space-y-6 text-xs">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <span className="material-icons text-xs">chevron_left</span>
          Danh sách bệnh nhân
        </button>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {patient && (
          <section className="rounded-xl bg-white border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-slate-100 flex items-center justify-center bg-primary/10 text-primary font-semibold text-base">
                {patient.avatar_url ? (
                  <img
                    src={patient.avatar_url}
                    alt={patient.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (patient.full_name
                    ?.split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase() || 'BN')
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900">{patient.full_name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-medium">
                    ID: {patient.id}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-xs">call</span>
                    {patient.phone || '—'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-xs">mail</span>
                    {patient.email || '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 max-w-sm">
              <div className="text-slate-400 uppercase tracking-wide font-semibold mb-1">
                Ghi chú hồ sơ
              </div>
              <div className="text-slate-800 line-clamp-3">{patient.note || 'Không có ghi chú.'}</div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: danh sách lần khám dạng timeline nhẹ */}
          <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 md:p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="material-icons text-primary text-sm">history</span>
                Lịch sử khám
              </h2>
            </div>
            <div className="space-y-4">
              {records.map((r) => (
                <div key={r.id} className="relative pl-4 border-l border-slate-200">
                  <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-slate-900">
                      {r.service_name || 'Lần khám'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {r.appointment_time?.replace('T', ' ') || ''}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 text-[11px] text-slate-700 mt-1">
                    <div>
                      <div className="text-slate-500 mb-0.5">Chẩn đoán</div>
                      <div>{r.diagnosis || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">Điều trị</div>
                      <div>{r.treatment || '—'}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/patients/${id}/records/${r.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary"
                    >
                      <span className="material-icons text-sm">open_in_new</span>
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              ))}
              {!records.length && (
                <div className="text-[11px] text-slate-500">Chưa có hồ sơ bệnh án nào.</div>
              )}
            </div>
          </div>

          {/* Cột phải: tóm tắt nhanh */}
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Tổng quan</h3>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 uppercase font-semibold tracking-wide text-[10px]">
                    Số lần khám
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{records.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-slate-500 uppercase font-semibold tracking-wide text-[10px]">
                    Lần gần nhất
                  </div>
                  <div className="text-[11px] text-slate-800 mt-1">
                    {records[0]?.appointment_time?.slice(0, 10) || '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Ghi chú nội bộ</h3>
              <p className="text-[11px] text-slate-600">
                Màn hình chi tiết điều trị, biểu đồ răng (dental chart) và đơn thuốc sẽ được triển
                khai ở phiên bản sau, giống như thiết kế ADMIN.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPatientRecordsPage;

