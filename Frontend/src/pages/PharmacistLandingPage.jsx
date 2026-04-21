import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';

export default function PharmacistLandingPage() {
  return (
    <div className="pharmacist-landing-shell">
      <header className="pharmacist-landing-header">
        <div className="pharmacist-landing-brand">
          <span className="brand-mark" style={{ width: '2rem', height: '2rem' }}>
            <AppIcon name="brand" size={18} />
          </span>
          <strong>RxConnect</strong>
        </div>
        <Link className="button-ghost" to="/pharmacist/login">Login</Link>
      </header>

      <main>
        <section className="pharmacist-hero">
          <span className="pharmacist-hero-badge">Professional Portal</span>
          <h1>For Pharmacists</h1>
          <p>
            Optimize your pharmacy workflow. Manage inventory, receive real-time
            prescription alerts, and generate detailed dispensing reports.
          </p>

          <div className="pharmacist-hero-actions">
            <Link className="button-primary login-submit" to="/pharmacist/login">
              Sign up - Pharmacist
            </Link>
            <Link to="/doctor/access" className="button-ghost">Connect to Doctor</Link>
            <span className="helper-text">Login (existing users)</span>
          </div>
        </section>

        <section className="pharmacist-tools">
          <h2>Integrated Tools</h2>
          <p className="helper-text">Built for high-volume clinical environments.</p>

          <div className="pharmacist-tools-grid">
            <article className="pharmacist-tool-card">
              <span className="pharmacist-tool-icon"><AppIcon name="inventory" size={16} /></span>
              <strong>Real-time Inventory</strong>
              <p className="helper-text">Track stock levels and automate reorder alerts for critical medications.</p>
            </article>
            <article className="pharmacist-tool-card">
              <span className="pharmacist-tool-icon"><AppIcon name="alert" size={16} /></span>
              <strong>Safety Alerts</strong>
              <p className="helper-text">Instant notifications for new prescriptions and drug interaction warnings.</p>
            </article>
            <article className="pharmacist-tool-card">
              <span className="pharmacist-tool-icon"><AppIcon name="reports" size={16} /></span>
              <strong>Compliance Reports</strong>
              <p className="helper-text">Generate audit-ready reports on dispensing history and narcotics tracking.</p>
            </article>
          </div>
        </section>

        <section className="pharmacist-dispensing">
          <div className="pharmacist-dispensing-copy">
            <h2>Streamlined Dispensing</h2>
            <p className="helper-text">
              Connect directly with prescribing doctors to eliminate legibility issues and
              transcription errors. Our unified system ensures that pharmacists spend less
              time on paperwork and more time on patient care.
            </p>
            <ul>
              <li>Verified Digital Signatures</li>
              <li>Automated Insurance Verification</li>
              <li>Secure Provider Messaging</li>
            </ul>
          </div>

          <div className="pharmacist-dispensing-visual" aria-hidden="true">
            <div className="pharmacist-visual-row short" />
            <div className="pharmacist-visual-row" />
            <span className="pharmacist-visual-tag">Inventory Dashboard Preview</span>
            <div className="pharmacist-visual-row" />
            <div className="pharmacist-visual-row" />
          </div>
        </section>
      </main>

      <footer className="pharmacist-landing-footer">
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

      <div className="pharmacist-landing-copyright helper-text">
        © 2026 RxConnect. All rights reserved. Professional Prescription Wireframe System.
      </div>
    </div>
  );
}
