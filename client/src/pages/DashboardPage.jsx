import React from 'react';
import { api } from '../api.js';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Heart, RefreshCw, Mail, UserPlus, ArrowUpRight, Cpu } from 'lucide-react';
import { createSocketClient } from '../socket.js';

export function DashboardPage() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  async function fetchDashboard() {
    try {
      setRefreshing(true);
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    fetchDashboard();

    const socket = createSocketClient();
    
    socket.on('agent_completed', () => {
      fetchDashboard();
    });

    socket.on('workflow_executed', () => {
      fetchDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const mockRevenueHistory = [
    { name: 'Jan', amount: 18000 },
    { name: 'Feb', amount: 32000 },
    { name: 'Mar', amount: 45000 },
    { name: 'Apr', amount: 73000 },
    { name: 'May', amount: 95000 },
    { name: 'Jun', amount: data?.overview?.revenue || 128240 },
  ];

  const mockActivityTrends = [
    { name: 'Mon', Emails: 12, Workflows: 4 },
    { name: 'Tue', Emails: 19, Workflows: 8 },
    { name: 'Wed', Emails: 15, Workflows: 6 },
    { name: 'Thu', Emails: 22, Workflows: 11 },
    { name: 'Fri', Emails: 28, Workflows: 15 },
  ];

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: 'var(--color-text-secondary)' }}>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} />
          <span>Hydrating NxtBiz intelligence...</span>
        </div>
      </div>
    );
  }

  const revenue = data?.overview?.revenue || 128240;
  const activity = data?.overview?.activity || 42;
  const healthScore = data?.overview?.healthScore || 87;
  const healthFactors = data?.overview?.healthScoreFactors || {
    customerSatisfaction: 85,
    responseTime: 92,
    invoiceCollection: 80,
    ticketResolution: 75,
    leadConversion: 82,
  };

  const kpis = [
    {
      label: 'Annualized Revenue',
      value: `$${revenue.toLocaleString()}`,
      trend: '+14.2%',
      desc: 'from last month',
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: '#ffffff',
    },
    {
      label: 'Business Health',
      value: `${healthScore} / 100`,
      trend: 'Optimal',
      desc: 'spec-driven validation',
      icon: Heart,
      gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      color: '#ffffff',
    },
    {
      label: 'Operational Activity',
      value: `${activity} actions`,
      trend: 'Active',
      desc: 'CRM & Email interactions',
      icon: Activity,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      color: '#ffffff',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'grid', gap: 24 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Executive Dashboard</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Real-time analytics and autonomous operation metrics.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid var(--color-button-border)',
            background: 'var(--color-button-bg)',
            color: 'var(--color-button-text)',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={15} />
          Sync Data
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {kpis.map((kpi, idx) => (
          <motion.article
            key={kpi.label}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            style={{
              background: kpi.gradient,
              color: kpi.color,
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>{kpi.label}</span>
              <kpi.icon size={20} style={{ opacity: 0.9 }} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 850, marginTop: 14, letterSpacing: '-0.5px' }}>{kpi.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13 }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                {kpi.trend}
              </span>
              <span style={{ opacity: 0.8 }}>{kpi.desc}</span>
            </div>
            {kpi.label === 'Business Health' && (
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12, fontSize: 11, display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Factor Breakdown:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Customer Satisfaction (28%):</span> <span>{healthFactors.customerSatisfaction}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Response Time (16%):</span> <span>{healthFactors.responseTime}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice Collection (20%):</span> <span>{healthFactors.invoiceCollection}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ticket Resolution (20%):</span> <span>{healthFactors.ticketResolution}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lead Conversion (16%):</span> <span>{healthFactors.leadConversion}/100</span>
                </div>
              </div>
            )}
          </motion.article>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
        <motion.div variants={itemVariants} style={chartCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Revenue Growth</h3>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Invoice Collections (YTD)</span>
            </div>
            <ArrowUpRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={mockRevenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card-bg)',
                    borderColor: 'var(--color-button-border)',
                    borderRadius: 12,
                    color: 'var(--color-text-primary)'
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={chartCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Operations Volume</h3>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Automated flows vs incoming communications</span>
            </div>
            <Activity size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={mockActivityTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card-bg)',
                    borderColor: 'var(--color-button-border)',
                    borderRadius: 12,
                    color: 'var(--color-text-primary)'
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Emails" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Workflows" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recents Section */}
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <motion.div variants={itemVariants} style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Mail size={18} style={{ color: '#8b5cf6' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Recent Emails</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data?.recent?.emails?.length > 0 ? (
              data.recent.emails.map((email) => (
                <div key={email.id} style={listItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{email.subject}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 750,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: 20,
                      background: email.sentiment === 'positive' ? '#d1fae5' : email.sentiment === 'negative' ? '#fee2e2' : '#f1f5f9',
                      color: email.sentiment === 'positive' ? '#065f46' : email.sentiment === 'negative' ? '#991b1b' : '#334155',
                    }}>
                      {email.sentiment || 'neutral'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    <span>From: {email.sender}</span>
                    <span>{email.urgency} urgency</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                No recent emails found.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <UserPlus size={18} style={{ color: '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Recent Customers</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data?.recent?.customers?.length > 0 ? (
              data.recent.customers.map((c) => (
                <div key={c.id} style={listItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{c.name}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}>
                      {c.company || 'Private'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    <span>{c.email}</span>
                    <span style={{ color: c.healthScore >= 80 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                      Health: {c.healthScore || 100}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                No recent customers registered.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={sectionCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Cpu size={18} style={{ color: '#3b82f6' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Agent Activity</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data?.recent?.agentExecutions?.length > 0 ? (
              data.recent.agentExecutions.map((exec) => (
                <div key={exec.id} style={listItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{exec.agentId || 'Unknown Agent'}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 750,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: 20,
                      background: exec.status === 'completed' ? '#d1fae5' : '#fee2e2',
                      color: exec.status === 'completed' ? '#065f46' : '#991b1b',
                    }}>
                      {exec.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    <span>{new Date(exec.startedAt || exec.finishedAt).toLocaleTimeString()}</span>
                    <span>{exec.finishedAt ? 'Completed' : 'Running'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                No recent agent executions found.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

const chartCardStyle = {
  background: 'var(--color-card-bg)',
  borderRadius: 24,
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--color-button-border)',
  transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
};

const sectionCardStyle = {
  background: 'var(--color-card-bg)',
  borderRadius: 24,
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--color-button-border)',
  transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
};

const listItemStyle = {
  padding: 16,
  borderRadius: 16,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--color-button-border)',
  display: 'grid',
  gap: 2,
};
