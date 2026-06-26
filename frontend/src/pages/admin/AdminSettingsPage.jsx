/**
 * FILE_GUIDE: AdminSettingsPage.jsx — Cài đặt phòng khám, bảo mật
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, FILE_BASE, getAuthToken } from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

function AdminSettingsPage() {
  const navigate = useNavigate();
  const logoInputRef = useRef(null);
  const [tab, setTab] = useState('clinic'); // clinic | roles | security

  const [clinic, setClinic] = useState({
    clinic_name: '',
    address: '',
    phone: '',
    email: '',
    working_hours: '',
    logo_url: '',
  });

  const [rolePermissions, setRolePermissions] = useState({
    staff: {
      dashboard: true,
      appointments: true,
      patients: true,
      dentists_view_edit: true,
      calendar_overview: true,
      staff_schedules: true,
    },
  });

  const [security, setSecurity] = useState({
    password_expiration_days: 90,
    auto_logout_minutes: 15,
    require_2fa_admin: true,
    complex_passwords: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/admin/login');
      return;
    }
    AdminApi.getClinicSettings()
      .then((data) => {
        if (!data) return;
        setClinic({
          clinic_name: data.clinic_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          working_hours: data.working_hours || '',
          logo_url: data.logo_url || '',
        });

        try {
          const roles = data.role_permissions_json
            ? JSON.parse(data.role_permissions_json)
            : null;
          if (roles && typeof roles === 'object' && roles.staff) {
            setRolePermissions((prev) => {
              const next = {
                staff: { ...prev.staff, ...roles.staff },
              };
              localStorage.setItem('clinic_role_permissions', JSON.stringify(next));
              return next;
            });
          }
        } catch {
          // ignore
        }

        try {
          const sec = data.security_json ? JSON.parse(data.security_json) : null;
          if (sec && typeof sec === 'object') {
            setSecurity((prev) => ({ ...prev, ...sec }));
          }
        } catch {
          // ignore
        }
      })
      .catch((err) => setError(err.message || 'Không tải được cấu hình phòng khám'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function updateClinic(field, value) {
    setClinic((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await AdminApi.updateClinicSettings({
        ...clinic,
        role_permissions: rolePermissions,
        security,
      });
      // Lưu xuống localStorage để frontend (menu, guard) đọc ngay
      localStorage.setItem('clinic_role_permissions', JSON.stringify(rolePermissions));
      setSuccess('Đã lưu System Settings.');
    } catch (err) {
      setError(err.message || 'Lưu cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(file) {
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const data = await AdminApi.uploadClinicLogo(file);
      updateClinic('logo_url', data.path);
      setSuccess('Đã upload logo. Nhấn “Save Changes” để lưu.');
    } catch (err) {
      setError(err.message || 'Upload logo thất bại');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleLogoFile(f);
  }

  function togglePermission(roleKey, key, value) {
    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [key]: value },
    }));
  }

  function toggleSecurity(key, value) {
    setSecurity((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <AdminLayout active="settings" title="System Settings">
      <div className="space-y-6">
        <div className="-mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-bg-light border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500">Configuration › System Settings</div>
              <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-[11px] font-medium shadow-sm shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <span className="material-icons text-sm">save</span>
              {saving ? 'Đang lưu...' : 'Save Changes'}
            </button>
          </div>
          <div className="mt-4 border-b border-slate-200 overflow-x-auto">
            <nav className="-mb-px flex gap-6 text-sm">
              <button
                type="button"
                onClick={() => setTab('clinic')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium flex items-center gap-2 ${
                  tab === 'clinic' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="material-icons text-lg">business</span>
                Clinic Info
              </button>
              <button
                type="button"
                onClick={() => setTab('roles')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium flex items-center gap-2 ${
                  tab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="material-icons text-lg">admin_panel_settings</span>
                User Roles
              </button>
              <button
                type="button"
                onClick={() => setTab('security')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium flex items-center gap-2 ${
                  tab === 'security' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="material-icons text-lg">security</span>
                Security
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700">{success}</div>
        )}

        {loading ? (
          <div className="text-[11px] text-slate-500 text-center">Đang tải cấu hình...</div>
        ) : (
          <div className="space-y-8">
            {tab === 'clinic' && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Clinic Information</h2>
                  <p className="text-slate-500 text-sm">
                    Cập nhật hồ sơ công khai, địa chỉ liên hệ và nhận diện thương hiệu.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
                      <input
                        value={clinic.clinic_name}
                        onChange={(e) => updateClinic('clinic_name', e.target.value)}
                        className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={clinic.email}
                        onChange={(e) => updateClinic('email', e.target.value)}
                        className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={clinic.phone}
                        onChange={(e) => updateClinic('phone', e.target.value)}
                        className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <textarea
                        rows={3}
                        value={clinic.address}
                        onChange={(e) => updateClinic('address', e.target.value)}
                        className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours</label>
                      <input
                        value={clinic.working_hours}
                        onChange={(e) => updateClinic('working_hours', e.target.value)}
                        placeholder="VD: Thứ 2 - Thứ 7: 8h00 - 20h00"
                        className="w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Clinic Logo</label>
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {clinic.logo_url ? (
                          <img
                            src={`${FILE_BASE}${clinic.logo_url}`}
                            alt="Clinic logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-icons text-4xl text-primary">local_hospital</span>
                        )}
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => logoInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click();
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <span className="material-icons text-slate-400 group-hover:text-primary mb-2">
                          cloud_upload
                        </span>
                        <p className="text-sm text-slate-600 font-medium">
                          {uploadingLogo ? 'Đang upload...' : 'Click để upload hoặc kéo thả file vào đây'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PNG/JPG/GIF (tối đa 5MB)</p>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleLogoFile(f);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tab === 'roles' && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">User Roles & Permissions</h2>
                  <p className="text-slate-500 text-sm">
                    Cấu hình phân quyền theo vai trò trong hệ thống.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Quyền (nhân viên)
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Staff
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Dashboard / Thống kê
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.dashboard}
                              onChange={(e) =>
                                togglePermission('staff', 'dashboard', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Quản lý lịch hẹn
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.appointments}
                              onChange={(e) =>
                                togglePermission('staff', 'appointments', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Quản lý bệnh nhân
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.patients}
                              onChange={(e) =>
                                togglePermission('staff', 'patients', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Quản lý bác sĩ (xem + sửa)
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.dentists_view_edit}
                              onChange={(e) =>
                                togglePermission('staff', 'dentists_view_edit', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Tổng quan lịch
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.calendar_overview}
                              onChange={(e) =>
                                togglePermission('staff', 'calendar_overview', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            Phân ca
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!rolePermissions.staff.staff_schedules}
                              onChange={(e) =>
                                togglePermission('staff', 'staff_schedules', e.target.checked)
                              }
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {tab === 'security' && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Security Settings</h2>
                  <p className="text-slate-500 text-sm">
                    Thiết lập chính sách mật khẩu và timeout phiên.
                  </p>
                </div>
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Password Expiration</h3>
                      <p className="text-xs text-slate-500 mt-1">Buộc đổi mật khẩu theo chu kỳ</p>
                    </div>
                    <select
                      value={String(security.password_expiration_days)}
                      onChange={(e) => toggleSecurity('password_expiration_days', Number(e.target.value))}
                      className="rounded-lg border-slate-300 bg-white text-sm py-1.5 px-3 focus:border-primary focus:ring-primary"
                    >
                      <option value="30">Every 30 days</option>
                      <option value="90">Every 90 days</option>
                      <option value="180">Every 180 days</option>
                      <option value="0">Never</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Auto Logout (Idle)</h3>
                      <p className="text-xs text-slate-500 mt-1">Tự đăng xuất khi không thao tác</p>
                    </div>
                    <select
                      value={String(security.auto_logout_minutes)}
                      onChange={(e) => toggleSecurity('auto_logout_minutes', Number(e.target.value))}
                      className="rounded-lg border-slate-300 bg-white text-sm py-1.5 px-3 focus:border-primary focus:ring-primary"
                    >
                      <option value="5">5 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Require Two-Factor Auth (2FA)</h3>
                      <p className="text-xs text-slate-500 mt-1">Cho tất cả tài khoản Admin</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!security.require_2fa_admin}
                      onClick={() => toggleSecurity('require_2fa_admin', !security.require_2fa_admin)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        security.require_2fa_admin ? 'bg-primary' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          security.require_2fa_admin ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Complex Passwords</h3>
                      <p className="text-xs text-slate-500 mt-1">Yêu cầu ký tự đặc biệt và số</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!security.complex_passwords}
                      onClick={() => toggleSecurity('complex_passwords', !security.complex_passwords)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        security.complex_passwords ? 'bg-primary' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          security.complex_passwords ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Deposit Payment (disabled like design) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 opacity-60 pointer-events-none grayscale relative select-none">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="bg-white shadow-xl border border-slate-200 rounded-lg py-3 px-6 flex items-center gap-3">
                  <span className="material-icons text-amber-500">lock</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Feature Unavailable</p>
                    <p className="text-xs text-slate-500">Payments (reserved in design)</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Deposit Payment</h2>
                <p className="text-slate-500 text-sm">Chức năng đặt cọc online (chưa triển khai).</p>
              </div>
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Enable Online Deposits</h3>
                    <p className="text-xs text-slate-500 mt-1">Require payment when booking online</p>
                  </div>
                  <div className="bg-slate-200 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent">
                    <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fixed Deposit Amount</label>
                    <input className="w-full rounded-lg border-slate-300 bg-slate-50 text-slate-500" disabled type="number" value="50.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Gateway</label>
                    <select className="w-full rounded-lg border-slate-300 bg-slate-50 text-slate-500" disabled>
                      <option>Stripe Connect</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminSettingsPage;

