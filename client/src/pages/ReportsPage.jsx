import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { getAuthState } from '../auth/auth-store.js';
import { Plus, X, Search, FileText, Download, TrendingUp, Calendar, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ReportsPage() {
  const navigate = useNavigate();
  const auth = getAuthState() || { role: 'Viewer', name: 'Unknown' };
  const canModify = auth.role === 'Admin' || auth.role === 'Manager' || auth.role === 'Employee';

  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Search & Pagination
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Generate Report Modal
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    type: 'weekly',
    title: '',
    summary: '',
    recommendationsString: '',
  });
  const [formError, setFormError] = React.useState('');

  // Selected Report Detail Modal
  const [selectedReport, setSelectedReport] = React.useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/reports');
      setReports(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch reports list');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  // Update default titles on form type changes
  React.useEffect(() => {
    const formattedDate = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (formData.type === 'weekly') {
      setFormData((prev) => ({
        ...prev,
        title: `Weekly Operations Report - Week of ${formattedDate}`,
        summary: 'Operational throughput report reflecting weekly customer status, open tickets, crm timelines, and billing collection summaries.',
        recommendationsString: 'Improve ticket SLA resolution times, Accelerate overdue collections, Audit pending agent queue',
      }));
    } else {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      const quarter = Math.floor(month / 3) + 1;
      setFormData((prev) => ({
        ...prev,
        title: `Executive Summary - Q${quarter} ${year}`,
        summary: 'High-level business health summary and revenue progress report detailing customer satisfaction, response times, and gross conversions.',
        recommendationsString: 'Enhance lead follow-up automation policies, Expand customer success coverage, Audit billing workflow schedules',
      }));
    }
  }, [formData.type, showAddModal]);

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Report Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch live metrics from dashboard endpoint
      const { data: dashData } = await api.get('/api/dashboard');
      const metrics = dashData.overview?.healthScoreFactors || {
        customerSatisfaction: 80,
        responseTime: 90,
        invoiceCollection: 85,
        ticketResolution: 75,
        leadConversion: 80
      };
      // Include gross health score
      metrics.healthScore = dashData.overview?.healthScore || 80;

      // 2. Parse recommendations
      const recommendations = formData.recommendationsString
        ? formData.recommendationsString.split(',').map(r => r.trim()).filter(Boolean)
        : [];

      // 3. Submit payload to generate route
      const payload = {
        type: formData.type === 'weekly' ? 'Weekly' : 'Executive',
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        metrics,
        recommendations,
      };

      await api.post('/api/reports/generate', payload);
      toast.success('Report and PDF generated successfully');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to generate report');
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = (report) => {
    if (!report.pdfUrl) {
      toast.error('Report PDF document is unassigned.');
      return;
    }
    const baseUrl = api.defaults.baseURL || 'http://localhost:4002';
    window.open(`${baseUrl}${report.pdfUrl}`, '_blank');
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const term = searchTerm.toLowerCase();
    return (
      (report.title || '').toLowerCase().includes(term) ||
      (report.type || '').toLowerCase().includes(term)
    );
  });

  // Sort: newest first
  const sortedReports = [...filteredReports].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0);
    const timeB = new Date(b.createdAt || 0);
    return timeB - timeA;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedReports.length / itemsPerPage);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 id="reports-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Reports</h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Generate analytical executive or weekly reports based on actual, live business health metrics.
          </p>
        </div>
        {canModify && (
          <button
            id="btn-generate-report"
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
            Generate Report
          </button>
        )}
      </div>

      {/* Main Single Card layout */}
      <div style={cardStyle}>
        {/* Search bar inside header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 16, marginBottom: 16 }}>
          <Search size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            id="search-reports"
            type="text"
            placeholder="Search reports by title, type..."
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
            No reports generated yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Report Title</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Generated By</th>
                  <th style={thStyle}>Generated Date</th>
                  <th style={thStyle}>PDF Document</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((report) => (
                  <tr key={report.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 650 }}>{report.title}</td>
                    <td style={tdStyle}>
                      <span style={typeBadgeStyle(report.type)}>
                        {report.type}
                      </span>
                    </td>
                    <td style={tdStyle}>User #{report.generatedBy || 'System'}</td>
                    <td style={tdStyle}>{new Date(report.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDownloadPdf(report)}
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
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedReport(report)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        Inspect details
                      </button>
                    </td>
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
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedReports.length)} of {sortedReports.length} reports
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

      {/* Generate Report Modal */}
      {showAddModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Generate Analytical Report</h3>
              <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            {formError && <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{formError}</p>}
            <form onSubmit={handleGenerateSubmit} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <label style={labelStyle}>
                Report Scope / Type
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={inputStyle}>
                  <option value="weekly">Weekly Operational Report</option>
                  <option value="executive">Executive Board Summary</option>
                </select>
              </label>

              <label style={labelStyle}>Report Title *<input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={inputStyle} /></label>

              <label style={labelStyle}>Executive Summary Text<textarea rows={3} required value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>

              <label style={labelStyle}>Recommendations (comma-separated)<textarea rows={2} placeholder="Add actionable steps..." value={formData.recommendationsString} onChange={(e) => setFormData({ ...formData, recommendationsString: e.target.value })} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} /></label>

              <button type="submit" disabled={isSubmitting} style={{ ...submitButtonStyle, opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Fetching Metrics & Compiling PDF...' : 'Generate & Write PDF'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Report Detail Modal */}
      {selectedReport && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContainerStyle, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-button-border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedReport.title}</h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Type: <strong>{selectedReport.type}</strong> | Generated Date: <strong>{new Date(selectedReport.createdAt || Date.now()).toLocaleString()}</strong>
                </span>
              </div>
              <button onClick={() => setSelectedReport(null)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Executive Summary
                </span>
                <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                  {selectedReport.summary || 'No summary text provided.'}
                </p>
              </div>

              {selectedReport.metrics && (
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Operational Metrics Table
                  </span>
                  <div style={{ display: 'grid', gap: 8, background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)', fontSize: 13 }}>
                    <div style={metricRowStyle}>
                      <span>Customer Satisfaction:</span>
                      <strong>{selectedReport.metrics.customerSatisfaction || 0}%</strong>
                    </div>
                    <div style={metricRowStyle}>
                      <span>Response Time Score:</span>
                      <strong>{selectedReport.metrics.responseTime || 0}%</strong>
                    </div>
                    <div style={metricRowStyle}>
                      <span>Invoice Collection Ratio:</span>
                      <strong>{selectedReport.metrics.invoiceCollection || 0}%</strong>
                    </div>
                    <div style={metricRowStyle}>
                      <span>Ticket Resolution Ratio:</span>
                      <strong>{selectedReport.metrics.ticketResolution || 0}%</strong>
                    </div>
                    <div style={metricRowStyle}>
                      <span>Lead Conversion Score:</span>
                      <strong>{selectedReport.metrics.leadConversion || 0}%</strong>
                    </div>
                    <div style={{ ...metricRowStyle, borderTop: '1px solid var(--color-button-border)', paddingTop: 6, marginTop: 2, fontSize: 14, color: '#10b981' }}>
                      <span>Gross Business Health Score:</span>
                      <strong>{selectedReport.metrics.healthScore || 0}%</strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  Actionable Recommendations
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--color-button-bg)', padding: 12, borderRadius: 10, border: '1px solid var(--color-button-border)' }}>
                  {(selectedReport.recommendations || []).length > 0 ? (
                    (selectedReport.recommendations || []).map((rec, idx) => (
                      <div key={idx} style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                        • {rec}
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No recommendations.</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-button-border)', paddingTop: 12 }}>
                <span>Generated by: <strong>User #{selectedReport.generatedBy || 'System'}</strong></span>
                <button
                  onClick={() => handleDownloadPdf(selectedReport)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Download size={14} /> Download PDF File
                </button>
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

const metricRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

function typeBadgeStyle(type) {
  const isWeekly = type === 'Weekly';
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 20,
    background: isWeekly ? 'rgba(59, 130, 246, 0.12)' : 'rgba(99, 102, 241, 0.12)',
    color: isWeekly ? '#3b82f6' : '#6366f1',
  };
}
