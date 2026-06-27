import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedLayout } from './layouts/ProtectedLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { GenericPage } from './pages/GenericPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { CustomersPage } from './pages/CustomersPage.jsx';
import { Customer360Page } from './pages/Customer360Page.jsx';
import { EmailsPage } from './pages/EmailsPage.jsx';
import { AIControlPage } from './pages/AIControlPage.jsx';
import { CRMPage } from './pages/CRMPage.jsx';
import { MeetingsPage } from './pages/MeetingsPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { TicketsPage } from './pages/TicketsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { WorkflowsPage } from './pages/WorkflowsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { clearAuthState, getAuthState, setAuthState } from './auth/auth-store.js';
import { api } from './api.js';

function Placeholder({ title }) {
  return <GenericPage title={title} description={`NxtBiz ${title.toLowerCase()} workspace is ready for operational data and workflows.`} />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <SessionRoutes />
    </BrowserRouter>
  );
}

function SessionRoutes() {
  const location = useLocation();
  const [session, setSession] = React.useState(getAuthState());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      setLoading(false);
      return;
    }
    let active = true;
    async function hydrate() {
      try {
        const { data } = await api.get('/api/auth/me');
        if (!active) return;
        setAuthState(data.user);
        setSession(data.user);
      } catch {
        if (!active) return;
        clearAuthState();
        setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    setSession(getAuthState());
  }, [location.pathname]);

  if (loading && location.pathname !== '/login' && location.pathname !== '/register') {
    return <div style={{ padding: 32 }}>Loading NxtBiz session...</div>;
  }

  const auth = session;
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={auth ? <ProtectedLayout><DashboardPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/users" element={
        auth ? (
          auth.role === 'Admin' || auth.role === 'Manager' ? (
            <ProtectedLayout><UsersPage /></ProtectedLayout>
          ) : (
            <ProtectedLayout>
              <div style={{ padding: 24, background: 'var(--color-card-bg)', borderRadius: 16, border: '1px solid var(--color-button-border)', color: '#ef4444', fontWeight: 'bold' }}>
                403 Forbidden: You do not have permission to access the users directory.
              </div>
            </ProtectedLayout>
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      <Route path="/customers" element={auth ? <ProtectedLayout><CustomersPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/customers/:id" element={auth ? <ProtectedLayout><Customer360Page /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/emails" element={auth ? <ProtectedLayout><EmailsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/meetings" element={auth ? <ProtectedLayout><MeetingsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/invoices" element={auth ? <ProtectedLayout><InvoicesPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/tickets" element={auth ? <ProtectedLayout><TicketsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/reports" element={auth ? <ProtectedLayout><ReportsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/crm" element={auth ? <ProtectedLayout><CRMPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/workflows" element={auth ? <ProtectedLayout><WorkflowsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="/ai-control" element={
        auth ? (
          auth.role === 'Admin' || auth.role === 'Manager' ? (
            <ProtectedLayout><AIControlPage /></ProtectedLayout>
          ) : (
            <ProtectedLayout>
              <div style={{ padding: 24, background: 'var(--color-card-bg)', borderRadius: 16, border: '1px solid var(--color-button-border)', color: '#ef4444', fontWeight: 'bold' }}>
                403 Forbidden: You do not have permission to access the AI Control Center.
              </div>
            </ProtectedLayout>
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      <Route path="/settings" element={auth ? <ProtectedLayout><SettingsPage /></ProtectedLayout> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
