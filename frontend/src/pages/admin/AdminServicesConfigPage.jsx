import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, getAuthToken, FILE_BASE } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminServicesConfigPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: 30,
    is_active: 1,
    thumbnail_url: '',
    dentist_ids: [],
  });
  const [dentists, setDentists] = useState([]);
  const [uploadingImageId, setUploadingImageId] = useState(null);
  const [editService, setEditService] = useState(null);
  const [deleteServiceId, setDeleteServiceId] = useState(null);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    AdminApi.getServicesConfig()
      .then(setItems)
      .catch((err) => setError(err.message || 'Không tải được danh sách dịch vụ'));
    AdminApi.getDentists()
      .then((data) => setDentists(Array.isArray(data) ? data : []))
      .catch(() => setDentists([]));
  }, [navigate]);

  function mediaUrl(url) {
    if (!url) return '';
    return url.startsWith('http') ? url : `${FILE_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await AdminApi.createService({
        ...newService,
        price: newService.price,
        duration_minutes: newService.duration_minutes,
        dentist_ids: newService.dentist_ids || [],
      });
      setNewService({
        name: '',
        description: '',
        price: '',
        duration_minutes: 30,
        is_active: 1,
        thumbnail_url: '',
        dentist_ids: [],
      });
      AdminApi.getServicesConfig()
        .then(setItems)
        .catch((err) => setError(err.message || 'Không tải được danh sách dịch vụ'));
    } catch (err) {
      setError(err.message || 'Tạo dịch vụ thất bại');
    } finally {
      setCreating(false);
    }
  }

  async function handleServiceImageUpload(file, serviceId) {
    if (!file) return;
    setUploadingImageId(serviceId || 'new');
    setError('');
    try {
      const res = await AdminApi.uploadServiceImage(file);
      if (serviceId) {
        setItems((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, thumbnail_url: res.url } : s))
        );
        setEditService((prev) =>
          prev && prev.id === serviceId ? { ...prev, thumbnail_url: res.url } : prev
        );
      } else {
        setNewService((prev) => ({ ...prev, thumbnail_url: res.url }));
      }
    } catch (err) {
      setError(err.message || 'Upload ảnh dịch vụ thất bại');
    } finally {
      setUploadingImageId(null);
    }
  }

  return (
    <AdminLayout active="services" title="Service Configuration">
      <div className="space-y-6 text-xs">
        {/* Header giống thiết kế clinic_service_configuration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center text-[11px] text-slate-500 gap-1 mb-1">
              <span>Settings</span>
              <span className="material-icons text-[14px]">chevron_right</span>
              <span className="text-slate-900 font-medium">Services</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Service Configuration</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Chỉnh sửa tên, mô tả, giá và thời lượng cho từng dịch vụ nha khoa.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-[11px] font-medium shadow-sm shadow-primary/30"
            onClick={() => setShowCreate(true)}
          >
            <span className="material-icons text-sm">add</span>
            <span>Thêm dịch vụ</span>
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* Bảng cấu hình dịch vụ – style sát thiết kế */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-1/3">
                    Dịch vụ
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Giá
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Thời lượng (phút)
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-4 py-3 text-[11px] text-slate-900">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {s.thumbnail_url ? (
                            <img
                              src={mediaUrl(s.thumbnail_url)}
                              alt={s.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="material-icons text-slate-400 text-lg">
                              medical_services
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">
                            {s.description}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Bác sĩ: {(s.dentist_ids || []).length
                              ? dentists.filter((d) => (s.dentist_ids || []).includes(d.id)).map((d) => d.full_name).join(', ') || '—'
                              : 'Chưa gắn'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-900 align-top">
                      <div className="text-sm text-slate-800">
                        {Number(s.price || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-900 align-top">
                      <div className="text-sm text-slate-800">{s.duration_minutes} phút</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-900 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            s.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                          {s.is_active ? 'Đang dùng' : 'Tạm ẩn'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditService(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:border-primary hover:text-primary"
                        >
                          <span className="material-icons text-sm">edit</span>
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteServiceId(s.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50"
                        >
                          <span className="material-icons text-sm">delete</span>
                          <span>Xoá</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-[11px] text-slate-500">
                      Không có dịch vụ nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      {/* Modal sửa dịch vụ */}
      {editService && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSavingId(editService.id);
              setError('');
              try {
                await AdminApi.updateService(editService.id, {
                  name: editService.name,
                  description: editService.description,
                  price: editService.price,
                  duration_minutes: editService.duration_minutes,
                  is_active: editService.is_active,
                  thumbnail_url: editService.thumbnail_url || null,
                  dentist_ids: editService.dentist_ids || [],
                });
                setEditService(null);
                AdminApi.getServicesConfig()
                  .then(setItems)
                  .catch((err) => setError(err.message || 'Không tải được danh sách dịch vụ'));
              } catch (err) {
                setError(err.message || 'Lưu dịch vụ thất bại');
              } finally {
                setSavingId(null);
              }
            }}
            className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3 text-[11px]"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900">Sửa dịch vụ</h2>
              <button
                type="button"
                onClick={() => setEditService(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-icons text-sm">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                  {editService.thumbnail_url ? (
                    <img
                      src={mediaUrl(editService.thumbnail_url)}
                      alt={editService.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-icons text-slate-400 text-lg">medical_services</span>
                  )}
                </div>
                <label className="text-primary cursor-pointer text-[11px] inline-flex items-center gap-1">
                  <span className="material-icons text-xs">upload</span>
                  <span>Chọn ảnh từ máy</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleServiceImageUpload(file, editService.id);
                    }}
                  />
                </label>
                <input
                  value={editService.thumbnail_url || ''}
                  onChange={(e) =>
                    setEditService((prev) => ({ ...prev, thumbnail_url: e.target.value }))
                  }
                  placeholder="Hoặc dán link ảnh..."
                  className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                {uploadingImageId === editService.id && (
                  <div className="text-[10px] text-slate-500 mt-0.5">Đang upload ảnh...</div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Tên dịch vụ
                  </label>
                  <input
                    required
                    value={editService.name}
                    onChange={(e) =>
                      setEditService((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    rows={2}
                    value={editService.description || ''}
                    onChange={(e) =>
                      setEditService((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Giá (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={editService.price}
                      onChange={(e) =>
                        setEditService((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Thời lượng (phút)
                    </label>
                    <input
                      type="number"
                      value={editService.duration_minutes}
                      onChange={(e) =>
                        setEditService((prev) => ({ ...prev, duration_minutes: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={Boolean(editService.is_active)}
                      onChange={(e) =>
                        setEditService((prev) => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))
                      }
                      className="h-3 w-3 rounded border-slate-400 text-primary focus:ring-primary/40"
                    />
                    <span className="text-[11px] text-slate-700">Đang sử dụng</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bác sĩ thực hiện dịch vụ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dentists.map((d) => (
                      <label key={d.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editService.dentist_ids || []).includes(d.id)}
                          onChange={(e) => {
                            const ids = editService.dentist_ids || [];
                            setEditService((prev) => ({
                              ...prev,
                              dentist_ids: e.target.checked
                                ? [...ids, d.id]
                                : ids.filter((id) => id !== d.id),
                            }));
                          }}
                          className="h-3 w-3 rounded border-slate-400 text-primary"
                        />
                        <span className="text-[11px] text-slate-700">{d.full_name}</span>
                      </label>
                    ))}
                    {!dentists.length && (
                      <span className="text-[11px] text-slate-500">Chưa có bác sĩ trong hệ thống</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditService(null)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-400"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={savingId === editService.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-70"
                  >
                    <span className="material-icons text-sm">
                      {savingId === editService.id ? 'hourglass_top' : 'save'}
                    </span>
                    <span>{savingId === editService.id ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal tạo dịch vụ mới */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-5 shadow-xl space-y-3 text-[11px]"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900">Thêm dịch vụ mới</h2>
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
                <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                  {newService.thumbnail_url ? (
                    <img
                      src={mediaUrl(newService.thumbnail_url)}
                      alt={newService.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-icons text-slate-400 text-lg">medical_services</span>
                  )}
                </div>
                <label className="text-primary cursor-pointer text-[11px] inline-flex items-center gap-1">
                  <span className="material-icons text-xs">upload</span>
                  <span>Chọn ảnh từ máy</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleServiceImageUpload(file, null);
                    }}
                  />
                </label>
                <input
                  value={newService.thumbnail_url}
                  onChange={(e) =>
                    setNewService((prev) => ({ ...prev, thumbnail_url: e.target.value }))
                  }
                  placeholder="Hoặc dán link ảnh..."
                  className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                {uploadingImageId === 'new' && (
                  <div className="text-[10px] text-slate-500 mt-0.5">Đang upload ảnh...</div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Tên dịch vụ
                  </label>
                  <input
                    required
                    value={newService.name}
                    onChange={(e) =>
                      setNewService((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    rows={2}
                    value={newService.description}
                    onChange={(e) =>
                      setNewService((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Giá (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={newService.price}
                      onChange={(e) =>
                        setNewService((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Thời lượng (phút)
                    </label>
                    <input
                      type="number"
                      value={newService.duration_minutes}
                      onChange={(e) =>
                        setNewService((prev) => ({
                          ...prev,
                          duration_minutes: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={Boolean(newService.is_active)}
                      onChange={(e) =>
                        setNewService((prev) => ({
                          ...prev,
                          is_active: e.target.checked ? 1 : 0,
                        }))
                      }
                      className="h-3 w-3 rounded border-slate-400 text-primary focus:ring-primary/40"
                    />
                    <span className="text-[11px] text-slate-700">Đang sử dụng</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bác sĩ thực hiện dịch vụ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dentists.map((d) => (
                      <label key={d.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(newService.dentist_ids || []).includes(d.id)}
                          onChange={(e) => {
                            const ids = newService.dentist_ids || [];
                            setNewService((prev) => ({
                              ...prev,
                              dentist_ids: e.target.checked
                                ? [...ids, d.id]
                                : ids.filter((id) => id !== d.id),
                            }));
                          }}
                          className="h-3 w-3 rounded border-slate-400 text-primary"
                        />
                        <span className="text-[11px] text-slate-700">{d.full_name}</span>
                      </label>
                    ))}
                    {!dentists.length && (
                      <span className="text-[11px] text-slate-500">Chưa có bác sĩ trong hệ thống</span>
                    )}
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
                      {creating ? 'hourglass_top' : 'add'}
                    </span>
                    <span>{creating ? 'Đang tạo...' : 'Thêm dịch vụ'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal xác nhận xoá dịch vụ */}
      {deleteServiceId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-xl text-[11px]">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Xác nhận xoá dịch vụ</h2>
            <p className="text-slate-600 mb-4">
              Bạn có chắc chắn muốn xoá dịch vụ này? Nếu dịch vụ đang được dùng trong lịch hẹn hoặc
              hồ sơ thì sẽ không xoá được.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-400"
                onClick={() => setDeleteServiceId(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  try {
                    await AdminApi.deleteService(deleteServiceId);
                    setDeleteServiceId(null);
                    AdminApi.getServicesConfig()
                      .then(setItems)
                      .catch((err) =>
                        setError(err.message || 'Không tải được danh sách dịch vụ')
                      );
                  } catch (err) {
                    alert(err.message || 'Xoá dịch vụ thất bại');
                  }
                }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminServicesConfigPage;

