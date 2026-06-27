import React from 'react';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, Trash2, ArrowUpDown, ShieldAlert, Check, X, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function UsersPage() {
  const auth = getAuthState() || { role: 'Viewer' };
  const isAdmin = auth.role === 'Admin';
  const isManager = auth.role === 'Manager';
  const canModify = isAdmin || isManager;

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Form state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newRole, setNewRole] = React.useState('Viewer');
  const [formError, setFormError] = React.useState('');

  // Edit state
  const [editingUser, setEditingUser] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editRole, setEditRole] = React.useState('Viewer');
  const [editActive, setEditActive] = React.useState(true);
  const [editError, setEditError] = React.useState('');
  
  // Deletion confirm state
  const [deletingUser, setDeletingUser] = React.useState(null);

  // Sorting state
  const [sortField, setSortField] = React.useState('name');
  const [sortAsc, setSortAsc] = React.useState(true);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data } = await api.get('/api/users');
      setUsers(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    if (sortField === 'active') {
      valA = a.active ? 1 : 0;
      valB = b.active ? 1 : 0;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setFormError('All fields are required.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setFormError('Invalid email format.');
      return;
    }

    // Password validation (must contain combination of letters and numbers)
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setFormError('Password must contain a combination of letters and numbers.');
      return;
    }

    try {
      const { data } = await api.post('/api/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      setUsers([...users, data]);
      setShowAddForm(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('Viewer');
      toast.success('User created');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create user.');
      toast.error(err?.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleToggleStatus = async (user) => {
    if (!canModify) return;
    try {
      const nextActiveState = !user.active;
      const { data } = await api.put(`/api/users/${user.id}`, { active: nextActiveState });
      setUsers(users.map(u => u.id === user.id ? data : u));
      toast.success(`User is now ${nextActiveState ? 'Active' : 'Inactive'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!isAdmin) return;
    if (userId === auth.id) {
      toast.error('Cannot delete your own account');
      return;
    }
    try {
      await api.delete(`/api/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setEditError('');
    setShowAddForm(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Name and Email are required.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setEditError('Invalid email format.');
      return;
    }

    try {
      const { data } = await api.put(`/api/users/${editingUser.id}`, {
        name: editName,
        email: editEmail,
        role: editRole,
        active: editActive,
      });
      setUsers(users.map(u => u.id === editingUser.id ? data : u));
      setEditingUser(null);
      toast.success('User updated');
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update user.');
      toast.error(err?.response?.data?.message || 'Failed to update user.');
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Loading Users...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Users Directory</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Manage administrative console users and access roles.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
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
            {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddUser} style={{ ...cardStyle, maxWidth: 500, display: 'grid', gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New User</h3>
          {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
          <label style={labelStyle}>Name<input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Email<input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Role
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={inputStyle}>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <button type="submit" style={submitButtonStyle}>Create User</button>
        </form>
      )}

      {editingUser && (
        <form onSubmit={handleUpdateUser} style={{ ...cardStyle, maxWidth: 500, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit User: {editingUser.name}</h3>
            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
          {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
          <label style={labelStyle}>Name<input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Email<input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Role
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={inputStyle}>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
            Active
          </label>
          <button type="submit" style={submitButtonStyle}>Save Changes</button>
        </form>
      )}

      {deletingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'var(--color-card-bg)',
            padding: 24,
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            border: '1px solid var(--color-button-border)',
            width: 320,
            display: 'grid',
            gap: 16,
            textAlign: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Are you sure?</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This action cannot be undone. User <strong>{deletingUser.name}</strong> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingUser(null)}
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
                onClick={() => {
                  handleDeleteUser(deletingUser.id);
                  setDeletingUser(null);
                }}
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

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={thStyle}>
                Name <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
              </th>
              <th onClick={() => handleSort('email')} style={thStyle}>
                Email <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
              </th>
              <th onClick={() => handleSort('role')} style={thStyle}>
                Role <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
              </th>
              <th onClick={() => handleSort('active')} style={thStyle}>
                Status <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
              </th>
              <th onClick={() => handleSort('lastLoginAt')} style={thStyle}>
                Last Login <ArrowUpDown size={12} style={{ marginLeft: 4 }} />
              </th>
              <th style={thActionStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id} style={trStyle}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{user.name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                  <span style={roleBadgeStyle(user.role)}>
                    {user.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleToggleStatus(user)}
                    disabled={!canModify}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: canModify ? 'pointer' : 'default',
                    }}
                  >
                    <span style={statusBadgeStyle(user.active)}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </td>
                <td style={tdStyle}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                </td>
                <td style={tdActionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {canModify && (
                      <button
                        onClick={() => handleStartEdit(user)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          padding: 4
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (user.id === auth.id) {
                            toast.error('Cannot delete your own account');
                            return;
                          }
                          setDeletingUser(user);
                        }}
                        disabled={user.id === auth.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: user.id === auth.id ? '#cbd5e1' : '#ef4444',
                          cursor: user.id === auth.id ? 'default' : 'pointer',
                          padding: 4
                        }}
                        title={user.id === auth.id ? 'Cannot delete your own account' : 'Delete user'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {!canModify && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>None</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
const inputStyle = { padding: 10, borderRadius: 10, border: '1px solid var(--color-button-border)', background: 'var(--color-card-bg)', color: 'var(--color-text-primary)' };
const submitButtonStyle = { padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' };

function roleBadgeStyle(role) {
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  return {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    background: isAdmin ? 'rgba(59, 130, 246, 0.12)' : isManager ? 'rgba(139, 92, 246, 0.12)' : 'rgba(100, 116, 139, 0.12)',
    color: isAdmin ? '#3b82f6' : isManager ? '#8b5cf6' : '#64748b',
  };
}

function statusBadgeStyle(active) {
  return {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    background: active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
    color: active ? '#10b981' : '#ef4444',
  };
}
