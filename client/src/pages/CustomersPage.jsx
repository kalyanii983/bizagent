import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, Trash2, ArrowUpDown, X, Pencil, Eye, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CustomersPage() {
  const auth = getAuthState() || { role: 'Viewer' };
  const navigate = useNavigate();

  // Role permissions
  const isAdmin = auth.role === 'Admin';
  const isManager = auth.role === 'Manager';
  const isEmployee = auth.role === 'Employee';
  const canModify = isAdmin || isManager || isEmployee;
  const canDelete = isAdmin || isManager;

  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Form states
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    tagsString: '',
    preferences: '',
    notes: '',
    healthScore: 0,
  });
  const [formError, setFormError] = React.useState('');

  // Edit states
  const [editingCustomer, setEditingCustomer] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
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

  // Delete state
  const [deletingCustomer, setDeletingCustomer] = React.useState(null);

  // Sorting state
  const [sortField, setSortField] = React.useState('name');
  const [sortAsc, setSortAsc] = React.useState(true);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data } = await api.get('/api/customers');
      setCustomers(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (!validateEmail(formData.email.trim())) {
      setFormError('Invalid email format.');
      return;
    }

    const healthVal = parseInt(formData.healthScore);
    if (isNaN(healthVal) || healthVal < 0 || healthVal > 100) {
      setFormError('Health Score must be a number between 0 and 100.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = formData.tagsString
        ? formData.tagsString.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        tags,
        preferences: formData.preferences,
        notes: formData.notes,
        healthScore: healthVal,
      };

      const { data } = await api.post('/api/customers', payload);
      setCustomers((prev) => [...prev, data]);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        tagsString: '',
        preferences: '',
        notes: '',
        healthScore: 0,
      });
      toast.success('Customer created successfully');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create customer');
      toast.error(err?.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cust) => {
    setEditingCustomer(cust);
    setEditFormData({
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      company: cust.company || '',
      tagsString: (cust.tags || []).join(', '),
      preferences: typeof cust.preferences === 'string' ? cust.preferences : JSON.stringify(cust.preferences || ''),
      notes: cust.notes || '',
      healthScore: cust.healthScore || 0,
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return; // Prevent double submission
    setEditError('');

    if (!editFormData.name.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (!editFormData.email.trim()) {
      setEditError('Email is required.');
      return;
    }
    if (!validateEmail(editFormData.email.trim())) {
      setEditError('Invalid email format.');
      return;
    }

    const healthVal = parseInt(editFormData.healthScore);
    if (isNaN(healthVal) || healthVal < 0 || healthVal > 100) {
      setEditError('Health Score must be a number between 0 and 100.');
      return;
    }

    setIsUpdating(true);
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

      const { data } = await api.put(`/api/customers/${editingCustomer.id}`, payload);
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? data : c))
      );
      setEditingCustomer(null);
      toast.success('Customer updated successfully');
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update customer');
      toast.error(err?.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingCustomer) return;
    try {
      await api.delete(`/api/customers/${deletingCustomer.id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      setDeletingCustomer(null);
      toast.success('Customer deleted successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete customer');
    }
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter((cust) => {
    const term = searchTerm.toLowerCase();
    return (
      (cust.name || '').toLowerCase().includes(term) ||
      (cust.company || '').toLowerCase().includes(term) ||
      (cust.email || '').toLowerCase().includes(term)
    );
  });

  // Sort filtered customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading Customers...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="customers-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Customers</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            View and manage customer details, tags, and operational scores.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-create-customer"
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
            Create Customer
          </button>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Customer</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Name *<input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Email *<input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Phone<input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Company<input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Tags (comma separated)<input placeholder="e.g. VIP, Enterprise, Lead" value={formData.tagsString} onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Preferences<input placeholder="e.g. Monthly reports" value={formData.preferences} onChange={(e) => setFormData({ ...formData, preferences: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Health Score (0-100)<input type="number" min="0" max="100" value={formData.healthScore} onChange={(e) => setFormData({ ...formData, healthScore: parseInt(e.target.value) || 0 })} style={inputStyle} /></label>
              <label style={labelStyle}>Notes<textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'default' : 'pointer' }}>
                {isSubmitting ? 'Creating Customer...' : 'Create Customer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Customer: {editingCustomer.name}</h3>
              <button onClick={() => setEditingCustomer(null)} style={closeButtonStyle}>
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
              <button type="submit" disabled={isUpdating} style={{ ...submitButtonStyle, opacity: isUpdating ? 0.7 : 1, cursor: isUpdating ? 'default' : 'pointer' }}>
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirm Modal */}
      {deletingCustomer && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, width: 320, textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Are you sure?</h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This action cannot be undone. Customer <strong>{deletingCustomer.name}</strong> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingCustomer(null)}
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
                Cancel
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Single Customer Card (Search and Table consolidated) */}
      <div style={cardStyle}>
        {/* Search Input inside the table card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-customer"
            type="text"
            placeholder="Search by name, company or email..."
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
            No customers found.
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={thStyle}>
                  Name <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('email')} style={thStyle}>
                  Email <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('phone')} style={thStyle}>
                  Phone <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th onClick={() => handleSort('company')} style={thStyle}>
                  Company <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th style={thStyle}>Tags</th>
                <th onClick={() => handleSort('healthScore')} style={thStyle}>
                  Health Score <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
                </th>
                <th style={thActionStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((cust) => (
                <tr key={cust.id} style={trStyle}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{cust.name}</td>
                  <td style={tdStyle}>{cust.email || '-'}</td>
                  <td style={tdStyle}>{cust.phone || '-'}</td>
                  <td style={tdStyle}>{cust.company || '-'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(cust.tags || []).length > 0 ? (
                        cust.tags.map((tag, idx) => (
                          <span key={idx} style={tagBadgeStyle}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>-</span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={healthBadgeStyle(cust.healthScore || 0)}>
                      {cust.healthScore || 0}
                    </span>
                  </td>
                  <td style={tdActionStyle}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={() => navigate(`/customers/${cust.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#10b981',
                          cursor: 'pointer',
                          padding: 4
                        }}
                        title="View Customer 360"
                      >
                        <Eye size={16} />
                      </button>
                      {canModify && (
                        <button
                          onClick={() => handleStartEdit(cust)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            padding: 4
                          }}
                          title="Edit Customer"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeletingCustomer(cust)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4
                          }}
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedCustomers.length)} of {sortedCustomers.length} customers
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={paginationButtonStyle}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
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
                onClick={() => handlePageChange(currentPage + 1)}
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
  overflowX: 'auto',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const thStyle = {
  padding: '12px 16px',
  borderBottom: '2px solid var(--color-button-border)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  cursor: 'pointer',
  userSelect: 'none',
};

const thActionStyle = {
  padding: '12px 16px',
  borderBottom: '2px solid var(--color-button-border)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  textAlign: 'right',
};

const trStyle = {
  borderBottom: '1px solid var(--color-button-border)',
};

const tdStyle = {
  padding: '16px',
  fontSize: 14,
};

const tdActionStyle = {
  padding: '16px',
  fontSize: 14,
  textAlign: 'right',
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
