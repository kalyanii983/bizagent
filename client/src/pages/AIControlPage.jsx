import React from 'react';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Cpu, Play, Clock, ChevronRight, X, ArrowUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AIControlPage() {
  const auth = getAuthState() || { role: 'Viewer' };
  const isAdmin = auth.role === 'Admin';
  const isManager = auth.role === 'Manager';
  const hasAccess = isAdmin || isManager;

  const [agents, setAgents] = React.useState([]);
  const [executions, setExecutions] = React.useState([]);
  const [emails, setEmails] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Expandable execution log modal
  const [selectedExecution, setSelectedExecution] = React.useState(null);

  // Manual run modal state
  const [showRunModal, setShowRunModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedEmailId, setSelectedEmailId] = React.useState('');
  const [customPayload, setCustomPayload] = React.useState({
    subject: '',
    body: '',
    sender: '',
  });

  // Sorting state for executions
  const [sortAsc, setSortAsc] = React.useState(false); // Default newest first

  // Pagination for executions
  const [currentExecPage, setCurrentExecPage] = React.useState(1);
  const execsPerPage = 10;

  const agentDescriptions = {
    'intent-agent': 'Analyzes sentiment, intent, and urgency of incoming requests.',
    'task-planner-agent': 'Creates execution plan and maps required domain agents.',
    'email-agent': 'Generates responses and processes sales opportunities.',
    'crm-agent': 'Preserves context, customer records, and timelines.',
    'meeting-agent': 'Schedules meetings and syncs attendee parameters.',
    'invoice-agent': 'Builds, calculates, and publishes PDF invoices.',
    'customer-support-agent': 'Triggers ticket triage and tracks resolution flows.',
    'chief-of-staff-agent': 'Summarizes execution actions and reviews output logs.',
  };

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [agentsRes, execsRes, emailsRes] = await Promise.all([
        api.get('/api/agents'),
        api.get('/api/agents/executions'),
        api.get('/api/emails').catch(() => ({ data: { items: [] } })),
      ]);
      setAgents(agentsRes.data.items || []);
      setExecutions(execsRes.data.items || []);
      setEmails(emailsRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load AI control data');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  const handleManualRunSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    let payload = {};
    if (selectedEmailId) {
      const email = emails.find((item) => item.id === selectedEmailId);
      if (email) {
        payload = {
          emailId: email.id,
          subject: email.subject,
          body: email.body,
          sender: email.sender,
          customerId: email.customerId,
        };
      }
    } else {
      if (!customPayload.sender || !customPayload.subject || !customPayload.body) {
        toast.error('Please fill in all manual payload fields.');
        return;
      }
      payload = { ...customPayload };
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/agents/run', payload);
      toast.success('Agent orchestration plan enqueued successfully');
      setShowRunModal(false);
      setSelectedEmailId('');
      setCustomPayload({ subject: '', body: '', sender: '' });
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to run manual orchestration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  };

  // Helper to abbreviate input/output strings
  const abbreviateText = (val) => {
    if (!val) return '-';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.length <= 40) return str;
    return str.slice(0, 40) + '...';
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: 'var(--color-card-bg)', padding: 24, borderRadius: 16, border: '1px solid var(--color-button-border)', color: '#ef4444', fontWeight: 'bold' }}>
          403 Forbidden: You do not have permission to access the AI Control Center.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading AI Control Center...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;
  }

  // Sort executions chronologically (newest first by default)
  const sortedExecutions = [...executions].sort((a, b) => {
    const timeA = new Date(a.startedAt || 0);
    const timeB = new Date(b.startedAt || 0);
    return sortAsc ? timeA - timeB : timeB - timeA;
  });

  // Paginated Executions
  const indexOfLastExec = currentExecPage * execsPerPage;
  const indexOfFirstExec = indexOfLastExec - execsPerPage;
  const paginatedExecutions = sortedExecutions.slice(indexOfFirstExec, indexOfLastExec);
  const totalExecPages = Math.ceil(sortedExecutions.length / execsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="ai-control-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>AI Control Center</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Orchestrate autonomous agent pipelines, inspect logs, and trigger manual tasks.
          </p>
        </div>
        <button
          id="btn-run-orchestration"
          onClick={() => setShowRunModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Play size={15} />
          Test Orchestration
        </button>
      </div>

      {/* Manual Orchestration modal */}
      {showRunModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Run Manual Orchestration</h3>
              <button onClick={() => setShowRunModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleManualRunSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Option A: Select Existing Processed Email
                <select value={selectedEmailId} onChange={(e) => setSelectedEmailId(e.target.value)} style={inputStyle}>
                  <option value="">-- Choose Email --</option>
                  {emails.map((email) => (
                    <option key={email.id} value={email.id}>
                      {email.subject} (From: {email.sender})
                    </option>
                  ))}
                </select>
              </label>

              {!selectedEmailId && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-button-border)' }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>OR Option B: Custom Test Payload</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-button-border)' }} />
                  </div>
                  <label style={labelStyle}>Sender Email<input placeholder="e.g. customer@domain.com" value={customPayload.sender} onChange={(e) => setCustomPayload({ ...customPayload, sender: e.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}>Subject<input placeholder="e.g. Urgent invoice issue" value={customPayload.subject} onChange={(e) => setCustomPayload({ ...customPayload, subject: e.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}>Body Text<textarea rows={3} placeholder="e.g. I need my billing details asap!" value={customPayload.body} onChange={(e) => setCustomPayload({ ...customPayload, body: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
                </>
              )}

              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'default' : 'pointer' }}>
                {isSubmitting ? 'Queueing Job...' : 'Trigger Orchestration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Agents List Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Autonomous Operators</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {agents.map((agent) => (
            <div key={agent.id || agent.agentId} style={agentItemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {agent.name || agent.agentId}
                  </span>
                </div>
                <span style={agentStatusBadgeStyle(agent.status)}>
                  {agent.status || 'Ready'}
                </span>
              </div>
              <p style={{ margin: '8px 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {agentDescriptions[agent.agentId] || 'Custom business rules processing node.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 'auto' }}>
                <Clock size={12} />
                <span>Last executed: {formatTimeAgo(agent.lastExecution)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Execution History</h3>
        {executions.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No agent executions logged yet.
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Event ID</th>
                    <th style={thStyle}>Agent ID</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle} onClick={() => setSortAsc(!sortAsc)}>
                      Timestamp <ArrowUpDown size={12} style={{ marginLeft: 4, cursor: 'pointer' }} />
                    </th>
                    <th style={thStyle}>Input (abbreviated)</th>
                    <th style={thStyle}>Output (abbreviated)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExecutions.map((exec) => {
                    const start = new Date(exec.startedAt);
                    return (
                      <tr key={exec.id || exec.eventId} style={trStyle}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>{exec.eventId || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{exec.agentId}</td>
                        <td style={tdStyle}>
                          <span style={agentStatusBadgeStyle(exec.status)}>
                            {exec.status}
                          </span>
                        </td>
                        <td style={tdStyle}>{start.toLocaleString()}</td>
                        <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{abbreviateText(exec.input)}</td>
                        <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{abbreviateText(exec.output)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedExecution(exec)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: 4,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            Details <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalExecPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Showing {indexOfFirstExec + 1} to {Math.min(indexOfLastExec, sortedExecutions.length)} of {sortedExecutions.length} executions
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCurrentExecPage(currentExecPage - 1)}
                    disabled={currentExecPage === 1}
                    style={paginationButtonStyle}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalExecPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentExecPage(page)}
                      style={{
                        ...paginationButtonStyle,
                        background: currentExecPage === page ? '#2563eb' : 'var(--color-button-bg)',
                        color: currentExecPage === page ? 'white' : 'var(--color-button-text)',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentExecPage(currentExecPage + 1)}
                    disabled={currentExecPage === totalExecPages}
                    style={paginationButtonStyle}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Detail Logs Modal */}
      {selectedExecution && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Execution Details</h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Agent ID: <strong>{selectedExecution.agentId}</strong> | Event ID: <strong>{selectedExecution.eventId || '-'}</strong>
                </span>
              </div>
              <button onClick={() => setSelectedExecution(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Status: </span>
                  <span style={agentStatusBadgeStyle(selectedExecution.status)}>{selectedExecution.status}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Timestamp: </span>
                  <strong>{new Date(selectedExecution.startedAt).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Duration: </span>
                  <strong>
                    {selectedExecution.finishedAt
                      ? `${((new Date(selectedExecution.finishedAt) - new Date(selectedExecution.startedAt)) / 1000).toFixed(2)}s`
                      : 'Running...'}
                  </strong>
                </div>
                {selectedExecution.error && (
                  <div style={{ gridColumn: 'span 2', color: '#ef4444' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Error: </span>
                    <strong>{selectedExecution.error}</strong>
                  </div>
                )}
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Full Input
                </span>
                <pre style={codeBlockStyle}>
                  {typeof selectedExecution.input === 'object' ? JSON.stringify(selectedExecution.input, null, 2) : String(selectedExecution.input || '')}
                </pre>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Full Output
                </span>
                <pre style={codeBlockStyle}>
                  {typeof selectedExecution.output === 'object' ? JSON.stringify(selectedExecution.output, null, 2) : String(selectedExecution.output || '')}
                </pre>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Execution Logs
                </span>
                <pre style={{ ...codeBlockStyle, background: '#1e293b', color: '#38bdf8' }}>
                  {(selectedExecution.logs || []).join('\n') || 'No logging outputs generated.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling Constants
const cardStyle = {
  background: 'var(--color-card-bg)',
  borderRadius: 24,
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  border: '1px solid var(--color-button-border)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  minWidth: 800,
};

const thStyle = {
  padding: '12px 16px',
  borderBottom: '2px solid var(--color-button-border)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  userSelect: 'none',
};

const trStyle = {
  borderBottom: '1px solid var(--color-button-border)',
};

const tdStyle = {
  padding: '16px',
  fontSize: 14,
};

const labelStyle = { display: 'grid', gap: 6, fontSize: 14 };
const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid var(--color-button-border)',
  background: 'var(--color-card-bg)',
  color: 'var(--color-text-primary)'
};

const submitButtonStyle = {
  padding: 12,
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer'
};

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  minHeight: '100vh',
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(4px)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 200,
  overflowY: 'auto',
  padding: '24px 0',
};

const modalContainerStyle = {
  background: 'var(--color-card-bg)',
  padding: 24,
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  border: '1px solid var(--color-button-border)',
  width: '90%',
  maxWidth: 550,
  display: 'grid',
  gap: 16,
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)'
};

const agentItemStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--color-button-border)',
  borderRadius: 20,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

function agentStatusBadgeStyle(status) {
  const isCompleted = status === 'completed' || status === 'ready' || status === 'Ready';
  const isFailed = status === 'failed' || status === 'Failed';
  const isRunning = status === 'running' || status === 'Running';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isCompleted
      ? 'rgba(16, 185, 129, 0.12)'
      : isFailed
      ? 'rgba(239, 68, 68, 0.12)'
      : isRunning
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(100, 116, 139, 0.12)',
    color: isCompleted ? '#10b981' : isFailed ? '#ef4444' : isRunning ? '#f59e0b' : '#64748b',
  };
}

const paginationButtonStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-button-border)',
  background: 'var(--color-button-bg)',
  color: 'var(--color-button-text)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
};

const codeBlockStyle = {
  margin: 0,
  padding: 12,
  borderRadius: 10,
  background: 'var(--color-button-bg)',
  border: '1px solid var(--color-button-border)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  fontFamily: 'monospace'
};
