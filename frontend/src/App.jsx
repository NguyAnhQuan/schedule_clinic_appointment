import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';
import MaintenancePage from './pages/MaintenancePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dich-vu" element={<ServicesPage />} />
        <Route path="/bac-si" element={<DentistsPage />} />
        <Route path="/dat-lich" element={<BookAppointmentPage />} />
        <Route path="/dat-lich/thanh-cong/:id" element={<BookingSuccessPage />} />
        <Route path="/tra-cuu" element={<CheckAppointmentPage />} />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
        <Route path="/admin/patients" element={<AdminPatientsPage />} />
        <Route path="/admin/accounts" element={<AdminAccountsPage />} />
        <Route path="/admin/dentists" element={<AdminDentistsPage />} />
        <Route path="/admin/patients/:id/records" element={<AdminPatientRecordsPage />} />
        <Route
          path="/admin/patients/:id/records/:recordId"
          element={<AdminPatientRecordDetailPage />}
        />
        <Route path="/admin/services-config" element={<AdminServicesConfigPage />} />
        <Route path="/admin/staff-schedules" element={<AdminStaffSchedulesPage />} />
        <Route path="/admin/calendar" element={<AdminCalendarPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
