import StatCard from '../components/StatCard';

export default function Dashboard() {
  const role = localStorage.getItem('pims_role') || 'DOCTOR';

  return (
    <section className="page">
      <div className="page-hero">
        <div>
          <div className="badge">{role}</div>
          <h1 style={{ marginBottom: 0 }}>Dashboard</h1>
          <p className="helper-text">Web-only starter screen based on the README.</p>
        </div>
      </div>
      <div className="grid cards">
        <StatCard title="Active Prescriptions" value="128" hint="Current day status" />
        <StatCard title="Low Stock Alerts" value="7" hint="Needs pharmacist review" />
        <StatCard title="Pending Tasks" value="14" hint="Assigned to your role" />
      </div>
      <div className="panel">
        <h2>Next steps</h2>
        <p className="helper-text">
          Build the role-specific UI here as the backend endpoints become available.
        </p>
      </div>
    </section>
  );
}