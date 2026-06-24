import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import DentistsPage from './pages/DentistsPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import CheckAppointmentPage from './pages/CheckAppointmentPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminAppointmentsPage from './pages/admin/AdminAppointmentsPage';
import AdminPatientsPage from './pages/admin/AdminPatientsPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminDentistsPage from './pages/admin/AdminDentistsPage';
import AdminPatientRecordsPage from './pages/admin/AdminPatientRecordsPage';
import AdminPatientRecordDetailPage from './pages/admin/AdminPatientRecordDetailPage';
import AdminServicesConfigPage from './pages/admin/AdminServicesConfigPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminStaffSchedulesPage from './pages/admin/AdminStaffSchedulesPage';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';
import MaintenancePage from './pages/MaintenancePage';
import AdminRouteGuard from './components/admin/AdminRouteGuard';
import XenoChatbotEmbed from './components/XenoChatbotEmbed';
import PageTitle from './components/PageTitle';
import { getAuthUser } from './services/api';

function PublicRoute({ children }) {
  const user = getAuthUser();
  const role = user?.role;

  // Nhân viên & bác sĩ không dùng giao diện người dùng công khai
  if (role === 'staff') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'dentist') {
    return <Navigate to="/admin/staff-schedules" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <PageTitle />
      <XenoChatbotEmbed />
      <Routes>
        <Route
          path="/"
          element={(
            <PublicRoute>
              <HomePage />
            </PublicRoute>
          )}
        />
        <Route
          path="/dich-vu"
          element={(
            <PublicRoute>
              <ServicesPage />
            </PublicRoute>
          )}
        />
        <Route
          path="/bac-si"
          element={(
            <PublicRoute>
              <DentistsPage />
            </PublicRoute>
          )}
        />
        <Route
          path="/dat-lich"
          element={(
            <PublicRoute>
              <BookAppointmentPage />
            </PublicRoute>
          )}
        />
        <Route
          path="/dat-lich/thanh-cong/:id"
          element={(
            <PublicRoute>
              <BookingSuccessPage />
            </PublicRoute>
          )}
        />
        <Route
          path="/tra-cuu"
          element={(
            <PublicRoute>
              <CheckAppointmentPage />
            </PublicRoute>
          )}
        />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin area với guard theo vai trò */}
        <Route
          path="/admin"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']} permissionKey="dashboard">
              <AdminDashboardPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/appointments"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']} permissionKey="appointments">
              <AdminAppointmentsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/patients"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']} permissionKey="patients">
              <AdminPatientsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/accounts"
          element={(
            <AdminRouteGuard allowedRoles={['admin']}>
              <AdminAccountsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/dentists"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']} permissionKey="dentists_view_edit">
              <AdminDentistsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/patients/:id/records"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']}>
              <AdminPatientRecordsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/patients/:id/records/:recordId"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff']}>
              <AdminPatientRecordDetailPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/services-config"
          element={(
            <AdminRouteGuard allowedRoles={['admin']}>
              <AdminServicesConfigPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/staff-schedules"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff', 'dentist']} permissionKey="staff_schedules">
              <AdminStaffSchedulesPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/calendar"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff', 'dentist']} permissionKey="calendar_overview">
              <AdminCalendarPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/settings"
          element={(
            <AdminRouteGuard allowedRoles={['admin']}>
              <AdminSettingsPage />
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/profile"
          element={(
            <AdminRouteGuard allowedRoles={['admin', 'staff', 'dentist']}>
              <AdminProfilePage />
            </AdminRouteGuard>
          )}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
