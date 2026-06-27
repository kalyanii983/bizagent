import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { setAuthState } from '../auth/auth-store.js';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('admin@opspilot.local');
  const [password, setPassword] = React.useState('Admin12345');
  const [error, setError] = React.useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setAuthState(data.user);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div style={authStyle}>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Sign in to NxtBiz</h1>
        <label style={labelStyle}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
        <button type="submit" style={buttonStyle}>Login</button>
        {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
        <p><Link to="/register">Don't have an account? Register</Link></p>
      </form>
    </div>
  );
}

const authStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1d4ed8)' };
const cardStyle = { width: 360, background: 'white', padding: 28, borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'grid', gap: 14 };
const labelStyle = { display: 'grid', gap: 6, fontSize: 14 };
const inputStyle = { padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' };
const buttonStyle = { padding: 12, borderRadius: 12, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700 };
