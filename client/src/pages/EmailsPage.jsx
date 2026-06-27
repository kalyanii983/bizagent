import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Plus, X, Search, ChevronDown, ChevronUp, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function EmailsPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Expandable row state (store email IDs of expanded rows)
  const [expandedEmailId, setExpandedEmailId] = React.useState(null);

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // New Email Form Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    subject: '',
    body: '',
    sender: '',
    customerId: '',
  });
  const [formError, setFormError] = React.useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [emailRes, custRes] = await Promise.all([
        api.get('/api/emails'),
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
      ]);
      setEmails(emailRes.data.items || []);
      setCustomers(custRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch email data');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();

    const handleSocketNewEmail = () => {
      loadData();
    };

    window.addEventListener('socket_new_email', handleSocketNewEmail);
    return () => {
      window.removeEventListener('socket_new_email', handleSocketNewEmail);
    };
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.subject.trim() || !formData.body.trim() || !formData.sender.trim()) {
      setFormError('Subject, body and sender are required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        subject: formData.subject,
        body: formData.body,
        sender: formData.sender,
        customerId: formData.customerId || null,
      };

      await api.post('/api/emails/process', payload);
      toast.success('Email processing initiated successfully');
      setShowAddModal(false);
      setFormData({
        subject: '',
        body: '',
        sender: '',
        customerId: '',
      });
      // Refresh the list
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to process email');
      toast.error('Failed to initiate email processing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkProcessed = async (emailId) => {
    try {
      await api.put(`/api/emails/${emailId}`, { processed: true });
      toast.success('Email marked as processed and orchestration triggered');
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update email status');
    }
  };

  const toggleRow = (id) => {
    setExpandedEmailId(expandedEmailId === id ? null : id);
  };

  // Find customer name by ID
  const getCustomerName = (custId) => {
    if (!custId) return '-';
    const c = customers.find((item) => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  // Filtering
  const filteredEmails = emails.filter((email) => {
    const term = searchTerm.toLowerCase();
    const custName = getCustomerName(email.customerId).toLowerCase();
    return (
      (email.subject || '').toLowerCase().includes(term) ||
      (email.sender || '').toLowerCase().includes(term) ||
      (email.body || '').toLowerCase().includes(term) ||
      custName.includes(term)
    );
  });

  // Sort: newest first
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedEmails.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEmails.length / itemsPerPage);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading Emails Dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="emails-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Emails</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Monitor, analyze, and trigger autonomous pipeline execution from incoming emails.
          </p>
        </div>
        <button
          id="btn-process-email"
          onClick={() => setShowAddModal(true)}
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
          Process Email
        </button>
      </div>

      {/* Process Email Form Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Process New Incoming Email</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Sender Email *<input type="email" required placeholder="e.g. client@company.com" value={formData.sender} onChange={(e) => setFormData({ ...formData, sender: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Subject *<input required placeholder="e.g. Support ticket: payment issues" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Associate Customer
                <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} style={inputStyle}>
                  <option value="">None (Auto-detect or link later)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company || 'Private'})</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>Email Body *<textarea rows={5} required placeholder="Paste incoming email contents here..." value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'default' : 'pointer' }}>
                {isSubmitting ? 'Processing Pipeline...' : 'Process Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Single Card layout */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-emails"
            type="text"
            placeholder="Search emails by subject, body, sender, or customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'none',
              color: 'var(--color-text-primary)',
              fontSize: 15,
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Table representation */}
        {currentItems.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No emails found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Email Info</th>
                  <th style={thStyle}>Matched Customer</th>
                  <th style={thStyle}>Sentiment</th>
                  <th style={thStyle}>Intent</th>
                  <th style={thStyle}>Urgency</th>
                  <th style={thStyle}>Pipeline Status</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((email) => {
                  const isExpanded = expandedEmailId === email.id;
                  return (
                    <React.Fragment key={email.id}>
                      <tr onClick={() => toggleRow(email.id)} style={{ ...trStyle, cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'none' }}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 650, fontSize: 14, color: 'var(--color-text-primary)' }}>{email.subject}</span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>From: {email.sender}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {email.customerId ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/customers/${email.customerId}`);
                              }}
                              style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {getCustomerName(email.customerId)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={sentimentBadgeStyle(email.sentiment || 'neutral')}>
                            {email.sentiment || 'neutral'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={intentBadgeStyle}>
                            {email.intent || 'general_inquiry'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={urgencyBadgeStyle(email.urgency || 'medium')}>
                            {email.urgency || 'medium'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(email.processed)}>
                            {email.processed ? 'Processed' : 'Pending'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {new Date(email.createdAt || Date.now()).toLocaleString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--color-button-border)' }}>
                            <div style={{ display: 'grid', gap: 16 }}>
                              <div>
                                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                                  Email Message Body
                                </span>
                                <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', background: 'var(--color-card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                                  {email.body}
                                </p>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                                <div>
                                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                                    Autonomous Auto-Response Recommendations
                                  </span>
                                  <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', background: 'var(--color-card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                                    {email.autoResponse || 'No auto-response generated.'}
                                  </p>
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                                    Agent Action Recommendations
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--color-card-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                                    {(email.recommendations || []).length > 0 ? (
                                      (email.recommendations || []).map((rec, rIdx) => (
                                        <div key={rIdx} style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                                          • {rec}
                                        </div>
                                      ))
                                    ) : (
                                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No recommendations.</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!email.processed && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkProcessed(email.id);
                                    }}
                                    style={{
                                      padding: '8px 16px',
                                      borderRadius: 10,
                                      border: 'none',
                                      background: '#10b981',
                                      color: 'white',
                                      fontWeight: 655,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Mark as Processed
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedEmails.length)} of {sortedEmails.length} emails
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={paginationButtonStyle}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    ...paginationButtonStyle,
                    background: currentPage === page ? '#2563eb' : 'var(--color-button-bg)',
                    color: currentPage === page ? 'white' : 'var(--color-button-text)',
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={paginationButtonStyle}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
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
  transition: 'background 0.2s',
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

// Badges styles functions
function sentimentBadgeStyle(sentiment) {
  const isPositive = sentiment === 'positive';
  const isNegative = sentiment === 'negative';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isPositive
      ? 'rgba(16, 185, 129, 0.12)'
      : isNegative
      ? 'rgba(239, 68, 68, 0.12)'
      : 'rgba(100, 116, 139, 0.12)',
    color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b',
  };
}

const intentBadgeStyle = {
  fontSize: 11,
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: 20,
  background: 'rgba(99, 102, 241, 0.12)',
  color: '#6366f1',
};

function urgencyBadgeStyle(urgency) {
  const isCritical = urgency === 'critical';
  const isHigh = urgency === 'high';
  const isMedium = urgency === 'medium';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isCritical
      ? 'rgba(239, 68, 68, 0.12)'
      : isHigh
      ? 'rgba(249, 115, 22, 0.12)'
      : isMedium
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(59, 130, 246, 0.12)',
    color: isCritical ? '#ef4444' : isHigh ? '#f97316' : isMedium ? '#f59e0b' : '#3b82f6',
  };
}

function statusBadgeStyle(processed) {
  return {
    fontSize: 11,
    fontWeight: 750,
    padding: '3px 8px',
    borderRadius: 20,
    background: processed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
    color: processed ? '#10b981' : '#f59e0b',
  };
}
