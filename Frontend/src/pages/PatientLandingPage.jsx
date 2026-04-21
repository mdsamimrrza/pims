import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';

export default function PatientLandingPage() {
  return (
    <div className="patient-landing-shell">
      <header className="patient-landing-header">
        <div className="patient-landing-brand">
          <span className="brand-mark" style={{ width: '2rem', height: '2rem' }}>
            <AppIcon name="brand" size={18} />
          </span>
          <strong>RxConnect</strong>
        </div>
        <div className="patient-landing-header-actions">
          <Link className="button-ghost" to="/patient/login">Login</Link>
          <DarkModeToggle />
        </div>
      </header>

      <main>
        <section className="patient-hero">
          <span className="patient-hero-badge">Patient Portal</span>
          <h1>For Patients</h1>
          <p>
            View your prescriptions, treatment history, and profile updates through
            a secure, read-only healthcare portal.
          </p>

          <div className="patient-hero-actions">
            <Link className="button-primary login-submit" to="/patient/login">
              Sign up - Patient
            </Link>
            <span className="helper-text">Login (existing users)</span>
          </div>
        </section>

        <section className="patient-features">
          <h2>Patient Features</h2>
          <p className="helper-text">Simple tools to help you stay informed about your medication care.</p>

          <div className="patient-features-grid">
            <article className="patient-feature-card">
              <span className="patient-feature-icon"><AppIcon name="prescription" size={16} /></span>
              <strong>Prescription Timeline</strong>
              <p className="helper-text">Track your active and previous prescriptions in one place.</p>
            </article>
            <article className="patient-feature-card">
              <span className="patient-feature-icon"><AppIcon name="download" size={16} /></span>
              <strong>PDF Downloads</strong>
              <p className="helper-text">Download prescription copies when provided by your care team.</p>
            </article>
            <article className="patient-feature-card">
              <span className="patient-feature-icon"><AppIcon name="shield" size={16} /></span>
              <strong>Private Access</strong>
              <p className="helper-text">Only your linked patient record is visible in this portal.</p>
            </article>
          </div>
        </section>

        <section className="patient-journey">
          <div className="patient-journey-copy">
            <h2>Your care journey in one place</h2>
            <p className="helper-text">
              Stay connected to your treatment progress without paperwork confusion.
              Review your latest prescription status and keep a digital history for clinic visits.
            </p>
            <ul>
              <li>Secure account linked by clinic staff</li>
              <li>Medication status visibility</li>
              <li>Safer communication during follow-ups</li>
            </ul>
          </div>

          <div className="patient-journey-visual" aria-hidden="true">
            <div className="patient-visual-row short" />
            <div className="patient-visual-row" />
            <span className="patient-visual-tag">Patient dashboard preview</span>
            <div className="patient-visual-row" />
            <div className="patient-visual-row" />
          </div>
        </section>
      </main>

      <footer className="patient-landing-footer">
        <div>
          <h4>Company</h4>
          <span>About us</span>
          <span>Contact</span>
          <span>Careers</span>
        </div>
        <div>
          <h4>Resources</h4>
          <span>Documentation</span>
          <span>Help center</span>
          <span>Status</span>
        </div>
        <div>
          <h4>Legal</h4>
          <span>Privacy policy</span>
          <span>Terms of service</span>
          <span>Cookies</span>
        </div>
      </footer>

      <div className="patient-landing-copyright helper-text">
        © 2026 RxConnect. All rights reserved. Professional Prescription Wireframe System.
      </div>
    </div>
  );
}
