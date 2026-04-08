import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/roles';
import Topbar from '../components/Topbar';

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/atc', label: 'ATC Classification' },
  { to: '/prescription/new', label: 'New Prescription' },
  { to: '/prescriptions', label: 'Prescriptions' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/reports', label: 'Reports' },
  { to: '/admin/users', label: 'User Management' }
];

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('pims_role') || 'DOCTOR';

  const handleLogout = () => {
    localStorage.removeItem('pims_token');
    localStorage.removeItem('pims_role');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>PIMS</h1>
        <p className="helper-text" style={{ color: 'rgba(247, 249, 255, 0.72)' }}>
          {ROLE_LABELS[role] || role}
        </p>
        <nav>
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={location.pathname === item.to ? 'active' : ''}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: '1.5rem' }}>
          <button className="secondary-btn" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Topbar />
        {children}
      </main>
    </div>
  );
}