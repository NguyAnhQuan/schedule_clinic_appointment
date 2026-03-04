import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminShiftsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null: tạo mới, số: sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', start_time: '08:00', end_time: '11:30', max_appointments_per_dentist: 10, is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
  }, [navigate]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await AdminApi.getShifts();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách ca');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setIsModalOpen(true);
    setForm({ name: '', start_time: '08:00', end_time: '11:30', max_appointments_per_dentist: 10, is_active: true });
  }

  function openEdit(row) {
    setEditing(row.id);
    setIsModalOpen(true);
    setForm({
      name: row.name || '',
      start_time: String(row.start_time).slice(0, 5) || '08:00',
      end_time: String(row.end_time).slice(0, 5) || '11:30',
      max_appointments_per_dentist: row.max_appointments_per_dentist ?? 10,
      is_active: !!row.is_active,
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await AdminApi.updateShift(editing, form);
      } else {
        await AdminApi.createShift(form);
      }
      setEditing(null);
      setIsModalOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="shifts" title="Quản lý ca">
      <div className="space-y-6 text-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-slate-900">Quản lý ca</h1>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white text-xs font-medium hover:bg-primary/90"
          >
            <span className="material-icons text-lg">add</span>
            Thêm ca
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {loading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Tên ca</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Giờ bắt đầu</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Giờ kết thúc</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Max bệnh nhân/ca</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{row.name}</td>
                    <td className="py-3 px-4 text-slate-600">{String(row.start_time).slice(0, 5)}</td>
                    <td className="py-3 px-4 text-slate-600">{String(row.end_time).slice(0, 5)}</td>
                    <td className="py-3 px-4 text-slate-600">{row.max_appointments_per_dentist}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {row.is_active ? 'Bật' : 'Tắt'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-primary hover:underline text-xs"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h3 className="font-semibold text-slate-900 mb-4">{editing ? 'Sửa ca' : 'Thêm ca'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tên ca</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="VD: Ca sáng"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giờ bắt đầu</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giờ kết thúc</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Số bệnh nhân tối đa / bác sĩ / ca</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_appointments_per_dentist}
                    onChange={(e) => setForm((p) => ({ ...p, max_appointments_per_dentist: Number(e.target.value) || 10 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <label htmlFor="is_active" className="text-xs text-slate-600">Bật ca</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditing(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminShiftsPage;
