import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminAccountsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'staff',
    status: 'active',
    password: '',
  });
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      const data = await AdminApi.getUsers();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await AdminApi.createUser(createForm);
      setCreateForm({ full_name: '', phone: '', email: '', password: '', role: 'staff' });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.message || 'Tạo tài khoản thất bại');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u) {
    setEditId(u.id);
    setEditForm({
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      role: u.role || 'staff',
      status: u.status || 'active',
      password: '',
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editId) return;
    setCreating(true);
    setError('');
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      await AdminApi.updateUser(editId, payload);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message || 'Cập nhật tài khoản thất bại');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    try {
      await AdminApi.deleteUser(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err.message || 'Xoá tài khoản thất bại');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminLayout active="accounts" title="Quản lý tài khoản">
      <div className="space-y-6 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Danh sách tài khoản</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Quản lý tài khoản đăng nhập nội bộ (admin, bác sĩ, nhân viên, khách hàng).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-[11px] font-medium shadow-sm shadow-primary/30"
          >
            <span className="material-icons text-sm">person_add</span>
            <span>Thêm tài khoản</span>
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Họ tên
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Email / SĐT
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Vai trò
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {u.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-700">
                        <div>{u.email || '—'}</div>
                        <div className="text-slate-500">{u.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.status === 'active' ? 'Hoạt động' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary mr-2"
                        >
                          <span className="material-icons text-sm">edit</span>
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(u.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50"
                        >
                          <span className="material-icons text-sm">delete</span>
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Không có tài khoản nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal thêm tài khoản */}
        {showCreate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleCreate}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-900">Thêm tài khoản</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Họ tên *</label>
                <input
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Vai trò</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="dentist">Bác sĩ</option>
                  <option value="staff">Nhân viên</option>
                  <option value="customer">Khách hàng</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                >
                  {creating ? 'Đang tạo...' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal sửa tài khoản */}
        {editId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleEditSubmit}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-900">Sửa tài khoản</h2>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Họ tên *</label>
                <input
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Mật khẩu mới (để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Vai trò</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="dentist">Bác sĩ</option>
                  <option value="staff">Nhân viên</option>
                  <option value="customer">Khách hàng</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tắt</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                >
                  {creating ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal xác nhận xoá */}
        {deleteId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Xác nhận xoá tài khoản</h2>
              <p className="text-[11px] text-slate-600 mb-4">
                Tài khoản đã gắn với bác sĩ thì không thể xoá. Bạn có chắc muốn xoá tài khoản này?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {deleting ? 'Đang xoá...' : 'Xoá'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminAccountsPage;
