import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi } from '../../services/api';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@clinic.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'

  // Đăng ký: thông tin đầy đủ
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (activeTab !== 'login') return;
    setLoading(true);
    setError('');
    try {
      await AdminApi.login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');
    setSignupSuccess('');
    if (signupPassword !== signupConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const data = await AdminApi.register(
        signupFullName.trim(),
        signupPhone.trim() || undefined,
        signupEmail.trim(),
        signupPassword
      );
      setSignupSuccess(data.message || 'Đăng ký thành công.');
      if (data.token) {
        navigate('/admin');
        return;
      }
      setSignupFullName('');
      setSignupPhone('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setActiveTab('login');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-slate-900 flex">
      {/* Left hero - chỉ hiện trên màn hình lớn, giống thiết kế ThietKe/login_registration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-10 bg-primary/20 mix-blend-multiply" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCU6BzCTbMJSsDYrAJErXr93ETDXWUzQIqqLfh-3TVAx1x24y5PxUWvhSe3JRg92taZxMjCu91L5nvR-TFQ87NY-Ky0J118VygYjGnsSrg5xW5DXIrAQ7NYOyShnzqnDxTtMbV_bIYlMQ5aFCaX0BEMWfUULXTZU0wz1OfLax-KjSoZ9g5_4ebMP6VXR3aDQ8DMMHm9Xqz_VmRbw4Pc56pRQGTvGAeW8P1tf04YsJK2eMODaXKJaCg3G3zzoF40XuZPN2TMHkAQ3BI')",
          }}
        />
        <div className="relative z-20 flex flex-col justify-between p-10 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
              <span className="text-2xl">🦷</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Nha khoa Demo</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight mb-4">
              Cổng thông tin bệnh nhân & nội bộ.
            </h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Truy cập lịch hẹn, hồ sơ điều trị và các công cụ quản trị phòng khám trong một giao
              diện thống nhất.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex -space-x-3">
              <img
                className="h-9 w-9 rounded-full border-2 border-primary object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOXbDhx_fs_3YoEt1t9QPvPwZj1jEh-8r6lPdJ4LKoxJkwWA2GMqNrQApN2aDCg5N3dL7ct3ueg2du-XgPpc6LKRbPk3YjcXsGeDbb2nw1gK89h6SS6QcUkCRhSuDFFyeGl1W3MrUFTvEE55Fx6dL4sAnz61mqfP8cOt5eTie8WlQr4Et0AarT09bAG05pdAxAuiy4dIf0cI_EQwV6g1V9-HAkf0rt3MuhX0BH7r9Xmrt7kOBXp3T84WemLlPHtYW_eZH2eWQ0Olo"
                alt="Bác sĩ 1"
              />
              <img
                className="h-9 w-9 rounded-full border-2 border-primary object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvn0_maGSuvrYBWhvrWBRyU6ibxu5G2MjybKQN-uWSEg1FzSghUe5QHabxCttQDTvK6Qa0pZCgjPKxSGReKDFXxIpS-0XNzUNT9RGhIG4nObNMw0yLmZkMK0rZEWGozhHaJ7rX5XRvf75S43fh305U2fyPpy6eub6S_ZRJPBOIHIdB8XPwTqJLX-9JnVHHwwyjcO9iu2s3o1TGOtZt2kIHfCHLoWX7q63To24zLns42g2FnfKIGnkOY8lbv2AwbTv9vJ8YCBkvD-M"
                alt="Bác sĩ 2"
              />
              <img
                className="h-9 w-9 rounded-full border-2 border-primary object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf6f_tb8RcVoS4nmbku_224QjqkjTzr4utAEBHMYsGO7fLxuzPKBY8_C0fbeWCJ1Q4Jw9YWgYN6bN6KGrqXS0pL6lL1myaXwt1z8syV-WhFw-CIlmBDhDd_DNi5qE3HbxdGTKxG2U0ZQ7J1NpZLxKH0atq4GxBwt8jWfcF9w6lVO_dVL4BqIFpYMRItNQ6ikHCrqA-oi7MRzJ8qpzLl-gVTmGzqlSFDGzXEW3PBXFf2UHcBtx7ECJ5MudMh-vxG2XMqPd9gtx9Yag"
                alt="Điều dưỡng"
              />
            </div>
            <p className="text-[11px] font-medium text-white/80">
              Tin cậy bởi hàng nghìn bệnh nhân & đội ngũ nội bộ.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 bg-background-light">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white text-sm font-semibold">
              NK
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Nha khoa Demo</h2>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
              Cổng truy cập phòng khám
            </h2>
            <p className="text-xs text-slate-500">
              Đăng nhập bằng tài khoản nội bộ được cấp bởi phòng khám.
            </p>
          </div>

          {/* Toggle login / signup */}
          <div className="flex p-1 mb-6 bg-slate-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
                setSignupSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError('');
                setSignupSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email hoặc số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    @
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="admin@clinic.local"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">Mật khẩu</label>
                  <span className="text-[11px] text-primary cursor-default">Quên mật khẩu?</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    ●●
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                <label htmlFor="remember-me" className="ml-2 text-[11px] text-slate-600">
                  Ghi nhớ đăng nhập trên máy này
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <p className="mt-1 text-[11px] text-slate-500 text-center">
                Demo nhanh:{' '}
                <span className="font-mono text-slate-700">admin@clinic.local</span> /{' '}
                <span className="font-mono text-slate-700">admin123</span>
              </p>
            </form>
          )}

          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Số điện thoại (tùy chọn)
                </label>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Mật khẩu * (ít nhất 6 ký tự)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Xác nhận mật khẩu *</label>
                <input
                  type="password"
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="••••••••"
                />
              </div>

              {signupSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-700">
                  {signupSuccess}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60"
              >
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;

