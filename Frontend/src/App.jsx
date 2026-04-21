import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRoutes from './routes/AppRoutes';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { SESSION_EXPIRED_EVENT } from './api/pimsApi';
import { clearAuthState, hydrateAuthSession } from './store/slices/authSlice';
import { pushToast } from './store/slices/toastSlice';
import { setTheme } from './store/slices/themeSlice';
import ToastViewport from './components/ToastViewport';
import { getRoleAccessPath } from './utils/session';

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authStatus = useSelector((state) => state.auth.status);
  const themeMode = useSelector((state) => state.theme.mode);
  const lastSessionExpiredAt = useRef(0);

  // Initialize theme on app load
  useEffect(() => {
    dispatch(setTheme(themeMode));
  }, [dispatch, themeMode]);

  useEffect(() => {
    if (authStatus === 'idle') {
      dispatch(hydrateAuthSession());
    }
  }, [authStatus, dispatch]);

  useEffect(() => {
    const handleSessionExpired = (event) => {
      const now = Date.now();
      // Guard against burst 401 responses dispatching duplicate expiry events.
      if (now - lastSessionExpiredAt.current < 1200) {
        return;
      }
      lastSessionExpiredAt.current = now;

      const role = event?.detail?.role;
      const redirectPath = getRoleAccessPath(role);

      dispatch(clearAuthState());
      dispatch(pushToast({
        type: 'warning',
        title: 'Session expired',
        message: 'Please sign in again to continue.',
        duration: 4200
      }));

      if (location.pathname !== redirectPath) {
        navigate(redirectPath, { replace: true, state: { reason: 'session-expired' } });
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [dispatch, location.pathname, navigate]);

  if (authStatus === 'checking') {
    return (
      <>
        <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <div className="helper-text">Verifying your session...</div>
        </div>
        <ToastViewport />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Navigate replace to="/doctor/access" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={<AppRoutes />} />
        <Route path="*" element={<Navigate to="/doctor/access" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}