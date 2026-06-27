import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import {
  MessageSquare,
  Activity,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  GitBranch,
  ChevronRight,
  Plus,
  X,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CRMPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [customers, setCustomers] = React.useState([]);

  // Filters
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('');

  // Combined timeline events
  const [timelineEvents, setTimelineEvents] = React.useState([]);

  // Detail Modal
  const [selectedActivity, setSelectedActivity] = React.useState(null);

  // Add Note Modal
  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = React.useState(false);
  const [noteForm, setNoteForm] = React.useState({
    customerId: '',
    title: 'General Update',
    body: '',
  });
  const [formError, setFormError] = React.useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [
        custRes,
        crmRes,
        emailRes,
        meetingRes,
        invoiceRes,
        ticketRes,
        workflowRes
      ] = await Promise.all([
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
        api.get('/api/crm').catch(() => ({ data: { items: [] } })),
        api.get('/api/emails').catch(() => ({ data: { items: [] } })),
        api.get('/api/meetings').catch(() => ({ data: { items: [] } })),
        api.get('/api/invoices').catch(() => ({ data: { items: [] } })),
        api.get('/api/tickets').catch(() => ({ data: { items: [] } })),
        api.get('/api/workflows').catch(() => ({ data: { items: [] } }))
      ]);

      const allCustomers = custRes.data.items || [];
      setCustomers(allCustomers);

      const events = [];

      // 1. CRM Notes / Activities
      (crmRes.data.items || []).forEach(item => {
        events.push({
          id: item.id,
          type: item.type === 'note' ? 'note' : 'crm_activity',
          title: item.title || (item.type === 'note' ? 'Internal Note' : 'CRM Update'),
          body: item.body || '',
          date: new Date(item.createdAt || item.updatedAt || Date.now()),
          createdBy: item.createdBy || 'System',
          customerId: item.customerId,
          raw: item,
        });
      });

      // 2. Emails
      (emailRes.data.items || []).forEach(item => {
        events.push({
          id: item.id,
          type: 'email',
          title: item.subject || 'No Subject',
          body: item.body || '',
          date: new Date(item.createdAt || Date.now()),
          createdBy: item.sender || 'System',
          customerId: item.customerId,
          metadata: {
            Sentiment: item.sentiment,
            Intent: item.intent,
            Urgency: item.urgency,
            Processed: item.processed ? 'Yes' : 'No'
          },
          raw: item,
        });
      });

      // 3. Meetings
      (meetingRes.data.items || []).forEach(item => {
        events.push({
          id: item.id,
          type: 'meeting',
          title: item.title || 'Client Meeting',
          body: item.notes || '',
          date: new Date(item.startTime || Date.now()),
          createdBy: item.attendees?.join(', ') || 'System',
          customerId: item.customerId,
          metadata: {
            Status: item.status,
            'End Time': item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'
          },
          raw: item,
        });
      });

      // 4. Invoices
      (invoiceRes.data.items || []).forEach(item => {
        events.push({
          id: item.id,
          type: 'invoice',
          title: `Invoice #${item.id || 'N/A'}`,
          body: `Amount: $${item.amount || 0} | Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}`,
          date: new Date(item.createdAt || Date.now()),
          createdBy: 'Billing Service',
          customerId: item.customerId,
          metadata: {
            Status: item.status
          },
          raw: item,
        });
      });

      // 5. Tickets
      (ticketRes.data.items || []).forEach(item => {
        events.push({
          id: item.id,
          type: 'ticket',
          title: `Support Ticket: ${item.issue || 'No description'}`,
          body: item.resolution ? `Resolution: ${item.resolution}` : 'No resolution reported yet.',
          date: new Date(item.createdAt || Date.now()),
          createdBy: item.assignedTo || 'Unassigned',
          customerId: item.customerId,
          metadata: {
            Priority: item.priority,
            Status: item.status
          },
          raw: item,
        });
      });

      // 6. Workflows
      (workflowRes.data.items || []).forEach(wf => {
        (wf.logs || []).forEach((log, logIdx) => {
          events.push({
            id: `${wf.id}-log-${logIdx}`,
            type: 'workflow',
            title: `Workflow Run: ${wf.name}`,
            body: log.message || `Executed step successfully.`,
            date: new Date(log.timestamp || wf.updatedAt || Date.now()),
            createdBy: 'Automation Engine',
            customerId: log.payload?.customerId || wf.customerId || null,
            metadata: {
              Trigger: wf.trigger,
              Action: wf.action,
              Status: log.status || 'Executed'
            },
            raw: log,
          });
        });
      });

      // Sort timeline events chronologically: newest first
      events.sort((a, b) => b.date - a.date);
      setTimelineEvents(events);

    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch CRM activity data');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!noteForm.customerId) {
      setFormError('Customer is required');
      return;
    }
    if (!noteForm.body.trim()) {
      setFormError('Note content is required');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const payload = {
        customerId: noteForm.customerId,
        type: 'note',
        title: noteForm.title.trim() || 'Internal Note',
        body: noteForm.body.trim(),
        createdBy: auth.name || 'Staff User',
      };

      await api.post('/api/crm/note', payload);
      toast.success('CRM Note created successfully');
      setShowNoteModal(false);
      setNoteForm({ customerId: '', title: 'General Update', body: '' });
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getCustomerName = (custId) => {
    if (!custId) return 'Global/None';
    const c = customers.find(item => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case 'note':
        return <MessageSquare size={16} style={{ color: '#8b5cf6' }} />;
      case 'crm_activity':
        return <Activity size={16} style={{ color: '#6366f1' }} />;
      case 'email':
        return <Mail size={16} style={{ color: '#3b82f6' }} />;
      case 'meeting':
        return <Calendar size={16} style={{ color: '#10b981' }} />;
      case 'invoice':
        return <FileText size={16} style={{ color: '#f59e0b' }} />;
      case 'ticket':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      case 'workflow':
        return <GitBranch size={16} style={{ color: '#ec4899' }} />;
      default:
        return <Activity size={16} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getTimelineBadge = (type) => {
    let background = 'rgba(100, 116, 139, 0.12)';
    let color = '#64748b';
    let text = type;

    if (type === 'note') { background = 'rgba(139, 92, 246, 0.12)'; color = '#8b5cf6'; text = 'Note'; }
    else if (type === 'crm_activity') { background = 'rgba(99, 102, 241, 0.12)'; color = '#6366f1'; text = 'Activity'; }
    else if (type === 'email') { background = 'rgba(59, 130, 246, 0.12)'; color = '#3b82f6'; text = 'Email'; }
    else if (type === 'meeting') { background = 'rgba(16, 185, 129, 0.12)'; color = '#10b981'; text = 'Meeting'; }
    else if (type === 'invoice') { background = 'rgba(245, 158, 11, 0.12)'; color = '#f59e0b'; text = 'Invoice'; }
    else if (type === 'ticket') { background = 'rgba(239, 68, 68, 0.12)'; color = '#ef4444'; text = 'Ticket'; }
    else if (type === 'workflow') { background = 'rgba(236, 72, 153, 0.12)'; color = '#ec4899'; text = 'Workflow'; }

    return (
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background, color }}>
        {text}
      </span>
    );
  };

  // Filter the aggregated list
  const filteredEvents = timelineEvents.filter(event => {
    const matchesCustomer = selectedCustomerId ? event.customerId === selectedCustomerId : true;
    const matchesType = selectedType ? event.type === selectedType : true;
    return matchesCustomer && matchesType;
  });

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading CRM timeline...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="crm-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>CRM Timeline</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Consolidated timeline of customer activities, conversations, invoice schedules, support tickets, and workflows.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-add-crm-note"
            onClick={() => setShowNoteModal(true)}
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
            <Plus size={16} />
            Add Note
          </button>
        )}
      </div>

      {/* Filters Area */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 700 }}>
          <Filter size={16} />
          <span>Timeline Filters</span>
        </div>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label style={labelStyle}>
            Customer Profile
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={inputStyle}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.company || 'Private'})</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Activity Type
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={inputStyle}
            >
              <option value="">All Types</option>
              <option value="note">Internal Notes</option>
              <option value="email">Emails</option>
              <option value="meeting">Meetings</option>
              <option value="invoice">Invoices</option>
              <option value="ticket">Tickets</option>
              <option value="workflow">Workflows</option>
            </select>
          </label>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div style={cardStyle}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No activities matched the chosen filters.
          </div>
        ) : (
          <div style={timelineContainerStyle}>
            {filteredEvents.map((event, idx) => (
              <div key={event.id || idx} style={timelineItemStyle} onClick={() => setSelectedActivity(event)}>
                <div style={timelineLeftColStyle}>
                  <div style={timelineIconContainerStyle}>
                    {getTimelineIcon(event.type)}
                  </div>
                  {idx < filteredEvents.length - 1 && <div style={timelineLineStyle} />}
                </div>
                <div style={timelineRightColStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                        {event.title}
                      </span>
                      {getTimelineBadge(event.type)}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {event.date.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {event.body}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <span>Customer: <strong>{getCustomerName(event.customerId)}</strong> | Creator: <strong>{event.createdBy}</strong></span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      Inspect Activity <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add CRM Note Modal */}
      {showNoteModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add CRM Note</h3>
              <button onClick={() => setShowNoteModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddNoteSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Select Customer Profile *
                <select
                  required
                  value={noteForm.customerId}
                  onChange={(e) => setNoteForm({ ...noteForm, customerId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Note Title
                <input
                  placeholder="e.g. Follow-up Call, Team Sync"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Note Content *
                <textarea
                  rows={4}
                  required
                  placeholder="Type note details..."
                  value={noteForm.body}
                  onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </label>
              <button type="submit" disabled={isSubmittingNote} style={{ ...submitButtonStyle, opacity: isSubmittingNote ? 0.7 : 1 }}>
                {isSubmittingNote ? 'Adding Note...' : 'Save CRM Note'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getTimelineIcon(selectedActivity.type)}
                {getTimelineBadge(selectedActivity.type)}
              </div>
              <button onClick={() => setSelectedActivity(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedActivity.title}</h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {selectedActivity.date.toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Content Description
                </span>
                <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                  {selectedActivity.body || 'No description provided.'}
                </p>
              </div>

              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Metadata
                  </span>
                  <div style={{ display: 'grid', gap: 8, background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                    {Object.entries(selectedActivity.metadata).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{key}</span>
                        <span style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', marginTop: 2 }}>{String(value || 'N/A')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-button-border)', paddingTop: 12 }}>
                <span>
                  Customer Profile: {' '}
                  {selectedActivity.customerId ? (
                    <span
                      onClick={() => {
                        setSelectedActivity(null);
                        navigate(`/customers/${selectedActivity.customerId}`);
                      }}
                      style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {getCustomerName(selectedActivity.customerId)}
                    </span>
                  ) : (
                    <strong>Global/None</strong>
                  )}
                </span>
                <span>Creator: <strong>{selectedActivity.createdBy}</strong></span>
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
  maxWidth: 500,
  display: 'grid',
  gap: 16,
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)'
};

// Timeline Styles
const timelineContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

const timelineItemStyle = {
  display: 'flex',
  gap: 16,
  cursor: 'pointer',
  padding: '16px 12px',
  borderRadius: '16px',
  transition: 'background 0.2s',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.02)',
  }
};

const timelineLeftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const timelineIconContainerStyle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'var(--color-button-bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--color-button-border)',
};

const timelineLineStyle = {
  width: 2,
  flex: 1,
  background: 'var(--color-button-border)',
  margin: '8px 0',
};

const timelineRightColStyle = {
  flex: 1,
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid var(--color-button-border)',
  borderRadius: 16,
  padding: 16,
};
