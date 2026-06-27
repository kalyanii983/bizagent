import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, X, Search, FileText, Download, Pencil, Trash2, Calendar, DollarSign, ListPlus, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function InvoicesPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';
  const canDelete = auth.role === 'Admin' || auth.role === 'Manager';

  const [invoices, setInvoices] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Add Invoice Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lineItems, setLineItems] = React.useState([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [formData, setFormData] = React.useState({
    customerId: '',
    dueDate: '',
    status: 'draft',
    notes: '',
  });
  const [formError, setFormError] = React.useState('');

  // Edit Invoice Modal
  const [editingInvoice, setEditingInvoice] = React.useState(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editLineItems, setEditLineItems] = React.useState([]);
  const [editFormData, setEditFormData] = React.useState({
    customerId: '',
    dueDate: '',
    status: 'draft',
    notes: '',
  });
  const [editError, setEditError] = React.useState('');

  // Delete Confirm State
  const [deletingInvoice, setDeletingInvoice] = React.useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [invoicesRes, customersRes] = await Promise.all([
        api.get('/api/invoices'),
        api.get('/api/customers').catch(() => ({ data: { items: [] } })),
      ]);
      setInvoices(invoicesRes.data.items || []);
      setCustomers(customersRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();

    const handleSocketNewInvoice = () => {
      loadData();
    };

    window.addEventListener('socket_new_invoice', handleSocketNewInvoice);
    return () => {
      window.removeEventListener('socket_new_invoice', handleSocketNewInvoice);
    };
  }, []);

  const getCustomerName = (custId) => {
    if (!custId) return '-';
    const c = customers.find((item) => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  const calculateTotal = (items) => {
    return items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  };

  // Line Item Handlers for Add
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    if (field === 'quantity') updated[index].quantity = parseInt(value) || 0;
    else if (field === 'unitPrice') updated[index].unitPrice = parseFloat(value) || 0;
    else updated[index][field] = value;
    setLineItems(updated);
  };

  // Line Item Handlers for Edit
  const handleEditAddLineItem = () => {
    setEditLineItems([...editLineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleEditRemoveLineItem = (index) => {
    if (editLineItems.length === 1) return;
    setEditLineItems(editLineItems.filter((_, i) => i !== index));
  };

  const handleEditLineItemChange = (index, field, value) => {
    const updated = [...editLineItems];
    if (field === 'quantity') updated[index].quantity = parseInt(value) || 0;
    else if (field === 'unitPrice') updated[index].unitPrice = parseFloat(value) || 0;
    else updated[index][field] = value;
    setEditLineItems(updated);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.customerId) {
      setFormError('Customer is required');
      return;
    }
    if (!formData.dueDate) {
      setFormError('Due date is required');
      return;
    }

    const totalAmount = calculateTotal(lineItems);
    if (totalAmount <= 0) {
      setFormError('Invoice total amount must be a positive number');
      return;
    }

    // Validate line items
    const invalidItem = lineItems.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0);
    if (invalidItem) {
      setFormError('All line items must have a valid description, quantity, and unit price.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: formData.customerId,
        dueDate: formData.dueDate,
        status: formData.status,
        amount: totalAmount,
        lineItems,
        notes: formData.notes,
      };

      const { data: newInvoice } = await api.post('/api/invoices', payload);

      // Create CRM Activity log
      try {
        await api.post('/api/crm/activity', {
          customerId: formData.customerId,
          type: 'invoice',
          title: `Invoice Created: #${newInvoice.id}`,
          body: `Amount: $${totalAmount} | Due Date: ${new Date(formData.dueDate).toLocaleDateString()}\nStatus: ${formData.status}\nItems:\n${lineItems.map(item => ` - ${item.description} (x${item.quantity}): $${item.quantity * item.unitPrice}`).join('\n')}`,
          createdBy: auth.name || 'Billing Service',
        });
      } catch (crmErr) {
        console.error('Failed to log invoice CRM Activity:', crmErr);
      }

      toast.success('Invoice created and PDF generated successfully');
      setShowAddModal(false);
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setFormData({ customerId: '', dueDate: '', status: 'draft', notes: '' });
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create invoice');
      toast.error('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (invoice) => {
    if (invoice.status !== 'draft') {
      toast.error('Only Draft invoices can be updated.');
      return;
    }
    setEditingInvoice(invoice);
    setEditLineItems(invoice.lineItems || [{ description: '', quantity: 1, unitPrice: 0 }]);
    setEditFormData({
      customerId: invoice.customerId || '',
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      status: invoice.status || 'draft',
      notes: invoice.notes || '',
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
    if (!editFormData.dueDate) {
      setEditError('Due date is required');
      return;
    }

    const totalAmount = calculateTotal(editLineItems);
    if (totalAmount <= 0) {
      setEditError('Invoice total amount must be a positive number');
      return;
    }

    const invalidItem = editLineItems.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0);
    if (invalidItem) {
      setEditError('All line items must have a valid description, quantity, and unit price.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        customerId: editFormData.customerId,
        dueDate: editFormData.dueDate,
        status: editFormData.status,
        amount: totalAmount,
        lineItems: editLineItems,
        notes: editFormData.notes,
      };

      await api.put(`/api/invoices/${editingInvoice.id}`, payload);

      // Create CRM Activity log for update
      try {
        await api.post('/api/crm/activity', {
          customerId: editFormData.customerId,
          type: 'invoice',
          title: `Invoice Updated: #${editingInvoice.id}`,
          body: `New Amount: $${totalAmount} | New Status: ${editFormData.status}`,
          createdBy: auth.name || 'Billing Service',
        });
      } catch (crmErr) {
        console.error('Failed to log invoice edit CRM Activity:', crmErr);
      }

      toast.success('Invoice updated and PDF regenerated');
      setEditingInvoice(null);
      loadData();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Failed to update invoice');
      toast.error('Failed to update invoice');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingInvoice) return;
    try {
      await api.delete(`/api/invoices/${deletingInvoice.id}`);
      toast.success('Invoice deleted successfully');
      setDeletingInvoice(null);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleDownloadPdf = (invoice) => {
    if (!invoice.pdfUrl) {
      toast.error('PDF URL not found. Generating PDF...');
      return;
    }
    const baseUrl = api.defaults.baseURL || 'http://localhost:4002';
    // Open the PDF in a new tab
    window.open(`${baseUrl}${invoice.pdfUrl}`, '_blank');
  };

  // Filtering
  const filteredInvoices = invoices.filter((invoice) => {
    const term = searchTerm.toLowerCase();
    const custName = getCustomerName(invoice.customerId).toLowerCase();
    return (
      (invoice.id || '').toLowerCase().includes(term) ||
      custName.includes(term) ||
      (invoice.status || '').toLowerCase().includes(term)
    );
  });

  // Sort: newest first
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0);
    const timeB = new Date(b.createdAt || 0);
    return timeB - timeA;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="invoices-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Invoices</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Issue invoices, configure line items, track payment collection, and download generated PDF records.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-create-invoice"
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
            Create Invoice
          </button>
        )}
      </div>

      {/* Main Single Card layout */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-invoices"
            type="text"
            placeholder="Search invoices by invoice #, customer name, status..."
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
            No invoices found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>PDF Document</th>
                  {canModify && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((invoice) => (
                  <tr key={invoice.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{invoice.id}</td>
                    <td style={tdStyle}>
                      {invoice.customerId ? (
                        <span
                          onClick={() => navigate(`/customers/${invoice.customerId}`)}
                          style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {getCustomerName(invoice.customerId)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>${invoice.amount?.toLocaleString() || 0}</td>
                    <td style={tdStyle}>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(invoice.status)}>
                        {invoice.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDownloadPdf(invoice)}
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
                        <Download size={15} />
                        Download
                      </button>
                    </td>
                    {canModify && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => handleStartEdit(invoice)}
                            disabled={invoice.status !== 'draft'}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: invoice.status === 'draft' ? '#3b82f6' : 'var(--color-text-secondary)',
                              cursor: invoice.status === 'draft' ? 'pointer' : 'default',
                              padding: 4,
                              opacity: invoice.status === 'draft' ? 1 : 0.4
                            }}
                            title={invoice.status === 'draft' ? "Edit Invoice" : "Only Draft Invoices can be edited"}
                          >
                            <Pencil size={16} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeletingInvoice(invoice)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Delete Invoice"
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
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedInvoices.length)} of {sortedInvoices.length} invoices
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

      {/* Create Invoice Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Invoice</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  Select Customer *
                  <select required value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} style={inputStyle}>
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>Due Date *<input type="date" required value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} style={inputStyle} /></label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Status
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
                <label style={labelStyle}>Total Amount (Calculated)<div style={{ ...inputStyle, background: 'rgba(0,0,0,0.05)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={16} />{calculateTotal(lineItems).toLocaleString()}</div></label>
              </div>

              {/* Line Items Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Itemized Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: 'var(--color-button-bg)',
                      border: '1px solid var(--color-button-border)',
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                      color: 'var(--color-button-text)'
                    }}
                  >
                    <ListPlus size={14} /> Add Line
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 10, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {lineItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <input required placeholder="Description (e.g. Consulting)" value={item.description} onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)} style={inputStyle} />
                      <input type="number" min="1" required placeholder="Qty" value={item.quantity} onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)} style={inputStyle} />
                      <input type="number" min="0" step="0.01" required placeholder="Price" value={item.unitPrice} onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)} style={inputStyle} />
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={lineItems.length === 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: lineItems.length === 1 ? 'default' : 'pointer',
                          opacity: lineItems.length === 1 ? 0.3 : 1
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label style={labelStyle}>Invoice Notes<textarea rows={2} placeholder="Optional billing notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Creating & Generating PDF...' : 'Create Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Invoice: {editingInvoice.id}</h3>
              <button onClick={() => setEditingInvoice(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {editError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{editError}</p>}
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>
                  Customer *
                  <select required value={editFormData.customerId} onChange={(e) => setEditFormData({ ...editFormData, customerId: e.target.value })} style={inputStyle}>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>Due Date *<input type="date" required value={editFormData.dueDate} onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })} style={inputStyle} /></label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Status
                  <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} style={inputStyle}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
                <label style={labelStyle}>Total Amount (Calculated)<div style={{ ...inputStyle, background: 'rgba(0,0,0,0.05)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={16} />{calculateTotal(editLineItems).toLocaleString()}</div></label>
              </div>

              {/* Line Items Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Itemized Line Items</span>
                  <button
                    type="button"
                    onClick={handleEditAddLineItem}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: 'var(--color-button-bg)',
                      border: '1px solid var(--color-button-border)',
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                      color: 'var(--color-button-text)'
                    }}
                  >
                    <ListPlus size={14} /> Add Line
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 10, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {editLineItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <input required placeholder="Description" value={item.description} onChange={(e) => handleEditLineItemChange(idx, 'description', e.target.value)} style={inputStyle} />
                      <input type="number" min="1" required placeholder="Qty" value={item.quantity} onChange={(e) => handleEditLineItemChange(idx, 'quantity', e.target.value)} style={inputStyle} />
                      <input type="number" min="0" step="0.01" required placeholder="Price" value={item.unitPrice} onChange={(e) => handleEditLineItemChange(idx, 'unitPrice', e.target.value)} style={inputStyle} />
                      <button
                        type="button"
                        onClick={() => handleEditRemoveLineItem(idx)}
                        disabled={editLineItems.length === 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: editLineItems.length === 1 ? 'default' : 'pointer',
                          opacity: editLineItems.length === 1 ? 0.3 : 1
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label style={labelStyle}>Invoice Notes<textarea rows={2} value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>
              <button type="submit" disabled={isUpdating} style={{ ...submitButtonStyle, opacity: isUpdating ? 0.7 : 1 }}>
                {isUpdating ? 'Saving & Regenerating PDF...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingInvoice && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, width: 320, textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Delete Invoice?</h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              This invoice <strong>{deletingInvoice.id}</strong> and its generated PDF document will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingInvoice(null)}
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
                Delete Invoice
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
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const isSent = status === 'sent';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isPaid
      ? 'rgba(16, 185, 129, 0.12)'
      : isOverdue
      ? 'rgba(239, 68, 68, 0.12)'
      : isSent
      ? 'rgba(59, 130, 246, 0.12)'
      : 'rgba(100, 116, 139, 0.12)',
    color: isPaid ? '#10b981' : isOverdue ? '#ef4444' : isSent ? '#3b82f6' : '#64748b',
  };
}
