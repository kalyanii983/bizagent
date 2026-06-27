import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, X, Search, GitBranch, Play, Pencil, Trash2, Eye, ShieldCheck, ToggleLeft, ToggleRight, List } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function WorkflowsPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';
  const canDelete = auth.role === 'Admin' || auth.role === 'Manager';

  const [workflows, setWorkflows] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Add Workflow Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    trigger: 'email',
    condition: 'negative',
    action: 'notify + ticket',
    enabled: true,
  });
  const [formError, setFormError] = React.useState('');

  // Edit Workflow Modal
  const [editingWorkflow, setEditingWorkflow] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    name: '',
    trigger: 'email',
    condition: 'negative',
    action: 'notify + ticket',
    enabled: true,
  });
  const [editError, setEditError] = React.useState('');

  // Execute Workflow Modal
  const [executingWorkflow, setExecutingWorkflow] = React.useState(null);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [execPayloadString, setExecPayloadString] = React.useState('');
  const [execResult, setExecResult] = React.useState(null);

  // Detail Modal
  const [selectedWorkflow, setSelectedWorkflow] = React.useState(null);

  // Delete Confirm State
  const [deletingWorkflow, setDeletingWorkflow] = React.useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [wfRes, custRes] = await Promise.all([
        api.get('/api/workflows'),
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
      ]);
      setWorkflows(wfRes.data.items || []);
      setCustomers(custRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load workflows list');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();

    const handleSocketWorkflowExecuted = () => {
      loadData();
    };

    window.addEventListener('socket_workflow_executed', handleSocketWorkflowExecuted);
    return () => {
      window.removeEventListener('socket_workflow_executed', handleSocketWorkflowExecuted);
    };
  }, []);

  const handleToggleEnabled = async (wf) => {
    if (!canModify) {
      toast.error('You do not have permission to toggle workflows.');
      return;
    }
    try {
      const updatedEnabled = !wf.enabled;
      await api.put(`/api/workflows/${wf.id}`, { enabled: updatedEnabled });
      setWorkflows((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, enabled: updatedEnabled } : w))
      );
      toast.success(`Workflow ${updatedEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      toast.error('Failed to toggle workflow status');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Workflow Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        trigger: formData.trigger,
        condition: formData.condition.trim(),
        action: formData.action,
        enabled: formData.enabled,
        steps: ['trigger', 'condition', 'action'],
      };

      await api.post('/api/workflows', payload);
      toast.success('Workflow created successfully');
      setShowAddModal(false);
      setFormData({
        name: '',
        trigger: 'email',
        condition: 'negative',
        action: 'notify + ticket',
        enabled: true,
      });
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create workflow');
      toast.error('Failed to create workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (wf) => {
    setEditingWorkflow(wf);
    setEditFormData({
      name: wf.name || '',
      trigger: wf.trigger || 'email',
      condition: wf.condition || '',
      action: wf.action || 'notify + ticket',
      enabled: wf.enabled !== false,
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setEditError('');

    if (!editFormData.name.trim()) {
      setEditError('Workflow Name is required');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        trigger: editFormData.trigger,
        condition: editFormData.condition.trim(),
        action: editFormData.action,
        enabled: editFormData.enabled,
      };

      await api.put(`/api/workflows/${editingWorkflow.id}`, payload);
      toast.success('Workflow updated successfully');
      setEditingWorkflow(null);
      loadData();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update workflow');
      toast.error('Failed to update workflow');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartExecute = (wf) => {
    setExecutingWorkflow(wf);
    const sampleCustomer = customers[0]?.id || 'customer_1';
    setExecPayloadString(JSON.stringify({
      customerId: sampleCustomer,
      sentiment: wf.condition === 'negative' ? 'negative' : 'positive',
      urgency: 'high',
      issue: 'Urgent payment failed escalation trigger',
      priority: 'high',
    }, null, 2));
    setExecResult(null);
  };

  const handleExecuteSubmit = async (e) => {
    e.preventDefault();
    if (isExecuting) return;
    setIsExecuting(true);
    setExecResult(null);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(execPayloadString);
    } catch (err) {
      toast.error('Invalid JSON payload structure');
      setIsExecuting(false);
      return;
    }

    try {
      const { data } = await api.post(`/api/workflows/${executingWorkflow.id}/execute`, parsedPayload);
      setExecResult(data);
      toast.success(`Workflow execution triggered: status ${data.log?.status}`);
      loadData(); // Reload logs
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingWorkflow) return;
    try {
      await api.delete(`/api/workflows/${deletingWorkflow.id}`);
      toast.success('Workflow deleted successfully');
      setDeletingWorkflow(null);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete workflow');
    }
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter((wf) => {
    const term = searchTerm.toLowerCase();
    return (
      (wf.name || '').toLowerCase().includes(term) ||
      (wf.trigger || '').toLowerCase().includes(term) ||
      (wf.action || '').toLowerCase().includes(term)
    );
  });

  // Sort
  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedWorkflows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedWorkflows.length / itemsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="workflows-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Workflows</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Orchestrate business triggers, test escalation patterns, and review pipeline logs.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-create-workflow"
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
            Create Workflow
          </button>
        )}
      </div>

      {/* Main Single Card layout */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-workflows"
            type="text"
            placeholder="Search workflows by name, trigger, action..."
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
            No workflows found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Workflow Name</th>
                  <th style={thStyle}>Trigger Event</th>
                  <th style={thStyle}>Condition Criteria</th>
                  <th style={thStyle}>Configured Action</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Execution Logs</th>
                  {canModify && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((wf) => (
                  <tr key={wf.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 650 }}>{wf.name}</td>
                    <td style={tdStyle}>
                      <span style={triggerBadgeStyle}>{wf.trigger}</span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>
                      {wf.condition || 'None'}
                    </td>
                    <td style={tdStyle}>
                      <span style={actionBadgeStyle}>{wf.action}</span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggleEnabled(wf)}
                        disabled={!canModify}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: canModify ? 'pointer' : 'default',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: wf.enabled ? '#10b981' : '#ef4444'
                        }}
                        title={wf.enabled ? "Click to Disable" : "Click to Enable"}
                      >
                        {wf.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, textTransform: 'uppercase' }}>
                          {wf.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setSelectedWorkflow(wf)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <List size={14} />
                        Logs ({wf.logs?.length || 0})
                      </button>
                    </td>
                    {canModify && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleStartExecute(wf)}
                            disabled={!wf.enabled}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: wf.enabled ? '#10b981' : 'var(--color-text-secondary)',
                              cursor: wf.enabled ? 'pointer' : 'default',
                              opacity: wf.enabled ? 1 : 0.4,
                              padding: 4
                            }}
                            title="Execute Test Payload"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => handleStartEdit(wf)}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}
                            title="Edit Workflow"
                          >
                            <Pencil size={16} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeletingWorkflow(wf)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Delete Workflow"
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
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedWorkflows.length)} of {sortedWorkflows.length} workflows
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

      {/* Create Workflow Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Workflow</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Workflow Name *<input required placeholder="e.g. Negative Email Escalation" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} /></label>

              <label style={labelStyle}>
                Trigger Event
                <select value={formData.trigger} onChange={(e) => setFormData({ ...formData, trigger: e.target.value })} style={inputStyle}>
                  <option value="email">email_received (Email)</option>
                  <option value="meeting">meeting_created (Meeting)</option>
                  <option value="invoice">invoice_due (Invoice)</option>
                  <option value="ticket">ticket_created (Ticket)</option>
                </select>
              </label>

              <label style={labelStyle}>Condition Criteria (substring check on payload)<input placeholder="e.g. negative or critical" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} style={inputStyle} /></label>

              <label style={labelStyle}>
                Action Target
                <select value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })} style={inputStyle}>
                  <option value="notify + ticket">notify + ticket (Generate Ticket & Alert)</option>
                  <option value="notify">notify (Alert User)</option>
                  <option value="ticket">ticket (Generate Ticket)</option>
                </select>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14 }}>Enable on Creation</span>
                <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              </div>

              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Creating...' : 'Create Workflow'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workflow Modal */}
      {editingWorkflow && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Workflow: {editingWorkflow.name}</h3>
              <button onClick={() => setEditingWorkflow(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>Workflow Name *<input required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} style={inputStyle} /></label>

              <label style={labelStyle}>
                Trigger Event
                <select value={editFormData.trigger} onChange={(e) => setEditFormData({ ...editFormData, trigger: e.target.value })} style={inputStyle}>
                  <option value="email">email_received (Email)</option>
                  <option value="meeting">meeting_created (Meeting)</option>
                  <option value="invoice">invoice_due (Invoice)</option>
                  <option value="ticket">ticket_created (Ticket)</option>
                </select>
              </label>

              <label style={labelStyle}>Condition Criteria<input value={editFormData.condition} onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })} style={inputStyle} /></label>

              <label style={labelStyle}>
                Action Target
                <select value={editFormData.action} onChange={(e) => setEditFormData({ ...editFormData, action: e.target.value })} style={inputStyle}>
                  <option value="notify + ticket">notify + ticket (Generate Ticket & Alert)</option>
                  <option value="notify">notify (Alert User)</option>
                  <option value="ticket">ticket (Generate Ticket)</option>
                </select>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14 }}>Workflow Active</span>
                <input type="checkbox" checked={editFormData.enabled} onChange={(e) => setEditFormData({ ...editFormData, enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
              </div>

              <button type="submit" disabled={isUpdating} style={{ ...submitButtonStyle, opacity: isUpdating ? 0.7 : 1 }}>
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Execute Test Modal */}
      {executingWorkflow && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Execute Workflow: {executingWorkflow.name}</h3>
              <button onClick={() => setExecutingWorkflow(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleExecuteSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Test JSON Payload
                <textarea
                  rows={6}
                  required
                  value={execPayloadString}
                  onChange={(e) => setExecPayloadString(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                />
              </label>
              <button type="submit" disabled={isExecuting} style={{ ...submitButtonStyle, background: '#10b981', opacity: isExecuting ? 0.7 : 1 }}>
                {isExecuting ? 'Executing Workflow...' : 'Execute Test Payload'}
              </button>
            </form>

            {/* Results display */}
            {execResult && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--color-button-border)', paddingTop: 16 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Execution Result Summary
                </span>
                <div style={{ display: 'grid', gap: 8, background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)', fontSize: 13 }}>
                  <div>Status: <strong style={{ color: execResult.log?.status === 'completed' ? '#10b981' : '#f59e0b' }}>{execResult.log?.status}</strong></div>
                  <div>Condition Met: <strong>{execResult.log?.status === 'completed' ? 'Yes' : 'No (Skipped Action)'}</strong></div>
                  <div>Timestamp: <strong>{new Date(execResult.log?.createdAt || Date.now()).toLocaleString()}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect Execution Logs Modal */}
      {selectedWorkflow && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Execution Logs: {selectedWorkflow.name}</h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Trigger: <strong>{selectedWorkflow.trigger}</strong> | Action: <strong>{selectedWorkflow.action}</strong>
                </span>
              </div>
              <button onClick={() => setSelectedWorkflow(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14, marginTop: 12, maxHeight: 400, overflowY: 'auto' }}>
              {!selectedWorkflow.logs || selectedWorkflow.logs.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No execution logs recorded yet.
                </div>
              ) : (
                [...selectedWorkflow.logs].reverse().map((log, idx) => (
                  <div key={log.id || idx} style={{ display: 'grid', gap: 8, background: 'var(--color-button-bg)', padding: 12, borderRadius: 12, border: '1px solid var(--color-button-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: log.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                        {log.status === 'completed' ? 'Completed' : 'Skipped'}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'monospace', overflowX: 'auto', background: 'var(--color-card-bg)', padding: 8, borderRadius: 8 }}>
                      {JSON.stringify(log.payload, null, 2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkflow && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, width: 320, textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Delete Workflow?</h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This workflow <strong>{deletingWorkflow.name}</strong> will be permanently deleted from the pipeline.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingWorkflow(null)}
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
                Delete
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

const triggerBadgeStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 20,
  background: 'rgba(236, 72, 153, 0.12)',
  color: '#ec4899',
};

const actionBadgeStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: 20,
  background: 'rgba(99, 102, 241, 0.12)',
  color: '#6366f1',
};
