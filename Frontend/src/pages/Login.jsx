import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AuthLayout from '../layouts/AuthLayout';
import RolePicker from '../components/RolePicker';
import AppIcon from '../components/AppIcon';
import { login as loginRequest, getApiMessage } from '../api/pimsApi';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { getRoleHomePath, getStoredRole, isValidRole, setAuthSession } from '../utils/session';
import { setAuthenticatedSession } from '../store/slices/authSlice';
import useToast from '../hooks/useToast';

const ROLE_EMAIL_DEFAULTS = {
  [ROLES.DOCTOR]: 'doctor@pims.com',
  [ROLES.PHARMACIST]: 'pharma@pims.com',
  [ROLES.ADMIN]: 'admin@pims.com',
  [ROLES.PATIENT]: ''
};

const ROLE_HELPER_COPY = {
  [ROLES.DOCTOR]: 'Clinical access for prescribers and review workflows.',
  [ROLES.PHARMACIST]: 'Dispensing, inventory, and medication control access.',
  [ROLES.ADMIN]: 'Administrative access for user and system management.',
  [ROLES.PATIENT]: 'Read-only access to your own prescriptions and summary information.'
};

const ROLE_ICON = {
  [ROLES.DOCTOR]: 'doctor',
  [ROLES.PHARMACIST]: 'pharmacist',
  [ROLES.ADMIN]: 'admin',
  [ROLES.PATIENT]: 'users'
};

const AUTH_RATE_LIMIT_KEY = 'pims_auth_rate_limit_until';

function parseStoredLockoutUntil() {
  const rawValue = localStorage.getItem(AUTH_RATE_LIMIT_KEY);
  const timestamp = Number(rawValue);
  return Number.isFinite(timestamp) && timestamp > Date.now() ? timestamp : 0;
}

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getRateLimitResetAt(error) {
  const headers = error?.response?.headers || {};
  const retryAfter = Number(headers['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Date.now() + (retryAfter * 1000);
  }

  const rateLimitReset = Number(headers['ratelimit-reset']);
  if (Number.isFinite(rateLimitReset) && rateLimitReset > 0) {
    return Date.now() + (rateLimitReset * 1000);
  }

  return Date.now() + (15 * 60 * 1000);
}

function getRoleAccessPath(role) {
  switch (role) {
    case ROLES.PHARMACIST:
      return '/pharmacist/access';
    case ROLES.PATIENT:
      return '/patient/access';
    case ROLES.ADMIN:
      return '/admin/access';
    case ROLES.DOCTOR:
    default:
      return '/doctor/access';
  }
}

export default function Login({ forcedRole = null, showRolePicker = true, pageTitle, pageSubtitle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state) => state.auth.token);
  const storedRole = useSelector((state) => state.auth.role);
  const { notifyError, notifySuccess } = useToast();
  const initialRole = isValidRole(forcedRole) ? forcedRole : ROLES.DOCTOR;
  const [role, setRole] = useState(initialRole);
  const activeRole = isValidRole(forcedRole) ? forcedRole : role;
  const [email, setEmail] = useState(ROLE_EMAIL_DEFAULTS[initialRole]);
  const [password, setPassword] = useState('test123');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitResetAt, setRateLimitResetAt] = useState(() => parseStoredLockoutUntil());
  const [now, setNow] = useState(Date.now());
  const sessionExpiredReason = location.state?.reason === 'session-expired';
  const isRateLimited = rateLimitResetAt > now;
  const countdownLabel = isRateLimited ? formatCountdown(rateLimitResetAt - now) : '';

  useEffect(() => {
    if (isValidRole(forcedRole)) {
      setRole(forcedRole);
    }
  }, [forcedRole]);

  useEffect(() => {
    if (!rateLimitResetAt) {
      localStorage.removeItem(AUTH_RATE_LIMIT_KEY);
      setErrorMessage((current) => (
        current.startsWith('Too many requests') ? '' : current
      ));
      return undefined;
    }

    if (rateLimitResetAt <= Date.now()) {
      setRateLimitResetAt(0);
      localStorage.removeItem(AUTH_RATE_LIMIT_KEY);
      setErrorMessage((current) => (
        current.startsWith('Too many requests') ? '' : current
      ));
      return undefined;
    }

    localStorage.setItem(AUTH_RATE_LIMIT_KEY, String(rateLimitResetAt));

    const timerId = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= rateLimitResetAt) {
        setRateLimitResetAt(0);
        localStorage.removeItem(AUTH_RATE_LIMIT_KEY);
        setErrorMessage((current) => (
          current.startsWith('Too many requests') ? '' : current
        ));
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [rateLimitResetAt]);

  useEffect(() => {
    setEmail(ROLE_EMAIL_DEFAULTS[activeRole]);
    setPassword('test123');
  }, [activeRole]);

  if (token) {
    return <Navigate replace to={getRoleHomePath(storedRole || getStoredRole())} />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isRateLimited) {
      const message = `Too many requests. Try again in ${countdownLabel}.`;
      setErrorMessage(message);
      notifyError('Login temporarily locked', message, 2400);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const data = await loginRequest({ email, password, role: activeRole });

      if (!isValidRole(data?.user?.role)) {
        throw new Error('Invalid role returned by server.');
      }

      setAuthSession({
        token: data.token,
        user: data.user,
        rememberDevice
      });
      dispatch(setAuthenticatedSession({ token: data.token, user: data.user }));
      notifySuccess('Signed in', `Welcome ${data.user?.firstName || data.user?.email || 'back'}.`, 2800);
      navigate(getRoleHomePath(data.user.role));
    } catch (error) {
      const isTooManyRequests = error?.response?.status === 429;
      const message = isTooManyRequests
        ? `Too many requests from this IP. Try again in ${formatCountdown(getRateLimitResetAt(error) - Date.now())}.`
        : getApiMessage(error, 'Login failed');

      if (isTooManyRequests) {
        const resetAt = getRateLimitResetAt(error);
        setRateLimitResetAt(resetAt);
      }

      if (!isTooManyRequests) {
        setErrorMessage(message);
      }
      notifyError('Login failed', message, 4200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <AppIcon name={ROLE_ICON[activeRole] || 'brand'} size={22} />
          </span>
          <strong>
            {isValidRole(forcedRole) ? `${ROLE_LABELS[activeRole]} Access` : 'PIMS'}
          </strong>
          <div>
            <h1>
              {pageTitle || (isValidRole(forcedRole) ? `Sign in as ${ROLE_LABELS[activeRole]}` : 'Sign in to PIMS')}
            </h1>
            <p className="helper-text">
              {pageSubtitle || ROLE_HELPER_COPY[activeRole] || 'Pharmacy Information Management System'}
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {sessionExpiredReason ? (
            <div className="helper-text" style={{ color: 'var(--warning)', marginBottom: '-0.2rem', textAlign: 'center' }}>
              Your previous session ended. Sign in again to continue.
            </div>
          ) : null}

          {isRateLimited ? (
            <div className="helper-text" style={{ color: 'var(--warning)', marginBottom: '-0.2rem', textAlign: 'center' }}>
              Too many requests from this IP. Try again in {countdownLabel}.
            </div>
          ) : null}

          {showRolePicker && !isValidRole(forcedRole) ? (
            <div className="toolbar" style={{ marginBottom: '-0.2rem' }}>
              <strong>I am a...</strong>
              <span className="caption">Select role</span>
            </div>
          ) : null}

          {showRolePicker && !isValidRole(forcedRole) ? <RolePicker value={role} onChange={setRole} /> : null}

          {isValidRole(forcedRole) ? (
            <div className="login-role-badge">
              <span className="badge badge-accent">
                <AppIcon name={ROLE_ICON[activeRole] || 'users'} size={14} />
                {ROLE_LABELS[activeRole]} login
              </span>
            </div>
          ) : null}

          <label className="field-label">
            <span>Work Email</span>
            <div className="search-field">
              <AppIcon name="users" size={16} />
              <input
                onChange={(event) => setEmail(event.target.value)}
                placeholder={isValidRole(forcedRole) && activeRole === ROLES.PATIENT ? 'patient@example.com' : undefined}
                type="email"
                value={email}
              />
            </div>
          </label>

          <label className="field-label">
            <div className="toolbar">
              <span>Password</span>
              <Link className="helper-text" to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="search-field">
              <AppIcon name="shield" size={16} />
              <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </div>
          </label>

          <label className="checkbox-row">
            <input
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              type="checkbox"
            />
            <span>Remember this device for 30 days</span>
          </label>

          {!isRateLimited && errorMessage ? (
            <div className="helper-text" style={{ color: 'var(--danger)', textAlign: 'center' }}>
              {errorMessage}
            </div>
          ) : null}

          <button className="button-primary login-submit" disabled={isSubmitting || isRateLimited} type="submit">
            {isSubmitting ? 'Signing in...' : isRateLimited ? `Try again in ${countdownLabel}` : `Continue as ${ROLE_LABELS[activeRole]}`}
          </button>

          <div className="helper-text" style={{ textAlign: 'center' }}>
            By signing in, you agree to the HIPAA Compliance Standards and Terms of Use.
          </div>

          {isValidRole(forcedRole) ? (
            <div className="helper-text" style={{ textAlign: 'center' }}>
              <Link className="button-ghost" to={getRoleAccessPath(activeRole)}>Back to {ROLE_LABELS[activeRole]} page</Link>
            </div>
          ) : null}
        </form>

        <div className="footer-note">
          <span className="badge">
            <AppIcon name="shield" size={14} />
            Secure SSL Encrypted
          </span>
          <span className="badge">
            <AppIcon name="doctor" size={14} />
            doctor@pims.com / test123
          </span>
        </div>
      </section>
    </AuthLayout>
  );
}
