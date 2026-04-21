import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Topbar from '../components/Topbar';
import { logout } from '../api/pimsApi';
import { clearSession, getRoleAccessPath, getStoredUser } from '../utils/session';
import { ROLES } from '../constants/roles';
import { clearAuthState } from '../store/slices/authSlice';

export default function PatientLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const storedUser = authUser || getStoredUser();

  const handleLogout = async () => {
    const redirectPath = getRoleAccessPath(ROLES.PATIENT);

    // Navigate first so protected-route fallback does not force /login.
    navigate(redirectPath, { replace: true });

    try {
      await logout();
    } catch (_error) {
      // Local cleanup still matters even if the backend session helper call fails.
    } finally {
      clearSession();
      dispatch(clearAuthState());
    }
  };

  return (
    <div className="patient-shell">
      <Topbar />
      <main className="page-content">
        <div className="toolbar">
          <div className="page-title">
            <div className="section-title">
              <strong>{storedUser?.firstName || 'Patient'} Portal</strong>
            </div>
            <p className="helper-text">Read-only access to your own record, prescriptions, and summary information.</p>
          </div>
          <div className="toolbar-group">
            <Link className="button-ghost" to="/patient/change-password">
              Change Password
            </Link>
            <button className="button-ghost" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        </div>
        {children}
      </main>
      <footer className="app-footer">
        <span>© 2026 PIMS · Patient Portal</span>
        <span>Secure access</span>
      </footer>
    </div>
  );
}
