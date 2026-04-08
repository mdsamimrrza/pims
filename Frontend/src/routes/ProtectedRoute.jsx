import { Navigate } from 'react-router-dom';
import { ROLES } from '../constants/roles';

function getAuthState() {
  return {
    token: localStorage.getItem('pims_token'),
    role: localStorage.getItem('pims_role')
  };
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = getAuthState();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function isAuthenticatedRole(role) {
  return Object.values(ROLES).includes(role);
}