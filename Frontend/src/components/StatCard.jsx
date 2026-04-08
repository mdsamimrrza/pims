export default function StatCard({ title, value, hint }) {
  return (
    <section className="card">
      <div className="helper-text">{title}</div>
      <h3 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{value}</h3>
      <p className="helper-text">{hint}</p>
    </section>
  );
}