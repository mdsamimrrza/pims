export default function Topbar() {
  const role = localStorage.getItem('pims_role') || 'DOCTOR';

  return (
    <header className="topbar">
      <div>
        <div className="badge">Web App</div>
        <h2 style={{ margin: '0.6rem 0 0' }}>PIMS Dashboard</h2>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="helper-text">Signed in as</div>
        <strong>{role}</strong>
      </div>
    </header>
  );
}