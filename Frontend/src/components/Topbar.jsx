import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from './AppIcon';
import DarkModeToggle from './DarkModeToggle';
import { getPageTitle } from '../constants/navigation';
import { ROLE_LABELS, ROLES } from '../constants/roles';
import { logout } from '../api/pimsApi';
import { clearSession, getRoleAccessPath, getStoredDisplayName, getStoredRole, getStoredUser } from '../utils/session';
import { clearAuthState } from '../store/slices/authSlice';

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getPatientPortalName(user, fallbackName) {
  const patientName = String(user?.patient?.name || '').trim();
  if (patientName) {
    return patientName;
  }

  return fallbackName;
}

export default function Topbar({ showMenuToggle = false, onMenuToggle, isSidebarOpen = true }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authRole = useSelector((state) => state.auth.role);
  const authUser = useSelector((state) => state.auth.user);
  const profileMenuRef = useRef(null);
  const isPatientPortal = location.pathname.startsWith('/patient');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const role = authRole || getStoredRole();
  const storedUser = authUser || getStoredUser();
  const patientRecord = storedUser?.patient || null;
  const accountDisplayName = [storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ').trim()
    || storedUser?.name
    || storedUser?.email
    || getStoredDisplayName()
    || 'System User';
  const displayName = role === ROLES.PATIENT ? getPatientPortalName(storedUser, accountDisplayName) : accountDisplayName;
  const title = ROLE_LABELS[role] || role || 'User';
  const initials = getInitials(displayName);
  const patientId = patientRecord?.patientId || storedUser?.patientId || '';
  const emailAddress = storedUser?.email || '';
  const lastLoginAt = useSelector((state) => state.auth.lastLoginAt);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = async () => {
    const roleAtLogout = getStoredRole() || role;
    const redirectPath = getRoleAccessPath(roleAtLogout);

    setIsProfileMenuOpen(false);
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
    <header className={`topbar ${isPatientPortal ? 'topbar-patient' : ''}`.trim()}>
      {showMenuToggle ? (
        <button
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="sidebar-toggle sidebar-toggle-mobile"
          onClick={onMenuToggle}
          type="button"
        >
          <AppIcon name={isSidebarOpen ? 'close' : 'menu'} size={18} />
        </button>
      ) : null}
      {!isSidebarOpen && (
        <button
          aria-label="Expand sidebar"
          className="sidebar-toggle sidebar-toggle-desktop-reopen"
          onClick={onMenuToggle}
          type="button"
        >
          <AppIcon name="menu" size={18} />
        </button>
      )}
      <div className="topbar-title">
        <div className="caption">{title}</div>
        <h1>{getPageTitle(location.pathname)}</h1>
      </div>
      <div className={`topbar-actions ${isPatientPortal ? 'patient-topbar-actions' : ''}`.trim()}>
        {!isPatientPortal && (
          <>
            <label className="search-field topbar-search">
              <AppIcon name="search" size={18} />
              <input aria-label="Quick search" placeholder="Quick search..." type="search" />
            </label>
            <button aria-label="Notifications" className="icon-button" type="button">
              <AppIcon name="bell" size={20} />
            </button>
            <DarkModeToggle />
          </>
        )}

        <div className={`profile-menu ${isProfileMenuOpen ? 'is-open' : ''}`.trim()} ref={profileMenuRef}>
          <button
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="dialog"
            className="profile-chip profile-chip-button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            type="button"
          >
            <div className="profile-chip-copy">
              <div className="profile-chip-label">{displayName}</div>
              <div className="helper-text">{title}</div>
            </div>
            <div className="profile-avatar">{initials}</div>
          </button>

          {isProfileMenuOpen ? (
            <div aria-label="User account menu" className="profile-dropdown">
              <div className="profile-dropdown-head">
                <div className="profile-avatar profile-dropdown-avatar">{initials}</div>
                <div className="profile-dropdown-copy">
                  <strong>{displayName}</strong>
                  <span className="helper-text">{title}</span>
                </div>
              </div>

              <div className="profile-dropdown-meta">
                <div className="profile-dropdown-row">
                  <AppIcon name="shield" size={16} />
                  <span>Secure {role.toLowerCase()} access</span>
                </div>
                {patientId ? (
                  <div className="profile-dropdown-row">
                    <AppIcon name="users" size={16} />
                    <span>Patient ID {patientId}</span>
                  </div>
                ) : null}
                {emailAddress ? (
                  <div className="profile-dropdown-row">
                    <AppIcon name="info" size={16} />
                    <span>{emailAddress}</span>
                  </div>
                ) : null}
                {lastLoginAt ? (
                  <div className="profile-dropdown-row">
                    <AppIcon name="history" size={16} />
                    <span>
                      Signed in at {new Date(lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="profile-dropdown-actions">
                <Link
                  className="button-secondary profile-dropdown-button"
                  onClick={() => setIsProfileMenuOpen(false)}
                  to={role === ROLES.PATIENT ? '/patient/profile' : '/change-password'}
                >
                  <AppIcon name={role === ROLES.PATIENT ? 'users' : 'shield'} size={16} />
                  {role === ROLES.PATIENT ? 'View Details' : 'Security Settings'}
                </Link>
                <button className="button-ghost profile-dropdown-button" onClick={handleLogout} type="button">
                  <AppIcon name="logout" size={16} />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {isPatientPortal && (
          <div className="patient-topbar-theme">
            <DarkModeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
