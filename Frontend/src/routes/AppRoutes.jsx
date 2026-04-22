import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from '../constants/roles';
import AdminAccess from '../pages/AdminAccess';
import AdminLoginPage from '../pages/AdminLoginPage';
import DoctorLandingPage from '../pages/DoctorLandingPage';
import DoctorLoginPage from '../pages/DoctorLoginPage';
import PharmacistLandingPage from '../pages/PharmacistLandingPage';
import PharmacistLoginPage from '../pages/PharmacistLoginPage';
import PatientLandingPage from '../pages/PatientLandingPage';
import PatientLoginPage from '../pages/PatientLoginPage';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import PharmacistDashboard from '../pages/PharmacistDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import ATCClassification from '../pages/ATCClassification';
import Prescription from '../pages/Prescription';
import Prescriptions from '../pages/Prescriptions';
import Inventory from '../pages/Inventory';
import Alerts from '../pages/Alerts';
import Reports from '../pages/Reports';
import Admin from '../pages/Admin';
import ChangePassword from '../pages/ChangePassword';
import InventoryAudit from '../pages/InventoryAudit';
import PatientRecordDetails from '../pages/PatientRecordDetails';
import PatientDashboard from '../pages/PatientDashboard';
import PatientProfile from '../pages/PatientProfile';
import PatientPrescriptions from '../pages/PatientPrescriptions';
import PatientLayout from '../layouts/PatientLayout';
import { getRoleHomePath, getStoredRole, getStoredToken, isValidRole } from '../utils/session';

function AppHomeRedirect() {
  const authStatus = useSelector((state) => state.auth.status);
  const reduxToken = useSelector((state) => state.auth.token);
  const reduxRole = useSelector((state) => state.auth.role);
  const token = reduxToken || getStoredToken();
  const role = reduxRole || getStoredRole();

  if (authStatus === 'checking' || (authStatus === 'idle' && token)) {
    return null;
  }

  if (!token) {
    return <Navigate replace to="/login" />;
  }

  if (!isValidRole(role)) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={getRoleHomePath(role)} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/access" element={<AdminAccess />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/doctor/access" element={<DoctorLandingPage />} />
      <Route path="/doctor/login" element={<DoctorLoginPage />} />
      <Route path="/pharmacist/access" element={<PharmacistLandingPage />} />
      <Route path="/pharmacist/login" element={<PharmacistLoginPage />} />
      <Route path="/patient/access" element={<PatientLandingPage />} />
      <Route path="/patient/login" element={<PatientLoginPage />} />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/pharmacist"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
            <MainLayout>
              <PharmacistDashboard />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/atc"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN]}>
            <MainLayout>
              <ATCClassification />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/prescription/new"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
            <MainLayout>
              <Prescription />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/prescription/edit/:id"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
            <MainLayout>
              <Prescription />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/prescriptions"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST]}>
            <MainLayout>
              <Prescriptions />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patients/:id/details"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN, ROLES.PHARMACIST]}>
            <MainLayout>
              <PatientRecordDetails />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/inventory"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
            <MainLayout>
              <Inventory />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/alerts"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
            <MainLayout>
              <Alerts />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/reports"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin/users"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <Admin />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/inventory/audit"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <InventoryAudit />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/change-password"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.ADMIN]}>
            <MainLayout>
              <ChangePassword />
            </MainLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
            <PatientLayout>
              <PatientDashboard />
            </PatientLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/profile"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
            <PatientLayout>
              <PatientProfile />
            </PatientLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/prescriptions"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
            <PatientLayout>
              <PatientPrescriptions />
            </PatientLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/change-password"
        element={(
          <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
            <PatientLayout>
              <ChangePassword />
            </PatientLayout>
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<AppHomeRedirect />} />
      <Route path="*" element={<AppHomeRedirect />} />
    </Routes>
  );
}
