// Root component: wires up global providers (theme, toasts, auth) and all routes.
// Public routes: /login, /register. Everything else is wrapped in <ProtectedRoute>
// (requires a valid JWT) and rendered inside the <Layout> shell. Role-restricted
// routes (Maintenance, Users) are further guarded by a roles=[...] check.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Extinguishers from './pages/Extinguishers';
import Inspections from './pages/Inspections';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Users from './pages/Users';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/extinguishers" element={<Extinguishers />} />
                <Route path="/inspections" element={<Inspections />} />
                <Route path="/maintenance" element={<ProtectedRoute roles={['admin', 'inspector']}><Maintenance /></ProtectedRoute>} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
