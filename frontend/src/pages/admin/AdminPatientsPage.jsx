/**
 * FILE_GUIDE: AdminPatientsPage.jsx — CRUD bệnh nhân
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken, resolveMediaUrl, toRelativeMediaPath } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 20;

function AdminPatientsPage() {
  const navigate = useNavigate();

  // --- Tìm kiếm & phân trang ---
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE });

  // --- Dữ liệu danh sách & trạng thái tải ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Modal tạo bệnh nhân mới ---
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    note: '',
    avatar_url: '',
  });
  const [uploadingCreateAvatar, setUploadingCreateAvatar] = useState(false);

  // --- Modal sửa bệnh nhân ---
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    note: '',
    avatar_url: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // --- Modal xác nhận xoá ---
  const [deleteId, setDeleteId] = useState(null);

  // --- Mount: kiểm tra token, tải trang 1 danh sách bệnh nhân ---
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Tải danh sách bệnh nhân có phân trang; merge thêm params (q, page).
   * @param {object} [params={}]
   */
  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await AdminApi.getPatients({ page, limit: PAGE_SIZE, ...params });
      setItems(data.data || []);
      setPagination(data.pagination || { total: 0, limit: PAGE_SIZE });
      if (data.pagination?.page) setPage(data.pagination.page);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  }

  /** Submit form tìm kiếm: reset về trang 1 và gọi load với từ khoá q. */
  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load({ q, page: 1 });
  }

  /** Đổi trang phân trang server-side. */
  function handlePageChange(nextPage) {
    setPage(nextPage);
    load({ q, page: nextPage });
  }

  /** Tạo bệnh nhân mới qua API, đóng modal và reload danh sách. */
  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await AdminApi.createPatient(createForm);
      setCreateForm({ full_name: '', phone: '', email: '', note: '', avatar_url: '' });
      setShowCreate(false);
      load({ q });
    } catch (err) {
      setError(err.message || 'Tạo bệnh nhân thất bại');
    } finally {
      setCreating(false);
    }
  }

  /** Mở modal sửa: copy thông tin bệnh nhân vào editForm. */
  function startEdit(p) {
    setEditId(p.id);
    setEditForm({
      full_name: p.full_name || '',
      phone: p.phone || '',
      email: p.email || '',
      note: p.note || '',
      avatar_url: p.avatar_url || '',
    });
  }

  /** Gửi cập nhật thông tin bệnh nhân đang sửa. */
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editId) return;
    setCreating(true);
    setError('');
    try {
      await AdminApi.updatePatient(editId, editForm);
      setEditId(null);
      await load({ q });
    } catch (err) {
      setError(err.message || 'Cập nhật bệnh nhân thất bại');
    } finally {
      setCreating(false);
    }
  }

  /** Upload avatar khi sửa bệnh nhân; cập nhật editForm.avatar_url. */
  async function handleAvatarFileChange(file) {
    if (!file || !editId) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const res = await AdminApi.uploadAvatar(file);
      setEditForm((prev) => ({ ...prev, avatar_url: toRelativeMediaPath(res.path || res.url) }));
    } catch (err) {
      setError(err.message || 'Upload ảnh đại diện thất bại');
    } finally {
      setUploadingAvatar(false);
    }
  }

  /** Upload avatar khi tạo bệnh nhân mới; cập nhật createForm.avatar_url. */
  async function handleCreateAvatarFileChange(file) {
    if (!file) return;
    setUploadingCreateAvatar(true);
    setError('');
    try {
      const res = await AdminApi.uploadAvatar(file);
      setCreateForm((prev) => ({ ...prev, avatar_url: toRelativeMediaPath(res.path || res.url) }));
    } catch (err) {
      setError(err.message || 'Upload ảnh đại diện thất bại');
    } finally {
      setUploadingCreateAvatar(false);
    }
  }

  return (
    <AdminLayout active="patients" title="Patients">
      <div className="space-y-6 text-xs">
        {/* --- Tiêu đề trang & nút thêm bệnh nhân --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Danh sách bệnh nhân</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Tra cứu bệnh nhân theo tên, SĐT hoặc email và mở hồ sơ bệnh án chi tiết.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-[11px] font-medium shadow-sm shadow-primary/30"
          >
            <span className="material-icons text-sm">person_add</span>
            <span>Thêm bệnh nhân</span>
          </button>
        </div>

        {/* --- Form tìm kiếm theo tên/SĐT/email --- */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4"
        >
          <div className="flex-1 relative">
            <span className="material-icons absolute left-3 top-2.5 text-slate-400 text-sm">
              search
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, SĐT hoặc email..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={() => {
                setQ('');
                load();
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-[11px] text-slate-700 hover:border-primary hover:text-primary"
            >
              Xoá lọc
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* --- Bảng danh sách bệnh nhân + phân trang --- */}
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Bệnh nhân
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Liên hệ
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Ghi chú
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Hồ sơ
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
                  items.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => navigate(`/admin/patients/${p.id}/records`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200 overflow-hidden">
                            {p.avatar_url ? (
                              <img
                                src={resolveMediaUrl(p.avatar_url)}
                                alt={p.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (p.full_name || '?')
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join('')
                                .toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {p.full_name || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500">ID: {p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-700">
                        <div>{p.phone || '—'}</div>
                        <div className="text-slate-500">{p.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs truncate">
                        {p.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(p);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary"
                          >
                            <span className="material-icons text-sm">edit</span>
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(p.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            <span className="material-icons text-sm">delete</span>
                            <span>Xoá</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/patients/${p.id}/records`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary"
                        >
                          <span className="material-icons text-sm">folder_shared</span>
                          <span>Hồ sơ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Không có bệnh nhân nào.
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

        {/* Modal tạo bệnh nhân */}
        {showCreate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleCreate}
              className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3 text-[11px]"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-900">Thêm bệnh nhân mới</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center text-slate-500 text-sm font-bold">
                    {createForm.avatar_url ? (
                      <img
                        src={resolveMediaUrl(createForm.avatar_url)}
                        alt={createForm.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (createForm.full_name || '?')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  <label className="w-full text-center cursor-pointer text-primary text-[11px]">
                    Chọn ảnh từ máy
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCreateAvatarFileChange(file);
                      }}
                    />
                  </label>
                  <input
                    value={createForm.avatar_url}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, avatar_url: e.target.value }))
                    }
                    placeholder="Hoặc dán link ảnh..."
                    className="w-40 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  {uploadingCreateAvatar && (
                    <span className="text-[10px] text-slate-500">Đang upload ảnh...</span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Họ tên</label>
                      <input
                        required
                        value={createForm.full_name}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        required
                        value={createForm.phone}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Email (tuỳ chọn)
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
                      <textarea
                        rows={2}
                        value={createForm.note}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-400"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-70"
                    >
                      <span className="material-icons text-sm">
                        {creating ? 'hourglass_top' : 'person_add'}
                      </span>
                      <span>{creating ? 'Đang tạo...' : 'Tạo bệnh nhân'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Modal sửa bệnh nhân */}
        {editId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <form
              onSubmit={handleEditSubmit}
              className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3 text-[11px]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Sửa thông tin bệnh nhân</h2>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center text-slate-500 text-sm font-bold">
                    {editForm.avatar_url ? (
                      <img
                        src={resolveMediaUrl(editForm.avatar_url)}
                        alt={editForm.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (editForm.full_name || '?')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  <label className="w-full text-center cursor-pointer text-primary text-[11px]">
                    Chọn ảnh từ máy
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarFileChange(file);
                      }}
                    />
                  </label>
                  <input
                    value={editForm.avatar_url}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))
                    }
                    placeholder="Hoặc dán link ảnh..."
                    className="w-40 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  {uploadingAvatar && (
                    <span className="text-[10px] text-slate-500">Đang upload ảnh...</span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Họ tên</label>
                      <input
                        required
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Số điện thoại</label>
                      <input
                        required
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
                      <textarea
                        rows={2}
                        value={editForm.note}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-400"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-70"
                    >
                      <span className="material-icons text-sm">
                        {creating ? 'hourglass_top' : 'save'}
                      </span>
                      <span>{creating ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Modal xác nhận xoá bệnh nhân */}
        {deleteId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl text-[11px]">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Xác nhận xoá</h2>
              <p className="text-slate-600 mb-4">
                Bạn có chắc chắn muốn xoá bệnh nhân này? Nếu bệnh nhân đã có lịch hẹn hoặc hồ sơ
                bệnh án thì sẽ không xoá được.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-400"
                  onClick={() => setDeleteId(null)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  onClick={async () => {
                    try {
                      await AdminApi.deletePatient(deleteId);
                      setDeleteId(null);
                      load({ q });
                    } catch (err) {
                      alert(err.message || 'Xoá bệnh nhân thất bại');
                    }
                  }}
                >
                  Xoá
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminPatientsPage;

