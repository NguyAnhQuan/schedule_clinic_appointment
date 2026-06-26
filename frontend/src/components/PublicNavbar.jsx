/**
 * FILE_GUIDE: PublicNavbar.jsx — Menu điều hướng trang khách
 */
import { useState, useEffect } from 'react';
import { AdminApi, getAuthToken, getAuthUser, setAuthUser, setAuthToken, FILE_BASE } from '../services/api';

/**
 * Thanh điều hướng công khai.
 * @param {boolean} minimal - true: ẩn menu link (dùng ở trang đặt lịch tập trung); false: hiện đủ link
 */
function PublicNavbar({ minimal = false }) {
  // User từ localStorage — khởi tạo lazy nếu có token
  const [user, setUser] = useState(() => (getAuthToken() ? getAuthUser() : null));
  // Hiển thị modal chỉnh sửa hồ sơ
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Đang tải dữ liệu hồ sơ vào form
  const [profileLoading, setProfileLoading] = useState(false);
  // Đang gửi cập nhật hồ sơ
  const [profileSaving, setProfileSaving] = useState(false);
  // Lỗi trong modal hồ sơ
  const [profileError, setProfileError] = useState('');
  // Dữ liệu form chỉnh sửa hồ sơ
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '', avatar_url: '' });
  const isLoggedIn = !!getAuthToken();
  // Chỉ hiển thị UI đăng nhập khi có user hợp lệ
  const displayUser = isLoggedIn ? user : null;

  // Nếu có token nhưng chưa có user trong state → gọi API /me để đồng bộ
  useEffect(() => {
    if (!isLoggedIn || user) return;
    let cancelled = false;
    AdminApi.getMe()
      .then((u) => {
        if (cancelled) return;
        setAuthUser(u);
        setUser(u);
      })
      .catch(() => {
        if (cancelled) return;
        // Token hết hạn hoặc không hợp lệ → xóa session
        setAuthToken(null);
        setAuthUser(null);
        setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user]);

  /** Mở modal và tải thông tin user mới nhất từ API */
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

  /** Đóng modal và xóa lỗi */
  function closeProfileModal() {
    setShowProfileModal(false);
    setProfileError('');
  }

  /** Lưu thay đổi hồ sơ qua API updateProfile */
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

  /** Upload ảnh đại diện — cập nhật avatar_url trong form */
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

  /** Xóa token và user khỏi localStorage + state */
  function handleLogout() {
    setAuthToken(null);
    setAuthUser(null);
    setUser(null);
    setShowProfileModal(false);
  }

  // URL ảnh hiển thị — ưu tiên form đang sửa, fallback user
  const avatarUrl = profileForm.avatar_url || displayUser?.avatar_url;
  const displayAvatar = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `${FILE_BASE}${avatarUrl}`
    : null;

  return (
    <>
      {/* === HEADER: logo + menu + nút đăng nhập/hồ sơ === */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          {/* Logo + tên phòng khám — link về trang chủ */}
          <a href="/" className="flex items-center gap-2.5 hover:opacity-90">
            <img
              src="/logo.svg"
              alt="Nha Khoa Dental Clinic"
              className="h-10 w-10 rounded-xl object-cover shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-xs font-semibold tracking-[0.18em] text-primary">
                NHA KHOA
              </div>
              <div className="text-[11px] text-slate-500">Dental Clinic</div>
            </div>
          </a>

          {/* Menu điều hướng — ẩn khi minimal=true hoặc màn hình nhỏ (md:flex) */}
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

          {/* Khối phải: avatar user hoặc nút đăng nhập/đăng ký */}
          <div className="flex items-center gap-2">
            {displayUser ? (
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
                      {(displayUser.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {displayUser.full_name || 'Tài khoản'}
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

      {/* === MODAL QUẢN LÝ HỒ SƠ CÁ NHÂN === */}
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
                          {(profileForm.full_name || displayUser?.full_name || 'U').charAt(0).toUpperCase()}
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
                    {(displayUser?.role === 'admin' || displayUser?.role === 'staff' || displayUser?.role === 'dentist') && (
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
