import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MoonStar, PanelLeft, Users, Mail, CalendarDays, ReceiptText, Ticket, BarChart3, Workflow, Briefcase, Cpu, Settings, Menu, X } from 'lucide-react';
import { clearAuthState, getAuthState } from '../auth/auth-store.js';
import { api } from '../api.js';
import { createSocketClient } from '../socket.js';
import { toast } from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', icon: BarChart3 },
  { label: 'Users', icon: Users },
  { label: 'Customers', icon: Users },
  { label: 'Emails', icon: Mail },
  { label: 'Meetings', icon: CalendarDays },
  { label: 'Invoices', icon: ReceiptText },
  { label: 'Tickets', icon: Ticket },
  { label: 'Reports', icon: BarChart3 },
  { label: 'CRM', icon: Briefcase },
  { label: 'Workflows', icon: Workflow },
  { label: 'AI Control', icon: Cpu },
  { label: 'Settings', icon: Settings },
];

export function ProtectedLayout({ children }) {
  const navigate = useNavigate();
  const auth = getAuthState() || { name: 'Admin User', role: 'Admin' };
  const [darkMode, setDarkMode] = React.useState(() => localStorage.getItem('nxtbiz_dark_mode') === 'true');
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  React.useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('nxtbiz_dark_mode', darkMode);
    const root = document.documentElement;
    if (darkMode) {
      root.style.setProperty('--color-bg-gradient-start', '#0f172a');
      root.style.setProperty('--color-bg-gradient-end', '#1e293b');
      root.style.setProperty('--color-card-bg', '#1e293b');
      root.style.setProperty('--color-card-text', '#f8fafc');
      root.style.setProperty('--color-text-primary', '#f8fafc');
      root.style.setProperty('--color-text-secondary', '#94a3b8');
      root.style.setProperty('--color-header-bg', 'rgba(30, 41, 59, 0.72)');
      root.style.setProperty('--color-button-bg', '#1e293b');
      root.style.setProperty('--color-button-text', '#f8fafc');
      root.style.setProperty('--color-button-border', '#334155');
      root.style.setProperty('--card-shadow', '0 10px 25px rgba(0, 0, 0, 0.3)');
      document.body.style.color = '#f8fafc';
      document.body.style.backgroundColor = '#0f172a';
    } else {
      root.style.setProperty('--color-bg-gradient-start', '#f8fafc');
      root.style.setProperty('--color-bg-gradient-end', '#eef2ff');
      root.style.setProperty('--color-card-bg', 'white');
      root.style.setProperty('--color-card-text', '#0f172a');
      root.style.setProperty('--color-text-primary', '#0f172a');
      root.style.setProperty('--color-text-secondary', '#475569');
      root.style.setProperty('--color-header-bg', 'rgba(255, 255, 255, 0.72)');
      root.style.setProperty('--color-button-bg', 'white');
      root.style.setProperty('--color-button-text', '#0f172a');
      root.style.setProperty('--color-button-border', '#cbd5e1');
      root.style.setProperty('--card-shadow', '0 10px 25px rgba(15, 23, 42, 0.06)');
      document.body.style.color = '#0f172a';
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [darkMode]);

  const [notifications, setNotifications] = React.useState([]);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.items || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    const socket = createSocketClient();
    
    socket.on('agent_completed', (payload) => {
      fetchNotifications();
      toast.success(`Orchestration Complete: Classified as "${payload?.context?.intent || 'inquiry'}"`);
      window.dispatchEvent(new CustomEvent('socket_agent_completed'));
    });

    socket.on('workflow_executed', (payload) => {
      fetchNotifications();
      const statusText = payload?.log?.status === 'completed' ? 'Executed Successfully' : 'Skipped';
      toast.success(`Workflow "${payload?.workflow?.name || 'Automation'}" -> ${statusText}`);
      window.dispatchEvent(new CustomEvent('socket_workflow_executed'));
    });

    socket.on('new_email', (payload) => {
      fetchNotifications();
      toast.success(`Email processed successfully: "${payload?.subject || 'No Subject'}"`);
      window.dispatchEvent(new CustomEvent('socket_new_email', { detail: payload }));
    });

    socket.on('new_ticket', (payload) => {
      fetchNotifications();
      toast.success(`Ticket created successfully: #${payload?.id}`);
      window.dispatchEvent(new CustomEvent('socket_new_ticket', { detail: payload }));
    });

    socket.on('new_invoice', (payload) => {
      fetchNotifications();
      toast.success(`Invoice created successfully: #${payload?.id}`);
      window.dispatchEvent(new CustomEvent('socket_new_invoice', { detail: payload }));
    });

    socket.on('new_meeting', (payload) => {
      fetchNotifications();
      toast.success(`Meeting scheduled successfully: "${payload?.title}"`);
      window.dispatchEvent(new CustomEvent('socket_new_meeting', { detail: payload }));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchNotifications]);

  async function handleMarkAsRead(id) {
    try {
      await api.put(`/api/notifications/${id}`, { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', background: 'linear-gradient(180deg, var(--color-bg-gradient-start) 0%, var(--color-bg-gradient-end) 100%)', color: 'var(--color-text-primary)', transition: 'background 0.3s, color 0.3s' }}>
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}

      <aside style={{
        padding: 24,
        background: '#0f172a',
        color: '#e2e8f0',
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          left: isMobileOpen ? 0 : -280,
          width: 280,
          height: '100vh',
          zIndex: 100,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobileOpen ? '5px 0 25px rgba(0,0,0,0.5)' : 'none',
        } : {})
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>NxtBiz</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Operations console</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, color: '#60a5fa', fontWeight: 'bold' }}>Role: {auth.role}</div>
          </div>
          {isMobile ? (
            <button onClick={() => setIsMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          ) : (
            <PanelLeft size={18} />
          )}
        </div>

        <nav style={{ display: 'grid', gap: 8 }}>
          {navItems
            .filter(({ label }) => {
              if (label === 'Users') {
                return auth.role === 'Admin' || auth.role === 'Manager';
              }
              return true;
            })
            .map(({ label, icon: Icon }) => (
              <Link key={label} to={label === 'Dashboard' ? '/' : `/${label.toLowerCase()}`} onClick={() => isMobile && setIsMobileOpen(false)} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                <Icon size={16} />
                <span>{label}</span>
                </div>
              </Link>
            ))}
        </nav>
      </aside>

      <main style={{ padding: isMobile ? 16 : 28 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, background: 'var(--color-header-bg)', padding: 16, borderRadius: 18, backdropFilter: 'blur(10px)', transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setIsMobileOpen(true)} style={{ ...buttonStyle, padding: 8 }}>
                <Menu size={20} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-secondary)' }}>Signed in</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{auth.name}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Role: {auth.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
            {!isMobile && <span style={{ fontSize: 14, fontWeight: 600, marginRight: 8 }}>{auth.name}</span>}
            <button type="button" style={buttonStyle} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={16} /> {unreadCount} {unreadCount === 1 ? 'Alert' : 'Alerts'}
            </button>
            
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 140,
                width: 320,
                background: 'var(--color-card-bg)',
                borderRadius: 16,
                boxShadow: 'var(--card-shadow)',
                border: '1px solid var(--color-button-border)',
                zIndex: 50,
                padding: 16,
                maxHeight: 400,
                overflowY: 'auto',
                display: 'grid',
                gap: 12,
                color: 'var(--color-text-primary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        for (const n of notifications.filter(x => !x.read)) {
                          await handleMarkAsRead(n.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    No alerts at the moment.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background: n.read ? 'transparent' : 'rgba(29, 78, 216, 0.08)',
                          border: '1px solid var(--color-button-border)',
                          display: 'grid',
                          gap: 4,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</span>
                          {!n.read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="button" style={buttonStyle} onClick={() => setDarkMode(!darkMode)}><MoonStar size={16} /> {darkMode ? 'Light' : 'Dark'}</button>
            <button
              type="button"
              style={buttonStyle}
              onClick={async () => {
                await api.post('/api/auth/logout');
                clearAuthState();
                navigate('/login');
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid var(--color-button-border)',
  background: 'var(--color-button-bg)',
  color: 'var(--color-button-text)',
  padding: '10px 14px',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background 0.3s, color 0.3s, border-color 0.3s',
};
