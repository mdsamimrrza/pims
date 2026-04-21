import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppIcon from './AppIcon';
import DarkModeToggle from './DarkModeToggle';
import { getPageTitle } from '../constants/navigation';
import { ROLE_LABELS, ROLES } from '../constants/roles';
import { roleProfiles } from '../data/mockData';
import { getStoredDisplayName, getStoredRole, getStoredUser } from '../utils/session';

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Topbar({ showMenuToggle = false, onMenuToggle, isSidebarOpen = true }) {
  const location = useLocation();
  const authRole = useSelector((state) => state.auth.role);
  const authUser = useSelector((state) => state.auth.user);
  const isPatientPortal = location.pathname.startsWith('/patient');
  const role = authRole || getStoredRole();
  const storedUser = authUser || getStoredUser();
  const fallbackProfile = roleProfiles[role] || roleProfiles[ROLES.DOCTOR];
  const displayName = [storedUser?.firstName, storedUser?.lastName].filter(Boolean).join(' ').trim()
    || storedUser?.name
    || storedUser?.email
    || getStoredDisplayName()
    || fallbackProfile.name;
  const title = ROLE_LABELS[storedUser?.role] || fallbackProfile.title;
  const initials = getInitials(displayName);

  return (
    <header className="topbar">
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
      <div className="topbar-actions">
        {!isPatientPortal ? (
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
        ) : (
          <>
            <span className="badge badge-accent">Patient Portal</span>
            <DarkModeToggle />
          </>
        )}
        <div className="profile-chip">
          <div>
            <div style={{ fontWeight: 700 }}>{displayName}</div>
            <div className="helper-text">{title}</div>
          </div>
          <div className="profile-avatar">{initials}</div>
        </div>
      </div>
    </header>
  );
}
