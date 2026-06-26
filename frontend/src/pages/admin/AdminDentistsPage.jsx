import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken, getAuthUser, FILE_BASE } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/Pagination';
import { DENTIST_SPECIALTIES } from '../../constants/dentistSpecialties';

const PAGE_SIZE = 50;

function AdminDentistsPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const role = authUser?.role;
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    avatar_url: '',
    specialty: '',
    experience_year: '',
    description: '',
    is_active: 1,
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    avatar_url: '',
    specialty: '',
    experience_year: '',
    description: '',
    is_active: 1,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const createAvatarInputRef = useRef(null);
  const editAvatarInputRef = useRef(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE });

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
    loadUsers();
  }, [navigate]);

  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await AdminApi.getDentists({ page, limit: PAGE_SIZE, ...params });
      if (Array.isArray(data)) {
        setItems(data);
        setPagination({ total: data.length, limit: PAGE_SIZE });
      } else {
        setItems(data.data || []);
        setPagination(data.pagination || { total: 0, limit: PAGE_SIZE });
        if (data.pagination?.page) setPage(data.pagination.page);
      }
    } catch (err) {
      setError(err.message || 'Không tải được danh sách bác sĩ');
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    load({ page: nextPage });
  }

  async function loadUsers() {
    try {
      const data = await AdminApi.getUsers();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch {
      setUsers([]);
    }
  }

  const userIdsWithDentist = new Set(items.map((d) => d.user_id));
  const usersWithoutDentist = users.filter((u) => !userIdsWithDentist.has(u.id));

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.specialty) {
      setError('Vui lòng chọn chuyên khoa');
      return;
    }
    if (!createForm.user_id) {
      setError('Vui lòng chọn tài khoản');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await AdminApi.createDentist({
        ...createForm,
        user_id: Number(createForm.user_id),
        experience_year: createForm.experience_year ? Number(createForm.experience_year) : null,
        avatar_url: createForm.avatar_url || undefined,
      });
      setCreateForm({
        user_id: '',
        avatar_url: '',
        specialty: '',
        experience_year: '',
        description: '',
        is_active: 1,
      });
      setShowCreate(false);
      load();
      loadUsers();
    } catch (err) {
      setError(err.message || 'Tạo bác sĩ thất bại');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(d) {
    setEditId(d.id);
    setEditForm({
      avatar_url: d.avatar_url || '',
      specialty: d.specialty || '',
      experience_year: d.experience_year ?? '',
      description: d.description || '',
      is_active: d.is_active ? 1 : 0,
    });
  }

  async function handleAvatarUpload(file, isEdit) {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const data = await AdminApi.uploadAvatar(file);
      const pathToStore = data.path || (data.url && data.url.startsWith('/') ? data.url : '');
      if (!pathToStore) {
        setError('Không nhận được đường dẫn ảnh từ server');
        return;
      }
      if (isEdit) {
        setEditForm((p) => ({ ...p, avatar_url: pathToStore }));
      } else {
        setCreateForm((p) => ({ ...p, avatar_url: pathToStore }));
      }
    } catch (err) {
      setError(err.message || 'Tải ảnh thất bại');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.specialty || !DENTIST_SPECIALTIES.includes(editForm.specialty)) {
      setError('Vui lòng chọn chuyên khoa từ danh sách');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await AdminApi.updateDentist(editId, {
        ...editForm,
        experience_year: editForm.experience_year !== '' ? Number(editForm.experience_year) : null,
        avatar_url: editForm.avatar_url || null,
      });
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message || 'Cập nhật bác sĩ thất bại');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    try {
      await AdminApi.deleteDentist(deleteId);
      setDeleteId(null);
      load();
      loadUsers();
    } catch (err) {
      setError(err.message || 'Xoá bác sĩ thất bại');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminLayout active="dentists" title="Quản lý bác sĩ">
      <div className="space-y-6 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Danh sách bác sĩ</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Quản lý thông tin chuyên môn bác sĩ (gắn với tài khoản hệ thống).
              {!loading && pagination.total > 0 && (
                <span className="ml-1 font-medium text-slate-700">
                  — Tổng {pagination.total} bác sĩ
                </span>
              )}
            </p>
          </div>
          {role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={usersWithoutDentist.length === 0}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-[11px] font-medium shadow-sm shadow-primary/30 disabled:opacity-50"
          >
            <span className="material-icons text-sm">person_add</span>
            <span>Thêm bác sĩ</span>
          </button>
          )}
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
                    Bác sĩ
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Chuyên khoa / Kinh nghiệm
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
                    <td colSpan={4} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{d.full_name || '—'}</div>
                        <div className="text-[11px] text-slate-500">{d.email || ''}</div>
                        <div className="text-[11px] text-slate-500">{d.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-700">
                        <div>{d.specialty || '—'}</div>
                        <div>{d.experience_year != null ? `${d.experience_year} năm` : ''}</div>
                        <div className="line-clamp-2 text-slate-500">{d.description || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {d.is_active ? 'Hoạt động' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary mr-2"
                        >
                          <span className="material-icons text-sm">edit</span>
                          Sửa
                        </button>
                        {role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(d.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            <span className="material-icons text-sm">delete</span>
                            Xoá
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Chưa có bác sĩ. Thêm tài khoản vai trò &quot;Bác sĩ&quot; trước, sau đó gắn vào đây.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={pagination.total}
            limit={pagination.limit || PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Modal thêm bác sĩ */}
        {showCreate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleCreate}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-900">Thêm bác sĩ</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Ảnh đại diện
                </label>
                <div className="flex items-center gap-3">
                  {createForm.avatar_url && (
                    <img
                      src={FILE_BASE + createForm.avatar_url}
                      alt="Avatar"
                      className="h-14 w-14 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <input
                    ref={createAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarUpload(f, false);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setTimeout(() => createAvatarInputRef.current?.click(), 0)}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Đang tải...' : createForm.avatar_url ? 'Đổi ảnh' : 'Chọn ảnh'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Tài khoản (user) *
                </label>
                <select
                  required
                  value={createForm.user_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, user_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn tài khoản —</option>
                  {usersWithoutDentist.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
                {usersWithoutDentist.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Tất cả tài khoản đã gắn bác sĩ. Tạo tài khoản mới (vai trò Bác sĩ) trong Quản lý
                    tài khoản.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Chuyên khoa *
                </label>
                <select
                  value={createForm.specialty}
                  onChange={(e) => setCreateForm((p) => ({ ...p, specialty: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">-- Chọn chuyên khoa --</option>
                  {DENTIST_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Số năm kinh nghiệm
                </label>
                <input
                  type="number"
                  min={0}
                  value={createForm.experience_year}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, experience_year: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={!!createForm.is_active}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))
                  }
                  className="rounded border-slate-300 text-primary"
                />
                <label htmlFor="create-active" className="text-[11px] text-slate-700">
                  Đang hoạt động
                </label>
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
                  disabled={creating || !createForm.user_id}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                >
                  {creating ? 'Đang tạo...' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal sửa bác sĩ */}
        {editId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleEditSubmit}
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-900">Sửa thông tin bác sĩ</h2>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Ảnh đại diện
                </label>
                <div className="flex items-center gap-3">
                  {(editForm.avatar_url || items.find((x) => x.id === editId)?.avatar_url) && (
                    <img
                      src={
                        FILE_BASE +
                        (editForm.avatar_url || items.find((x) => x.id === editId)?.avatar_url || '')
                      }
                      alt="Avatar"
                      className="h-14 w-14 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <input
                    ref={editAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarUpload(f, true);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setTimeout(() => editAvatarInputRef.current?.click(), 0)}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Đang tải...' : 'Đổi ảnh'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Chuyên khoa *
                </label>
                <select
                  value={editForm.specialty}
                  onChange={(e) => setEditForm((p) => ({ ...p, specialty: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">-- Chọn chuyên khoa --</option>
                  {!DENTIST_SPECIALTIES.includes(editForm.specialty) && editForm.specialty ? (
                    <option value={editForm.specialty}>{editForm.specialty} (cần cập nhật)</option>
                  ) : null}
                  {DENTIST_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Số năm kinh nghiệm
                </label>
                <input
                  type="number"
                  min={0}
                  value={editForm.experience_year}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, experience_year: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={!!editForm.is_active}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))
                  }
                  className="rounded border-slate-300 text-primary"
                />
                <label htmlFor="edit-active" className="text-[11px] text-slate-700">
                  Đang hoạt động
                </label>
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
        {deleteId && role === 'admin' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Xác nhận xoá bác sĩ</h2>
              <p className="text-[11px] text-slate-600 mb-4">
                Xoá bác sĩ sẽ bỏ gắn với tài khoản (tài khoản vẫn giữ). Không xoá được nếu đã có
                lịch hẹn/dịch vụ liên quan.
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

export default AdminDentistsPage;
