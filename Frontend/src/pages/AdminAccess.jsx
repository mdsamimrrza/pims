import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AppIcon from '../components/AppIcon';
import {
  getAdminAccessLockState,
  grantAdminLoginAccess,
  registerFailedAdminAccessAttempt
} from '../utils/adminAccess';

export default function AdminAccess() {
  const navigate = useNavigate();
  const [accessKey, setAccessKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockState, setLockState] = useState(getAdminAccessLockState());

  const configuredAccessKey = String(import.meta.env.VITE_ADMIN_LOGIN_KEY || '').trim();

  useEffect(() => {
    if (!lockState.isLocked) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setLockState(getAdminAccessLockState());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lockState.isLocked]);

  const lockCountdownText = (() => {
    if (!lockState.isLocked) {
      return '';
    }

    const remainingMs = Math.max(0, lockState.lockUntil - Date.now());
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  })();

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage('');
    setLockState(getAdminAccessLockState());

    if (!configuredAccessKey) {
      setErrorMessage('Admin access key is not configured. Contact system owner.');
      return;
    }

    if (lockState.isLocked) {
      setErrorMessage(`Too many attempts. Try again in ${lockCountdownText || 'a few minutes'}.`);
      return;
    }

    setIsSubmitting(true);

    if (accessKey.trim() !== configuredAccessKey) {
      const attemptResult = registerFailedAdminAccessAttempt();
      setLockState(getAdminAccessLockState());

      if (attemptResult.isLocked) {
        setErrorMessage('Too many invalid attempts. Admin access is temporarily locked for 5 minutes.');
      } else {
        setErrorMessage(`Invalid admin access key. Attempts left: ${attemptResult.attemptsRemaining}.`);
      }

      setIsSubmitting(false);
      return;
    }

    grantAdminLoginAccess();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AuthLayout>
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <AppIcon name="shield" size={24} />
          </span>
          <div>
            <h1>Admin Access Check</h1>
            <p className="helper-text">
              Enter the restricted access key before opening the admin login page.
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            <span>Admin Access Key</span>
            <div className="search-field">
              <AppIcon name="admin" size={18} />
              <input
                autoComplete="off"
                onChange={(event) => setAccessKey(event.target.value)}
                required
                type="password"
                value={accessKey}
                disabled={lockState.isLocked || isSubmitting}
              />
            </div>
          </label>

          {errorMessage ? (
            <div className="helper-text" style={{ color: 'var(--danger)' }}>
              {errorMessage}
            </div>
          ) : null}

          {lockState.isLocked ? (
            <div className="helper-text" style={{ color: 'var(--warning)' }}>
              Access is locked. Try again in {lockCountdownText}.
            </div>
          ) : null}

          <button className="button-primary login-submit" disabled={isSubmitting || lockState.isLocked} type="submit">
            {isSubmitting ? 'Checking...' : 'Continue to Admin Login'}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
}
