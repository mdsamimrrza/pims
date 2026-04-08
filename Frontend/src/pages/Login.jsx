import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import RolePicker from '../components/RolePicker';
import { ROLES } from '../constants/roles';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState(ROLES.DOCTOR);
  const [email, setEmail] = useState('doctor@pims.local');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('pims_token', 'demo-token');
    localStorage.setItem('pims_role', role);
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <section className="login-card">
        <div className="badge">PIMS Web</div>
        <h1>Sign in to continue</h1>
        <p className="helper-text">Use the role selector from the README and enter any demo credentials.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <RolePicker value={role} onChange={setRole} />
          <label className="form-grid">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="form-grid">
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          <button className="primary-btn" type="submit">Enter Dashboard</button>
        </form>
      </section>
    </AuthLayout>
  );
}