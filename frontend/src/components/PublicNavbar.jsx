import { useState, useEffect } from 'react';
import { AdminApi, getAuthToken, getAuthUser, setAuthUser, setAuthToken, FILE_BASE } from '../services/api';

function PublicNavbar({ minimal = false }) {
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '', avatar_url: '' });

  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    if (!isLoggedIn) {
      setUser(null);
      return;
    }
    const cached = getAuthUser();
    if (cached) {
      setUser(cached);
      return;
    }
    AdminApi.getMe()
      .then((u) => {
        setAuthUser(u);
        setUser(u);
      })
      .catch(() => {
        setAuthToken(null);
        setAuthUser(null);
        setUser(null);
      });
  }, [isLoggedIn]);

  function openProfileModal() {
    setShowProfileModal(true);
    setProfileError('');
    AdminApi.getMe()
      .then((u) => {
        setProfileForm({
          full_name: u.full_name || '',
          phone: u.phone || '',
          email: u.email || '',
          avatar_url: u.avatar_url || '',
        });
        setUser(u);
        setAuthUser(u);
      })
      .catch(() => setProfileError('Không tải được thông tin'))
      .finally(() => setProfileLoading(false));
    setProfileLoading(true);
  }

  function closeProfileModal() {
    setShowProfileModal(false);
    setProfileError('');
  }

  function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    AdminApi.updateProfile({
      full_name: profileForm.full_name.trim(),
      phone: profileForm.phone.trim() || null,
      email: profileForm.email.trim(),
      avatar_url: profileForm.avatar_url || null,
    })
      .then((updated) => {
        setAuthUser(updated);
        setUser(updated);
        closeProfileModal();
      })
      .catch((err) => setProfileError(err.message || 'Cập nhật thất bại'))
      .finally(() => setProfileSaving(false));
  }

  function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');
    AdminApi.uploadAvatar(file)
      .then((res) => {
        setProfileForm((prev) => ({ ...prev, avatar_url: res.url }));
      })
      .catch((err) => setProfileError(err.message || 'Tải ảnh lên thất bại'));
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthUser(null);
    setUser(null);
    setShowProfileModal(false);
  }

  const avatarUrl = profileForm.avatar_url || user?.avatar_url;
  const displayAvatar = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `${FILE_BASE}${avatarUrl}`
    : null;

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-90">
            <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              NK
            </span>
            <div className="leading-tight">
              <div className="text-xs font-semibold tracking-[0.18em] text-primary">
                NHA KHOA
              </div>
              <div className="text-[11px] text-slate-500">Dental Clinic</div>
            </div>
          </a>

          {!minimal && (
            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
              <a href="/" className="font-medium hover:text-primary">
                Trang chủ
              </a>
              <a href="/dich-vu" className="hover:text-primary">
                Dịch vụ
              </a>
              <a href="/bac-si" className="hover:text-primary">
                Đội ngũ bác sĩ
              </a>
              <a href="/tra-cuu" className="hover:text-primary">
                Tra cứu lịch hẹn
              </a>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {isLoggedIn && user ? (
              <button
                type="button"
                onClick={openProfileModal}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-3 py-1.5 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition"
              >
                <span className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-500 text-sm font-semibold">
                      {(user.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user.full_name || 'Tài khoản'}
                </span>
              </button>
            ) : (
              <>
                <a
                  href="/admin/login"
                  className="hidden sm:inline-flex items-center rounded-button border border-primary/50 bg-white px-4 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary/5"
                >
                  Đăng nhập
                </a>
                <a
                  href="/admin/login"
                  className="inline-flex items-center rounded-button bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  Đăng ký
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modal quản lý thông tin cá nhân */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Quản lý thông tin cá nhân</h2>
              <button
                type="button"
                onClick={closeProfileModal}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Đóng"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {profileLoading && (
                <div className="text-sm text-slate-500">Đang tải thông tin...</div>
              )}
              {!profileLoading && (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-slate-400">
                          {(profileForm.full_name || user?.full_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="text-xs font-medium text-primary cursor-pointer inline-flex items-center gap-1">
                      <span className="material-icons text-sm">upload</span>
                      Chọn ảnh đại diện
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      required
                    />
                  </div>

                  {profileError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                      {profileError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                    >
                      {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'dentist') && (
                      <a
                        href="/admin"
                        className="text-xs text-primary hover:underline"
                      >
                        Vào trang quản trị →
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block mt-2 text-xs text-slate-500 hover:text-red-600"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default PublicNavbar;
