import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { setAuthState } from '../auth/auth-store.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      setError('Password must contain a combination of letters and numbers.');
      return;
    }
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password, role: 'Viewer' });
      setAuthState(data.user);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <div style={authStyle}>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Create your NxtBiz account</h1>
        <label style={labelStyle}>Name<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
        <button type="submit" style={buttonStyle}>Register</button>
        {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
        <p><Link to="/login">Back to login</Link></p>
      </form>
    </div>
  );
}

const authStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1d4ed8)' };
const cardStyle = { width: 360, background: 'white', padding: 28, borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'grid', gap: 14 };
const labelStyle = { display: 'grid', gap: 6, fontSize: 14 };
const inputStyle = { padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' };
const buttonStyle = { padding: 12, borderRadius: 12, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700 };
