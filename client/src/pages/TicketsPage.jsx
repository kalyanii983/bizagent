import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, X, Search, AlertTriangle, ShieldAlert, Pencil, Trash2, User, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function TicketsPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';
  const canDelete = auth.role === 'Admin' || auth.role === 'Manager';

  const [tickets, setTickets] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Add Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    customerId: '',
    issue: '',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
    resolution: '',
  });
  const [formError, setFormError] = React.useState('');

  // Edit Modal State
  const [editingTicket, setEditingTicket] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    customerId: '',
    issue: '',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
    resolution: '',
  });
  const [editError, setEditError] = React.useState('');

  // Delete Confirm State
  const [deletingTicket, setDeletingTicket] = React.useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [ticketsRes, customersRes, usersRes] = await Promise.all([
        api.get('/api/tickets'),
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
        api.get('/api/users').catch(() => ({ data: { items: [] } })),
      ]);
      setTickets(ticketsRes.data.items || []);
      setCustomers(customersRes.data.items || []);
      setUsers(usersRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();

    const handleSocketNewTicket = () => {
      loadData();
    };

    window.addEventListener('socket_new_ticket', handleSocketNewTicket);
    return () => {
      window.removeEventListener('socket_new_ticket', handleSocketNewTicket);
    };
  }, []);

  const getCustomerName = (custId) => {
    if (!custId) return '-';
    const c = customers.find((item) => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  const getUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const u = users.find((item) => item.id === userId);
    return u ? u.name : 'Unassigned';
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.customerId) {
      setFormError('Customer is required');
      return;
    }
    if (!formData.issue.trim()) {
      setFormError('Issue description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: formData.customerId,
        issue: formData.issue.trim(),
        priority: formData.priority,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        resolution: formData.resolution.trim(),
      };

      const { data: newTicket } = await api.post('/api/tickets', payload);

      // Create CRM Activity log
      try {
        await api.post('/api/crm/activity', {
          customerId: formData.customerId,
          type: 'ticket',
          title: `Support Ticket Opened: #${newTicket.id}`,
          body: `Issue: ${payload.issue}\nPriority: ${payload.priority}\nStatus: ${payload.status}\nAssigned To: ${getUserName(payload.assignedTo)}`,
          createdBy: auth.name || 'Support Agent',
        });
      } catch (crmErr) {
        console.error('Failed to log ticket CRM Activity:', crmErr);
      }

      toast.success('Ticket created successfully');
      setShowAddModal(false);
      setFormData({
        customerId: '',
        issue: '',
        priority: 'medium',
        status: 'open',
        assignedTo: '',
        resolution: '',
      });
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create ticket');
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (ticket) => {
    setEditingTicket(ticket);
    setEditFormData({
      customerId: ticket.customerId || '',
      issue: ticket.issue || '',
      priority: ticket.priority || 'medium',
      status: ticket.status || 'open',
      assignedTo: ticket.assignedTo || '',
      resolution: ticket.resolution || '',
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setEditError('');

    if (!editFormData.customerId) {
      setEditError('Customer is required');
      return;
    }
    if (!editFormData.issue.trim()) {
      setEditError('Issue description is required');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        customerId: editFormData.customerId,
        issue: editFormData.issue.trim(),
        priority: editFormData.priority,
        status: editFormData.status,
        assignedTo: editFormData.assignedTo || null,
        resolution: editFormData.resolution.trim(),
      };

      await api.put(`/api/tickets/${editingTicket.id}`, payload);

      // Create CRM Activity log
      try {
        await api.post('/api/crm/activity', {
          customerId: editFormData.customerId,
          type: 'ticket',
          title: `Support Ticket Updated: #${editingTicket.id}`,
          body: `New Status: ${payload.status} | Priority: ${payload.priority}\nAssigned To: ${getUserName(payload.assignedTo)}\nResolution Notes: ${payload.resolution}`,
          createdBy: auth.name || 'Support Agent',
        });
      } catch (crmErr) {
        console.error('Failed to log ticket edit CRM Activity:', crmErr);
      }

      toast.success('Ticket updated successfully');
      setEditingTicket(null);
      loadData();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update ticket');
      toast.error('Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingTicket) return;
    try {
      await api.delete(`/api/tickets/${deletingTicket.id}`);
      toast.success('Ticket deleted successfully');
      setDeletingTicket(null);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete ticket');
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const term = searchTerm.toLowerCase();
    const custName = getCustomerName(ticket.customerId).toLowerCase();
    const assigneeName = getUserName(ticket.assignedTo).toLowerCase();
    return (
      (ticket.id || '').toLowerCase().includes(term) ||
      custName.includes(term) ||
      (ticket.issue || '').toLowerCase().includes(term) ||
      (ticket.priority || '').toLowerCase().includes(term) ||
      (ticket.status || '').toLowerCase().includes(term) ||
      assigneeName.includes(term)
    );
  });

  // Sort: newest first
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0);
    const timeB = new Date(b.createdAt || 0);
    return timeB - timeA;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="tickets-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Tickets</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Manage client support workflows, assign issue owners, and track SLA resolutions.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-create-ticket"
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
            Create Ticket
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-tickets"
            type="text"
            placeholder="Search tickets by ID, customer name, issue, status, assignee..."
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

        {currentItems.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No support tickets found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Ticket #</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Issue Description</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Assigned To</th>
                  {canModify && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((ticket) => (
                  <tr key={ticket.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{ticket.id}</td>
                    <td style={tdStyle}>
                      {ticket.customerId ? (
                        <span
                          onClick={() => navigate(`/customers/${ticket.customerId}`)}
                          style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {getCustomerName(ticket.customerId)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.issue}>
                      {ticket.issue}
                    </td>
                    <td style={tdStyle}>
                      <span style={priorityBadgeStyle(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(ticket.status)}>
                        {ticket.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <User size={13} style={{ color: 'var(--color-text-secondary)' }} />
                        <span>{getUserName(ticket.assignedTo)}</span>
                      </div>
                    </td>
                    {canModify && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleStartEdit(ticket)}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}
                            title="Edit Ticket"
                          >
                            <Pencil size={16} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeletingTicket(ticket)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Delete Ticket"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedTickets.length)} of {sortedTickets.length} tickets
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

      {/* Create Ticket Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Open Support Ticket</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Select Customer *
                <select required value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} style={inputStyle}>
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>Issue description *<input required placeholder="Briefly describe the client issue..." value={formData.issue} onChange={(e) => setFormData({ ...formData, issue: e.target.value })} style={inputStyle} /></label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Priority
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={inputStyle}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label style={labelStyle}>Status
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Assign To Owner
                <select value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>Initial Resolution Notes<textarea rows={2} placeholder="Optional resolution details..." value={formData.resolution} onChange={(e) => setFormData({ ...formData, resolution: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Submitting ticket...' : 'Open Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Ticket: {editingTicket.id}</h3>
              <button onClick={() => setEditingTicket(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Customer *
                <select required value={editFormData.customerId} onChange={(e) => setEditFormData({ ...editFormData, customerId: e.target.value })} style={inputStyle}>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>Issue description *<input required value={editFormData.issue} onChange={(e) => setEditFormData({ ...editFormData, issue: e.target.value })} style={inputStyle} /></label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Priority
                  <select value={editFormData.priority} onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })} style={inputStyle}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label style={labelStyle}>Status
                  <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Assign To Owner
                <select value={editFormData.assignedTo} onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>Resolution & Investigation Notes<textarea rows={3} placeholder="Investigative details or close-out reasons..." value={editFormData.resolution} onChange={(e) => setEditFormData({ ...editFormData, resolution: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isUpdating} style={{ ...submitButtonStyle, opacity: isUpdating ? 0.7 : 1 }}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTicket && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, width: 320, textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Delete Ticket?</h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This support ticket <strong>{deletingTicket.id}</strong> will be permanently closed and removed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingTicket(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--color-button-border)',
                  background: 'var(--color-button-bg)',
                  color: 'var(--color-button-text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleDeleteSubmit}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Delete Ticket
              </button>
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

function priorityBadgeStyle(priority) {
  const isCritical = priority === 'critical';
  const isHigh = priority === 'high';
  const isMedium = priority === 'medium';
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

function statusBadgeStyle(status) {
  const isResolved = status === 'resolved';
  const isClosed = status === 'closed';
  const isInProgress = status === 'in progress';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isResolved
      ? 'rgba(16, 185, 129, 0.12)'
      : isClosed
      ? 'rgba(100, 116, 139, 0.12)'
      : isInProgress
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(59, 130, 246, 0.12)',
    color: isResolved ? '#10b981' : isClosed ? '#64748b' : isInProgress ? '#f59e0b' : '#3b82f6',
  };
}
