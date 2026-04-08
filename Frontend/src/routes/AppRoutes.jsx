import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from '../constants/roles';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import ATCClassification from '../pages/ATCClassification';
import Prescription from '../pages/Prescription';
import Prescriptions from '../pages/Prescriptions';
import Inventory from '../pages/Inventory';
import Alerts from '../pages/Alerts';
import Reports from '../pages/Reports';
import Admin from '../pages/Admin';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={Object.values(ROLES)}>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/atc"
        element={
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN]}>
            <MainLayout>
              <ATCClassification />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescription/new"
        element={
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
            <MainLayout>
              <Prescription />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST]}>
            <MainLayout>
              <Prescriptions />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
            <MainLayout>
              <Inventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
            <MainLayout>
              <Alerts />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
              <Admin />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}