import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FILE_BASE, getAuthToken, getAuthUser, getStoredRolePermissions, setAuthToken, setAuthUser } from '../../services/api';

function AdminLayout({ active, title, children }) {
  // active: 'dashboard' | 'appointments' | 'patients' | 'services'
  const navigate = useNavigate();
  const isAuthed = !!getAuthToken();
  const user = getAuthUser();
  const role = user?.role;
  const rolePerms = useMemo(() => getStoredRolePermissions(), []);
  const staffPerms = rolePerms?.staff || {};

  const avatarUrl = user?.avatar_url;
  const displayAvatar = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `${FILE_BASE}${avatarUrl}`
    : null;

  const can = {
    dashboard:
      role === 'admin' || (role === 'staff' && staffPerms.dashboard !== false),
    appointments:
      role === 'admin' || (role === 'staff' && staffPerms.appointments !== false),
    patients:
      role === 'admin' || (role === 'staff' && staffPerms.patients !== false),
    accounts: role === 'admin',
    dentists:
      role === 'admin' || (role === 'staff' && staffPerms.dentists_view_edit !== false),
    services: role === 'admin',
    staffSchedules:
      role === 'admin' ||
      (role === 'staff' && staffPerms.staff_schedules !== false) ||
      role === 'dentist',
    calendar:
      role === 'admin' ||
      (role === 'staff' && staffPerms.calendar_overview !== false) ||
      role === 'dentist',
    settings: role === 'admin',
    shifts: role === 'admin',
  };

  return (
    <div className="h-screen bg-bg-light text-slate-600 flex overflow-hidden font-sans">
      {/* SIDEBAR – lấy style từ admin_dashboard_overview */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <a href="/" className="flex items-center gap-2.5 text-primary font-bold text-lg tracking-tight">
            <img src="/logo.svg" alt="Nha Khoa" className="h-9 w-9 rounded-lg object-cover" />
            <span>Nha Khoa</span>
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 text-sm">
          {can.dashboard && (
            <a
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'dashboard'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">dashboard</span>
              <span>Dashboard</span>
            </a>
          )}
          {can.appointments && (
            <a
              href="/admin/appointments"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'appointments'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">calendar_today</span>
              <span>Schedule</span>
            </a>
          )}
          {can.calendar && (
            <a
              href="/admin/calendar"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'calendar'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">calendar_month</span>
              <span>Calendar</span>
            </a>
          )}
          {can.patients && (
            <a
              href="/admin/patients"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'patients'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">people</span>
              <span>Patients</span>
            </a>
          )}
          {can.accounts && (
            <a
              href="/admin/accounts"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'accounts'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">manage_accounts</span>
              <span>Tài khoản</span>
            </a>
          )}
          {can.dentists && (
            <a
              href="/admin/dentists"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'dentists'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">medical_services</span>
              <span>Bác sĩ</span>
            </a>
          )}
          {can.services && (
            <a
              href="/admin/services-config"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'services'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">medical_services</span>
              <span>Services</span>
            </a>
          )}
          {can.shifts && (
            <a
              href="/admin/shifts"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'shifts'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">schedule</span>
              <span>Ca làm việc</span>
            </a>
          )}
          {can.staffSchedules && (
            <a
              href="/admin/staff-schedules"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                active === 'staff-schedules'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <span className="material-icons text-xl">assignment_ind</span>
              <span>Phân công nhân sự</span>
            </a>
          )}

          {can.settings && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Settings
              </p>
              <a
                href="/admin/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active === 'settings'
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                }`}
              >
                <span className="material-icons text-xl">settings</span>
                <span>Configuration</span>
              </a>
            </div>
          )}
        </nav>

        {/* User Profile (footer sidebar) – dùng avatar giống thiết kế */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
          {role === 'admin' && (
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <span className="material-icons text-xl">home</span>
              <span>Trang chủ</span>
            </a>
          )}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin/profile')}>
            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-500">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={user?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user?.full_name || 'U')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {isAuthed ? user?.full_name || 'User' : 'Guest'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {isAuthed
                  ? role === 'admin'
                    ? 'Admin'
                    : role === 'staff'
                      ? 'Nhân viên'
                      : role === 'dentist'
                        ? 'Bác sĩ'
                        : 'Clinic Management'
                  : 'Not signed in'}
              </p>
            </div>
            <a
            href="/admin/login"
            className="text-slate-400 hover:text-primary"
            title={isAuthed ? 'Đăng xuất' : 'Đăng nhập'}
            onClick={(e) => {
              if (isAuthed) {
                e.preventDefault();
                setAuthToken(null);
                setAuthUser(null);
                window.location.href = '/admin/login';
              }
            }}
          >
            <span className="material-icons text-lg">
              {isAuthed ? 'logout' : 'login'}
            </span>
            </a>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT – header trên + vùng cuộn giống thiết kế */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-500 hover:text-primary">
              <span className="material-icons">menu</span>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 hidden sm:block">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            {/* Search */}
            <div className="hidden md:flex relative">
              <span className="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-background-light border-none rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary w-64"
                placeholder="Search patients, doctors..."
                type="text"
              />
            </div>
            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
              <span className="material-icons">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            {/* New Appointment */}
            <a
              href="/admin/appointments"
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm shadow-primary/30 transition-all"
            >
              <span className="material-icons text-sm">add</span>
              <span>New Appointment</span>
            </a>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-bg-light">
          <div className="max-w-7xl mx-auto space-y-4">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;

