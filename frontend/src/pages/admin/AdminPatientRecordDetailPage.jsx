import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminPatientRecordDetailPage() {
  const navigate = useNavigate();
  const { id, recordId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    AdminApi.getPatientRecords(id)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không tải được hồ sơ bệnh án');
        setLoading(false);
      });
  }, [id, navigate]);

  const patient = data?.patient;
  const records = data?.records || [];
  const record = records.find((r) => String(r.id) === String(recordId));

  return (
    <AdminLayout active="patients" title="Patient Record Detail">
      <div className="space-y-6 text-xs">
        <button
          type="button"
          onClick={() => navigate(`/admin/patients/${id}/records`)}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <span className="material-icons text-xs">chevron_left</span>
          Quay lại lịch sử hồ sơ
        </button>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-3 text-[11px] text-slate-600">
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && !record && (
          <div className="rounded-lg bg-white border border-amber-200 px-3 py-3 text-[11px] text-amber-700">
            Không tìm thấy hồ sơ bệnh án này. Có thể hồ sơ đã bị xoá hoặc đường dẫn không hợp lệ.
          </div>
        )}

        {patient && record && (
          <>
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

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="material-icons text-primary text-sm">assignment</span>
                    Chi tiết hồ sơ khám
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                    Mã hồ sơ: {record.id}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 text-[11px] text-slate-700">
                  <div>
                    <div className="text-slate-500 mb-0.5">Dịch vụ</div>
                    <div className="text-sm text-slate-900">{record.service_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Thời gian lịch hẹn</div>
                    <div>{record.appointment_time?.replace('T', ' ') || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Trạng thái lịch hẹn</div>
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-700">
                      {record.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Ngày tạo hồ sơ</div>
                    <div>{record.created_at?.replace('T', ' ') || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Cập nhật lần cuối</div>
                    <div>{record.updated_at?.replace('T', ' ') || '—'}</div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-slate-500 mb-1 text-[11px] uppercase tracking-wide font-semibold">
                      Chẩn đoán
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-800 min-h-[80px] whitespace-pre-line">
                      {record.diagnosis || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1 text-[11px] uppercase tracking-wide font-semibold">
                      Điều trị
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-800 min-h-[80px] whitespace-pre-line">
                      {record.treatment || '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Tóm tắt</h3>
                  <div className="space-y-2 text-[11px] text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dịch vụ</span>
                      <span className="font-medium text-slate-900 max-w-[160px] text-right line-clamp-2">
                        {record.service_name || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ngày khám</span>
                      <span className="font-medium text-slate-900">
                        {record.appointment_time?.slice(0, 10) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Trạng thái</span>
                      <span className="font-medium text-slate-900">{record.status}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Ghi chú</h3>
                  <p className="text-[11px] text-slate-600">
                    Màn hình này chỉ để xem chi tiết hồ sơ. Chức năng chỉnh sửa nội dung, dental
                    chart và đính kèm X-quang sẽ được bổ sung sau, đúng theo yêu cầu audit log.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminPatientRecordDetailPage;

