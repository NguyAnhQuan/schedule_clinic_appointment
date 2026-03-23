import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, FILE_BASE, getAuthToken, getAuthUser, setAuthUser } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    const cached = getAuthUser();
    if (cached) {
      setForm({
        full_name: cached.full_name || '',
        phone: cached.phone || '',
        email: cached.email || '',
        avatar_url: cached.avatar_url || '',
      });
      setLoading(false);
    }
    AdminApi.getMe()
      .then((u) => {
        setAuthUser(u);
        setForm({
          full_name: u.full_name || '',
          phone: u.phone || '',
          email: u.email || '',
          avatar_url: u.avatar_url || '',
        });
      })
      .catch((err) => {
        setError(err.message || 'Không tải được thông tin tài khoản');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const displayAvatar = form.avatar_url
    ? form.avatar_url.startsWith('http')
      ? form.avatar_url
      : `${FILE_BASE}${form.avatar_url}`
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await AdminApi.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim(),
        avatar_url: form.avatar_url || null,
      });
      setAuthUser(updated);
      setForm({
        full_name: updated.full_name || '',
        phone: updated.phone || '',
        email: updated.email || '',
        avatar_url: updated.avatar_url || '',
      });
    } catch (err) {
      setError(err.message || 'Cập nhật thông tin thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const res = await AdminApi.uploadAvatar(file);
      const path = res.path || (res.url && res.url.startsWith('/') ? res.url : '');
      if (path) {
        setForm((prev) => ({ ...prev, avatar_url: path }));
      }
    } catch (err) {
      setError(err.message || 'Tải ảnh đại diện thất bại');
    }
  }

  return (
    <AdminLayout active={null} title="Thông tin tài khoản">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-xs md:text-sm">
        <h1 className="text-base md:text-lg font-semibold text-slate-900 mb-1">
          Thông tin tài khoản
        </h1>
        <p className="text-[11px] text-slate-500 mb-4">
          Cập nhật họ tên, số điện thoại, email và ảnh đại diện cho tài khoản hiện tại.
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-[11px] text-slate-500">Đang tải thông tin...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-500">
                {displayAvatar ? (
                  <img src={displayAvatar} alt={form.full_name || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  (form.full_name || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                )}
              </div>
              <label className="text-[11px] font-medium text-primary cursor-pointer inline-flex items-center gap-1">
                <span className="material-icons text-sm">upload</span>
                Chọn ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/40"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/40"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-[11px] hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminProfilePage;

