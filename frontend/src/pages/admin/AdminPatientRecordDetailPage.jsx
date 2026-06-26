/**
 * FILE_GUIDE: AdminPatientRecordDetailPage.jsx — Chi tiết 1 hồ sơ bệnh án
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminApi, getAuthToken, resolveMediaUrl } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminPatientRecordDetailPage() {
  const navigate = useNavigate();
  const { id, recordId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchedId, setFetchedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ diagnosis: '', treatment: '' });
  const loading = fetchedId !== id;

  async function loadData() {
    setError('');
    try {
      const res = await AdminApi.getPatientRecords(id);
      setData(res);
      setFetchedId(id);
      const record = (res.records || []).find((r) => String(r.id) === String(recordId));
      if (record) {
        setEditForm({
          diagnosis: record.diagnosis || '',
          treatment: record.treatment || '',
        });
      }
    } catch (err) {
      setError(err.message || 'Không tải được hồ sơ bệnh án');
      setFetchedId(id);
    }
  }

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [id, recordId, navigate]);

  const patient = data?.patient;
  const records = data?.records || [];
  const record = records.find((r) => String(r.id) === String(recordId));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await AdminApi.updateMedicalRecord(recordId, editForm);
      setEditing(false);
      setSuccess('Đã cập nhật hồ sơ bệnh án');
      await loadData();
    } catch (err) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Xoá hồ sơ bệnh án này? Thao tác không thể hoàn tác.')) return;
    setSaving(true);
    setError('');
    try {
      await AdminApi.deleteMedicalRecord(recordId);
      navigate(`/admin/patients/${id}/records`);
    } catch (err) {
      setError(err.message || 'Xoá thất bại');
      setSaving(false);
    }
  }

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
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700">
            {success}
          </div>
        )}

        {loading && (
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-3 text-[11px] text-slate-600">
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && !record && (
          <div className="rounded-lg bg-white border border-amber-200 px-3 py-3 text-[11px] text-amber-700">
            Không tìm thấy hồ sơ bệnh án này.
          </div>
        )}

        {patient && record && (
          <>
            <section className="rounded-xl bg-white border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-slate-100 flex items-center justify-center bg-primary/10 text-primary font-semibold text-base">
                  {patient.avatar_url ? (
                    <img
                      src={resolveMediaUrl(patient.avatar_url)}
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
                      Hồ sơ #{record.id}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {record.service_name || '—'} · {record.appointment_time?.replace('T', ' ') || '—'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-[11px] hover:border-primary hover:text-primary"
                  >
                    Sửa hồ sơ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        diagnosis: record.diagnosis || '',
                        treatment: record.treatment || '',
                      });
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-[11px]"
                  >
                    Huỷ sửa
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-[11px] hover:bg-red-200 disabled:opacity-50"
                >
                  Xoá hồ sơ
                </button>
              </div>
            </section>

            <section className="rounded-xl bg-white border border-slate-200 p-4 md:p-5 shadow-sm">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chẩn đoán</label>
                    <textarea
                      value={editForm.diagnosis}
                      onChange={(e) => setEditForm((p) => ({ ...p, diagnosis: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Điều trị</label>
                    <textarea
                      value={editForm.treatment}
                      onChange={(e) => setEditForm((p) => ({ ...p, treatment: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] min-h-[100px]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-[11px] disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </form>
              ) : (
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
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminPatientRecordDetailPage;
