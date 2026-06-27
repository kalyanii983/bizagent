import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, X, Search, Calendar, Pencil, Trash2, Clock, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function MeetingsPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';
  const canDelete = auth.role === 'Admin' || auth.role === 'Manager';

  const [meetings, setMeetings] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    attendeesString: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'scheduled',
    customerId: '',
  });
  const [formError, setFormError] = React.useState('');

  // Edit State
  const [editingMeeting, setEditingMeeting] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    title: '',
    attendeesString: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'scheduled',
    customerId: '',
  });
  const [editError, setEditError] = React.useState('');

  // Delete State
  const [deletingMeeting, setDeletingMeeting] = React.useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [meetingsRes, customersRes] = await Promise.all([
        api.get('/api/meetings'),
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
      ]);
      setMeetings(meetingsRes.data.items || []);
      setCustomers(customersRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch meetings data');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();

    const handleSocketNewMeeting = () => {
      loadData();
    };

    window.addEventListener('socket_new_meeting', handleSocketNewMeeting);
    return () => {
      window.removeEventListener('socket_new_meeting', handleSocketNewMeeting);
    };
  }, []);

  const validateTimes = (start, end) => {
    const startTimeDate = new Date(start);
    const endTimeDate = new Date(end);
    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return 'Invalid date/time inputs';
    }
    if (endTimeDate <= startTimeDate) {
      return 'End time must be after start time';
    }
    return null;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setFormError('Start time and End time are required');
      return;
    }
    const timeErr = validateTimes(formData.startTime, formData.endTime);
    if (timeErr) {
      setFormError(timeErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const attendees = formData.attendeesString
        ? formData.attendeesString.split(',').map((a) => a.trim()).filter(Boolean)
        : [];

      const payload = {
        title: formData.title.trim(),
        attendees,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        notes: formData.notes.trim(),
        status: formData.status,
        customerId: formData.customerId || null,
      };

      const { data: newMeeting } = await api.post('/api/meetings', payload);

      // Create CRM Activity log if customer is matched
      if (formData.customerId) {
        try {
          await api.post('/api/crm/activity', {
            customerId: formData.customerId,
            type: 'meeting',
            title: `Meeting Scheduled: ${payload.title}`,
            body: `Attendees: ${attendees.join(', ')}\nTime: ${new Date(payload.startTime).toLocaleString()} - ${new Date(payload.endTime).toLocaleString()}\nNotes: ${payload.notes}`,
            createdBy: auth.name || 'Staff User',
          });
        } catch (crmErr) {
          console.error('Failed to log meeting CRM Activity:', crmErr);
        }
      }

      toast.success('Meeting scheduled successfully');
      setShowAddModal(false);
      setFormData({
        title: '',
        attendeesString: '',
        startTime: '',
        endTime: '',
        notes: '',
        status: 'scheduled',
        customerId: '',
      });
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to schedule meeting');
      toast.error('Failed to create meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (meeting) => {
    setEditingMeeting(meeting);
    const startLocal = meeting.startTime ? new Date(meeting.startTime).toISOString().slice(0, 16) : '';
    const endLocal = meeting.endTime ? new Date(meeting.endTime).toISOString().slice(0, 16) : '';

    setEditFormData({
      title: meeting.title || '',
      attendeesString: (meeting.attendees || []).join(', '),
      startTime: startLocal,
      endTime: endLocal,
      notes: meeting.notes || '',
      status: meeting.status || 'scheduled',
      customerId: meeting.customerId || '',
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setEditError('');

    if (!editFormData.title.trim()) {
      setEditError('Title is required');
      return;
    }
    if (!editFormData.startTime || !editFormData.endTime) {
      setEditError('Start time and End time are required');
      return;
    }
    const timeErr = validateTimes(editFormData.startTime, editFormData.endTime);
    if (timeErr) {
      setEditError(timeErr);
      return;
    }

    setIsUpdating(true);
    try {
      const attendees = editFormData.attendeesString
        ? editFormData.attendeesString.split(',').map((a) => a.trim()).filter(Boolean)
        : [];

      const payload = {
        title: editFormData.title.trim(),
        attendees,
        startTime: new Date(editFormData.startTime).toISOString(),
        endTime: new Date(editFormData.endTime).toISOString(),
        notes: editFormData.notes.trim(),
        status: editFormData.status,
        customerId: editFormData.customerId || null,
      };

      await api.put(`/api/meetings/${editingMeeting.id}`, payload);
      toast.success('Meeting updated successfully');
      setEditingMeeting(null);
      loadData();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update meeting');
      toast.error('Failed to update meeting');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingMeeting) return;
    try {
      await api.delete(`/api/meetings/${deletingMeeting.id}`);
      toast.success('Meeting cancelled and deleted');
      setDeletingMeeting(null);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel meeting');
    }
  };

  const getCustomerName = (custId) => {
    if (!custId) return '-';
    const c = customers.find((item) => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    const term = searchTerm.toLowerCase();
    const custName = getCustomerName(meeting.customerId).toLowerCase();
    return (
      (meeting.title || '').toLowerCase().includes(term) ||
      custName.includes(term) ||
      (meeting.notes || '').toLowerCase().includes(term)
    );
  });

  // Sort: newest start time first
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    const timeA = new Date(a.startTime || 0);
    const timeB = new Date(b.startTime || 0);
    return timeB - timeA;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedMeetings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedMeetings.length / itemsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="meetings-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Meetings</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Schedule, monitor, and coordinate operational client meetings and calendars.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-create-meeting"
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
            Create Meeting
          </button>
        )}
      </div>

      {/* Main Single Card layout */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-meetings"
            type="text"
            placeholder="Search meetings by title, customer, notes..."
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
            No meetings found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Attendees</th>
                  <th style={thStyle}>Start Time</th>
                  <th style={thStyle}>End Time</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Customer</th>
                  {canModify && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((meeting) => (
                  <tr key={meeting.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 650 }}>{meeting.title}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <Users size={14} style={{ color: 'var(--color-text-secondary)' }} />
                        <span>
                          {meeting.attendees && meeting.attendees.length > 0
                            ? meeting.attendees.join(', ')
                            : 'No attendees'}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>{new Date(meeting.startTime).toLocaleString()}</td>
                    <td style={tdStyle}>{new Date(meeting.endTime).toLocaleString()}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(meeting.status)}>
                        {meeting.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {meeting.customerId ? (
                        <span
                          onClick={() => navigate(`/customers/${meeting.customerId}`)}
                          style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {getCustomerName(meeting.customerId)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canModify && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleStartEdit(meeting)}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}
                            title="Edit Meeting"
                          >
                            <Pencil size={16} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeletingMeeting(meeting)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Cancel Meeting"
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
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedMeetings.length)} of {sortedMeetings.length} meetings
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

      {/* Create Meeting Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Meeting</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Meeting Title *<input required placeholder="e.g. Project kick-off" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Attendees (comma-separated)<input placeholder="e.g. John Doe, Sarah Manager" value={formData.attendeesString} onChange={(e) => setFormData({ ...formData, attendeesString: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Start Time *<input type="datetime-local" required value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>End Time *<input type="datetime-local" required value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Status
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label style={labelStyle}>Associate Customer
                <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} style={inputStyle}>
                  <option value="">None</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>Notes<textarea rows={3} placeholder="Add discussion points, agenda, links..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Scheduling...' : 'Create Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Meeting: {editingMeeting.title}</h3>
              <button onClick={() => setEditingMeeting(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Meeting Title *<input required value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Attendees (comma-separated)<input value={editFormData.attendeesString} onChange={(e) => setEditFormData({ ...editFormData, attendeesString: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Start Time *<input type="datetime-local" required value={editFormData.startTime} onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>End Time *<input type="datetime-local" required value={editFormData.endTime} onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Status
                <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} style={inputStyle}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label style={labelStyle}>Associate Customer
                <select value={editFormData.customerId} onChange={(e) => setEditFormData({ ...editFormData, customerId: e.target.value })} style={inputStyle}>
                  <option value="">None</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>Notes<textarea rows={3} value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isUpdating} style={{ ...submitButtonStyle, opacity: isUpdating ? 0.7 : 1 }}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMeeting && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, width: 320, textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Are you sure?</h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This meeting <strong>{deletingMeeting.title}</strong> will be permanently cancelled.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingMeeting(null)}
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
                Cancel Meeting
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

function statusBadgeStyle(status) {
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isCompleted
      ? 'rgba(16, 185, 129, 0.12)'
      : isCancelled
      ? 'rgba(239, 68, 68, 0.12)'
      : 'rgba(59, 130, 246, 0.12)',
    color: isCompleted ? '#10b981' : isCancelled ? '#ef4444' : '#3b82f6',
  };
}
