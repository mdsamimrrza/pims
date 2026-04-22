import { useEffect, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Topbar from '../components/Topbar';
import AppIcon from '../components/AppIcon';
import { getNavigationForRole } from '../constants/navigation';
import { ROLES } from '../constants/roles';
import { logout } from '../api/pimsApi';
import { clearSession, getRoleAccessPath, getStoredRole } from '../utils/session';
import { clearAuthState } from '../store/slices/authSlice';
import { ROLE_LABELS } from '../constants/roles';

function navLinkClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link';
}

const SIDEBAR_PREFERENCE_KEY = 'pims_sidebar_open';

export default function MainLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.role) || getStoredRole();
  const roleTitle = ROLE_LABELS[role] || role || 'User';
  const navigation = getNavigationForRole(role);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    return stored !== 'false';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1100px)');

    const handleViewportChange = () => {
      const mobile = mediaQuery.matches;
      setIsMobileViewport(mobile);

      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, isDesktopSidebarOpen ? 'true' : 'false');
  }, [isDesktopSidebarOpen]);

  const isSidebarOpen = isMobileViewport ? isMobileSidebarOpen : isDesktopSidebarOpen;

  const toggleSidebar = () => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsDesktopSidebarOpen((current) => !current);
  };

  const closeMobileSidebar = () => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    const roleAtLogout = getStoredRole() || role;
    const redirectPath = getRoleAccessPath(roleAtLogout);

    // Move user to a public role access route first, then clear auth state.
    // This avoids guard redirects briefly forcing /login (doctor access).
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
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'} ${isMobileViewport ? 'sidebar-mobile-layout' : ''}`.trim()}>
      {isMobileViewport && isSidebarOpen ? (
        <button aria-label="Close navigation drawer" className="sidebar-overlay" onClick={closeMobileSidebar} type="button" />
      ) : null}

      <aside className={`sidebar ${isSidebarOpen ? 'is-open' : 'is-closed'}`.trim()}>
        <div className="brand-block">
          <button
            aria-label="Go to dashboard"
            className="brand-mark"
            onClick={() => {
              const homeRoute = role === ROLES.DOCTOR
                ? '/dashboard'
                : role === ROLES.PHARMACIST
                  ? '/pharmacist'
                  : role === ROLES.ADMIN
                    ? '/admin'
                    : '/patient';
              navigate(homeRoute);
            }}
            type="button"
          >
            <AppIcon name="brand" size={22} />
          </button>
          <div className="brand-copy">
            <strong>PIMS</strong>
            <span className="helper-text">{roleTitle}</span>
          </div>
          <button aria-label="Toggle sidebar" className="sidebar-toggle sidebar-toggle-in-panel" onClick={toggleSidebar} type="button">
            <AppIcon name={isSidebarOpen ? 'close' : 'menu'} size={18} />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="sidebar-nav">
          {navigation.map((item) => (
            <NavLink end key={item.to} className={navLinkClass} onClick={closeMobileSidebar} to={item.to}>
              <AppIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <Link className="sidebar-action" onClick={closeMobileSidebar} to="/change-password">
            <AppIcon name="settings" size={18} />
            <span>Settings</span>
          </Link>
          <button className="sidebar-action" onClick={handleLogout} type="button">
            <AppIcon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="app-main">
        <Topbar isSidebarOpen={isSidebarOpen} onMenuToggle={toggleSidebar} showMenuToggle />
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          <span>(c) 2026 PIMS | Pharmacy Information Management System | Connected workspace</span>
          <span>Last sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
    </div>
  );
}
