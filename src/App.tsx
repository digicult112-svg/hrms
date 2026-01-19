
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import EmployeeList from './pages/EmployeeList';
import AttendancePage from './pages/Attendance';
import LeavePage from './pages/Leave';
import PayrollPage from './pages/Payroll';
import JobsPage from './pages/Jobs';
import CandidatesPage from './pages/Candidates';
import Helpdesk from './pages/Helpdesk';
import EmailCommunication from './pages/EmailCommunication';
import AdminDashboard from './pages/AdminDashboard';
import Feedback from './pages/Feedback';

import AuditLogsPage from './pages/AuditLogs';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

import { ToastProvider } from './context/ToastContext';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="hrms-theme">
          <ToastProvider>
            <Routes>
              {/* ... routes ... */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/leave" element={<LeavePage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/helpdesk" element={<Helpdesk />} />


                <Route
                  path="/employees"
                  element={
                    <PrivateRoute roles={['hr']}>
                      <EmployeeList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/candidates"
                  element={
                    <PrivateRoute roles={['hr']}>
                      <CandidatesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <PrivateRoute roles={['hr']}>
                      <AuditLogsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/communication"
                  element={
                    <PrivateRoute roles={['hr']}>
                      <EmailCommunication />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/admin-dashboard"
                  element={
                    <PrivateRoute roles={['admin']}>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/feedback"
                  element={
                    <PrivateRoute>
                      <Feedback />
                    </PrivateRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
