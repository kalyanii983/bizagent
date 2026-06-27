import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import {
  Pencil,
  X,
  Plus,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  GitBranch,
  MessageSquare,
  Activity,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export function Customer360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };

  // Role permissions
  const isAdmin = auth.role === 'Admin';
  const isManager = auth.role === 'Manager';
  const isEmployee = auth.role === 'Employee';
  const canModify = isAdmin || isManager || isEmployee;

  // Data states
  const [customer, setCustomer] = React.useState(null);
  const [timeline, setTimeline] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Timeline item detail modal state
  const [selectedActivity, setSelectedActivity] = React.useState(null);

  // Edit Customer Modal State
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    tagsString: '',
    preferences: '',
    notes: '',
    healthScore: 0,
  });
  const [editError, setEditError] = React.useState('');

  // Add Note Form State
  const [noteBody, setNoteBody] = React.useState('');
  const [noteTitle, setNoteTitle] = React.useState('General Update');
  const [isSubmittingNote, setIsSubmittingNote] = React.useState(false);

  // Fetch all necessary data
  async function loadData() {
    try {
      setLoading(true);
      setError('');

      // Fetch customer details
      const custRes = await api.get(`/api/customers/${id}`);
      const cust = custRes.data;
      setCustomer(cust);

      // Fetch everything for the timeline in parallel
      const [
        crmRes,
        emailRes,
        meetingRes,
        invoiceRes,
        ticketRes,
        workflowRes
      ] = await Promise.all([
        api.get('/api/crm').catch(() => ({ data: { items: [] } })),
        api.get('/api/emails').catch(() => ({ data: { items: [] } })),
        api.get('/api/meetings').catch(() => ({ data: { items: [] } })),
        api.get('/api/invoices').catch(() => ({ data: { items: [] } })),
        api.get('/api/tickets').catch(() => ({ data: { items: [] } })),
        api.get('/api/workflows').catch(() => ({ data: { items: [] } }))
      ]);

      // Filter and format activities for timeline
      const events = [];

      // 1. Custom CRM Activities/Notes
      const filteredCrm = (crmRes.data.items || []).filter(item => item.customerId === id);
      filteredCrm.forEach(item => {
        events.push({
          id: item.id,
          type: item.type === 'note' ? 'note' : 'crm_activity',
          title: item.title || (item.type === 'note' ? 'Internal Note' : 'CRM Update'),
          body: item.body || '',
          date: new Date(item.createdAt || item.updatedAt || Date.now()),
          createdBy: item.createdBy || 'System',
          raw: item,
        });
      });

      // 2. Emails
      const filteredEmails = (emailRes.data.items || []).filter(item => item.customerId === id);
      filteredEmails.forEach(item => {
        events.push({
          id: item.id,
          type: 'email',
          title: item.subject || 'No Subject',
          body: item.body || '',
          date: new Date(item.createdAt || Date.now()),
          createdBy: item.sender || 'System',
          metadata: {
            Sentiment: item.sentiment,
            Intent: item.intent,
            Urgency: item.urgency,
            Processed: item.processed ? 'Yes' : 'No',
            Recommendations: (item.recommendations || []).join(', ')
          },
          raw: item,
        });
      });

      // 3. Meetings
      const filteredMeetings = (meetingRes.data.items || []).filter(item => item.customerId === id);
      filteredMeetings.forEach(item => {
        events.push({
          id: item.id,
          type: 'meeting',
          title: item.title || 'Client Meeting',
          body: item.notes || '',
          date: new Date(item.startTime || Date.now()),
          createdBy: item.attendees?.join(', ') || 'System',
          metadata: {
            Status: item.status,
            'End Time': item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'
          },
          raw: item,
        });
      });

      // 4. Invoices
      const filteredInvoices = (invoiceRes.data.items || []).filter(item => item.customerId === id);
      filteredInvoices.forEach(item => {
        events.push({
          id: item.id,
          type: 'invoice',
          title: `Invoice #${item.id || 'N/A'}`,
          body: `Amount: $${item.amount || 0} | Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}`,
          date: new Date(item.createdAt || Date.now()),
          createdBy: 'Billing Service',
          metadata: {
            Status: item.status,
            'Line Items': (item.lineItems || []).map(li => `${li.description} (x${li.quantity}): $${li.amount}`).join('\n')
          },
          raw: item,
        });
      });

      // 5. Tickets
      const filteredTickets = (ticketRes.data.items || []).filter(item => item.customerId === id);
      filteredTickets.forEach(item => {
        events.push({
          id: item.id,
          type: 'ticket',
          title: `Support Ticket: ${item.issue || 'No description'}`,
          body: item.resolution ? `Resolution: ${item.resolution}` : 'No resolution reported yet.',
          date: new Date(item.createdAt || Date.now()),
          createdBy: item.assignedTo || 'Unassigned',
          metadata: {
            Priority: item.priority,
            Status: item.status
          },
          raw: item,
        });
      });

      // 6. Workflows
      const allWorkflows = workflowRes.data.items || [];
      allWorkflows.forEach(wf => {
        (wf.logs || []).forEach((log, logIdx) => {
          // Check if payload contains reference to this customer
          const payloadString = typeof log.payload === 'object' ? JSON.stringify(log.payload) : String(log.payload || '');
          const isRelated = log.payload?.customerId === id || payloadString.includes(id);

          if (isRelated) {
            events.push({
              id: `${wf.id}-log-${logIdx}`,
              type: 'workflow',
              title: `Workflow Run: ${wf.name}`,
              body: log.message || `Executed step successfully.`,
              date: new Date(log.timestamp || wf.updatedAt || Date.now()),
              createdBy: 'Automation Engine',
              metadata: {
                Trigger: wf.trigger,
                Action: wf.action,
                Status: log.status || 'Executed'
              },
              raw: log,
            });
          }
        });
      });

      // Sort timeline events chronologically: newest first
      events.sort((a, b) => b.date - a.date);
      setTimeline(events);

    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load customer details');
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, [id]);

  const handleStartEdit = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      tagsString: (customer.tags || []).join(', '),
      preferences: typeof customer.preferences === 'string' ? customer.preferences : JSON.stringify(customer.preferences || ''),
      notes: customer.notes || '',
      healthScore: customer.healthScore || 0,
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editFormData.name.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (!editFormData.email.trim()) {
      setEditError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email.trim())) {
      setEditError('Invalid email format.');
      return;
    }

    const healthVal = parseInt(editFormData.healthScore);
    if (isNaN(healthVal) || healthVal < 0 || healthVal > 100) {
      setEditError('Health Score must be a number between 0 and 100.');
      return;
    }

    try {
      const tags = editFormData.tagsString
        ? editFormData.tagsString.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        company: editFormData.company,
        tags,
        preferences: editFormData.preferences,
        notes: editFormData.notes,
        healthScore: healthVal,
      };

      const { data } = await api.put(`/api/customers/${id}`, payload);
      setCustomer(data);
      setShowEditModal(false);
      toast.success('Customer updated successfully');
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteBody.trim()) {
      toast.error('Note content cannot be empty.');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const payload = {
        customerId: id,
        type: 'note',
        title: noteTitle.trim() || 'Internal Note',
        body: noteBody.trim(),
        createdBy: auth.name || 'Staff User',
      };

      await api.post('/api/crm/note', payload);
      setNoteBody('');
      setNoteTitle('General Update');
      toast.success('Note added to timeline');
      // Reload timeline and details
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading Customer 360 Workspace...</div>;
  }

  if (error || !customer) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Customer not found.'}</div>
        <button onClick={() => navigate('/customers')} style={paginationButtonStyle}>
          Back to Customers Directory
        </button>
      </div>
    );
  }

  // Get matching icon for timeline entry type
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

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="customer-name-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>{customer.name}</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Customer 360 Operational Profile and History.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/customers')}
            style={paginationButtonStyle}
          >
            Back to List
          </button>
          {canModify && (
            <button
              onClick={handleStartEdit}
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
              <Pencil size={16} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout for Profile, Health Score, and Notes/Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Profile Section */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Profile Details</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Name</span>
                <span style={detailValStyle}>{customer.name}</span>
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Email</span>
                <span style={detailValStyle}>{customer.email || '-'}</span>
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Phone</span>
                <span style={detailValStyle}>{customer.phone || '-'}</span>
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Company</span>
                <span style={detailValStyle}>{customer.company || '-'}</span>
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(customer.tags || []).length > 0 ? (
                    customer.tags.map((tag, idx) => (
                      <span key={idx} style={tagBadgeStyle}>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Health Score Widget */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Business Health Score</h3>
              <span style={healthBadgeStyle(customer.healthScore || 0)}>
                {customer.healthScore || 0}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Customer Satisfaction Weight:</span>
                <span style={{ fontWeight: 600 }}>28%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Response Time Weight:</span>
                <span style={{ fontWeight: 600 }}>16%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Invoice Collection Weight:</span>
                <span style={{ fontWeight: 600 }}>20%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Ticket Resolution Weight:</span>
                <span style={{ fontWeight: 600 }}>20%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Lead Conversion Weight:</span>
                <span style={{ fontWeight: 600 }}>16%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences and Notes (Editable block views) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Preferences</h3>
            <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
              {customer.preferences ? String(customer.preferences) : 'No preferences defined.'}
            </p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Profile Notes</h3>
            <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
              {customer.notes || 'No profile notes.'}
            </p>
          </div>
        </div>

        {/* Add Note Section */}
        {canModify && (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add Note to Timeline</h3>
            <form onSubmit={handleAddNoteSubmit} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Note Title</label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Call Update, Check-in"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Content</label>
                <textarea
                  rows={3}
                  required
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Write note body here..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingNote}
                style={{
                  ...submitButtonStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isSubmittingNote ? 0.7 : 1,
                  cursor: isSubmittingNote ? 'default' : 'pointer'
                }}
              >
                <Plus size={16} />
                {isSubmittingNote ? 'Adding Note...' : 'Add Note'}
              </button>
            </form>
          </div>
        )}

        {/* Timeline Section */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>CRM Activity Timeline</h3>
          {timeline.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No activity yet.
            </div>
          ) : (
            <div style={timelineContainerStyle}>
              {timeline.map((event, idx) => (
                <div key={event.id || idx} style={timelineItemStyle} onClick={() => setSelectedActivity(event)}>
                  {/* Left Column: Icon and Vertical Line */}
                  <div style={timelineLeftColStyle}>
                    <div style={timelineIconContainerStyle}>
                      {getTimelineIcon(event.type)}
                    </div>
                    {idx < timeline.length - 1 && <div style={timelineLineStyle} />}
                  </div>

                  {/* Right Column: Event Info */}
                  <div style={timelineRightColStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                        {event.title}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {event.date.toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.body}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      <span>Created by: <strong>{event.createdBy}</strong></span>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        Details <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Profile Modal */}
      {showEditModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Customer: {customer.name}</h3>
              <button onClick={() => setShowEditModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Name *<input required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Email *<input type="email" required value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Phone<input value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Company<input value={editFormData.company} onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Tags (comma separated)<input value={editFormData.tagsString} onChange={(e) => setEditFormData({ ...editFormData, tagsString: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Preferences<input value={editFormData.preferences} onChange={(e) => setEditFormData({ ...editFormData, preferences: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Health Score (0-100)<input type="number" min="0" max="100" value={editFormData.healthScore} onChange={(e) => setEditFormData({ ...editFormData, healthScore: parseInt(e.target.value) || 0 })} style={inputStyle} /></label>
              <label style={labelStyle}>Notes<textarea rows={3} value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" style={submitButtonStyle}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Activity Details Expansion Modal */}
      {selectedActivity && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getTimelineIcon(selectedActivity.type)}
                <span style={{ fontSize: 13, textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  {selectedActivity.type.replace('_', ' ')}
                </span>
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
                  Description / Content
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
                        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{key}</span>
                        <span style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', marginTop: 2 }}>{String(value || 'N/A')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-button-border)', paddingTop: 12 }}>
                <span>Creator/Sender: <strong>{selectedActivity.createdBy}</strong></span>
                <span>ID: {selectedActivity.id}</span>
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

const tagBadgeStyle = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 12,
  background: 'rgba(100, 116, 139, 0.12)',
  color: 'var(--color-text-secondary)',
};

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

function healthBadgeStyle(score) {
  const isGood = score >= 80;
  const isWarning = score >= 50 && score < 80;
  return {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    background: isGood
      ? 'rgba(16, 185, 129, 0.12)'
      : isWarning
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(239, 68, 68, 0.12)',
    color: isGood ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444',
  };
}

const detailFieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  borderBottom: '1px solid var(--color-button-border)',
  paddingBottom: 8,
};

const detailLabelStyle = {
  fontSize: 12,
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
};

const detailValStyle = {
  fontSize: 14,
  color: 'var(--color-text-primary)',
  fontWeight: 500,
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
  padding: '12px 8px',
  borderRadius: '12px',
  transition: 'background 0.2s',
  ':hover': {
    background: 'var(--color-button-bg)',
  }
};

const timelineLeftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const timelineIconContainerStyle = {
  width: 32,
  height: 32,
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
  marginTop: 4,
  marginBottom: -16,
};

const timelineRightColStyle = {
  flex: 1,
  background: 'var(--color-card-bg)',
  padding: '12px 16px',
  borderRadius: 16,
  border: '1px solid var(--color-button-border)',
  boxShadow: 'var(--card-shadow)',
};
