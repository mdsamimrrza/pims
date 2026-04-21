import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import DarkModeToggle from '../components/DarkModeToggle';

export default function DoctorLandingPage() {
  return (
    <div className="doctor-landing-shell">
      <header className="doctor-landing-header">
        <div className="doctor-landing-brand">
          <span className="brand-mark" style={{ width: '2rem', height: '2rem' }}>
            <AppIcon name="brand" size={18} />
          </span>
          <strong>RxConnect</strong>
        </div>
        <div className="doctor-landing-header-actions">
          <Link className="button-ghost" to="/doctor/login">Login</Link>
          <DarkModeToggle />
        </div>
      </header>

      <main>
        <section className="doctor-hero">
          <span className="doctor-hero-badge">Professional Portal</span>
          <h1>For Doctors</h1>
          <p>
            Securely create and manage digital prescriptions with a clinical-first
            interface designed for speed and patient safety.
          </p>

          <div className="doctor-hero-actions">
            <Link className="button-primary login-submit" to="/doctor/login">
              Sign up - Doctor
            </Link>
            <Link className="button-ghost" to="/pharmacist/access">
              Connect to Pharmacist
            </Link>
            <span className="helper-text">Login (existing users)</span>
          </div>
        </section>

        <section className="doctor-capabilities">
          <h2>Platform Capabilities</h2>
          <p className="helper-text">Streamline your daily clinical workflow with our core toolset.</p>

          <div className="doctor-capability-list">
            <div className="doctor-capability-item">
              <span className="doctor-capability-icon"><AppIcon name="users" size={16} /></span>
              <span>Real-time patient search and verification</span>
            </div>
            <div className="doctor-capability-item">
              <span className="doctor-capability-icon"><AppIcon name="prescription" size={16} /></span>
              <span>Template-based prescription generation</span>
            </div>
            <div className="doctor-capability-item">
              <span className="doctor-capability-icon"><AppIcon name="clock" size={16} /></span>
              <span>Automated history and interaction logs</span>
            </div>
          </div>

          <div className="doctor-capabilities-login helper-text">
            Already have an account? <Link to="/doctor/login">Log in here</Link>
          </div>
        </section>

        <section className="doctor-highlight">
          <div className="doctor-highlight-copy">
            <h2>A unified system for clinical excellence.</h2>
            <p className="helper-text">
              RxConnect bridges the gap between diagnosis and dispensing. By joining our network,
              you ensure that your prescriptions are transmitted securely and accurately to partner pharmacies.
            </p>

            <div className="doctor-highlight-metrics">
              <div className="doctor-highlight-metric">
                <strong>100%</strong>
                <span>Digital accuracy</span>
              </div>
              <div className="doctor-highlight-metric">
                <strong>HIPAA</strong>
                <span>Compliance ready</span>
              </div>
            </div>
          </div>

          <div className="doctor-highlight-visual" aria-hidden="true">
            <span className="doctor-highlight-tag">Secure portal view</span>
          </div>
        </section>
      </main>

      <footer className="doctor-landing-footer">
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

      <div className="doctor-landing-copyright helper-text">
        © 2026 RxConnect. All rights reserved. Professional Prescription Wireframe System.
      </div>
    </div>
  );
}
