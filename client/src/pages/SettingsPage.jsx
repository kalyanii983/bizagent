import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Search, Brain, Settings, Database, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('runtime'); // 'runtime' or 'memory'

  // Config parameters
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4002';
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4002';

  // Memory Search State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [memoryItems, setMemoryItems] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [customers, setCustomers] = React.useState([]);

  async function loadCustomers() {
    try {
      const { data } = await api.get('/api/customers');
      setCustomers(data.items || []);
    } catch (err) {
      console.error('Failed to fetch customers list:', err);
    }
  }

  React.useEffect(() => {
    loadCustomers();
    // Default search on load to display some memory items
    handleSearch('');
  }, []);

  const handleSearch = async (queryVal) => {
    setSearching(true);
    try {
      const { data } = await api.get(`/api/memory/search?q=${encodeURIComponent(queryVal)}`);
      setMemoryItems(data.items || []);
    } catch (err) {
      toast.error('Failed to retrieve memory items');
    } finally {
      setSearching(false);
    }
  };

  const getCustomerName = (custId) => {
    if (!custId) return 'Global Context';
    const c = customers.find((item) => item.id === custId);
    return c ? c.name : 'Unknown Customer';
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 id="settings-page-title" style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>Platform Settings</h1>
        <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 15 }}>
          Inspect startup configurations and search long-term agent memories.
        </p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--color-button-border)', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('runtime')}
          style={{
            ...tabButtonStyle,
            borderBottom: activeTab === 'runtime' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'runtime' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
          }}
        >
          <Settings size={16} />
          Runtime Config
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          style={{
            ...tabButtonStyle,
            borderBottom: activeTab === 'memory' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'memory' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
          }}
        >
          <Brain size={16} />
          Long-term Memory Search
        </button>
      </div>

      {/* Runtime Settings Tab */}
      {activeTab === 'runtime' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} style={{ color: '#2563eb' }} />
            Startup Variables (Read-Only)
          </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={readOnlyFieldStyle}>
              <span style={readOnlyLabelStyle}>VITE_API_URL</span>
              <div style={readOnlyInputStyle}>{apiUrl}</div>
              <p style={helpTextStyle}>The address of the REST endpoints used by Axios requests.</p>
            </div>
            <div style={readOnlyFieldStyle}>
              <span style={readOnlyLabelStyle}>VITE_SOCKET_URL</span>
              <div style={readOnlyInputStyle}>{socketUrl}</div>
              <p style={helpTextStyle}>The Socket.IO backend event port configuration.</p>
            </div>
            <div style={readOnlyFieldStyle}>
              <span style={readOnlyLabelStyle}>Environment Status</span>
              <div style={{ ...readOnlyInputStyle, color: '#10b981', fontWeight: 700 }}>DEVELOPMENT FALLBACK</div>
              <p style={helpTextStyle}>The in-memory repository stack runs automatically when database assets are unconfigured.</p>
            </div>
          </div>
        </div>
      )}

      {/* Memory Search Tab */}
      {activeTab === 'memory' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Search Inputs */}
          <div style={cardStyle}>
            <form onSubmit={onSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Brain size={20} style={{ color: '#8b5cf6' }} />
              <input
                id="search-memory"
                type="text"
                placeholder="Search memory (customer, intent, activity, key details, etc.)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--color-button-border)',
                  background: 'var(--color-card-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={searching}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {searching ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                Search
              </button>
            </form>
          </div>

          {/* Results grid */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: '#8b5cf6' }} />
              Retrieved Memory Records ({memoryItems.length})
            </h3>

            {memoryItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No facts or records match the search parameters.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {memoryItems.map((item) => (
                  <div key={item.id} style={memoryCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={scopeBadgeStyle(item.scope)}>
                          {item.scope || 'Agent'}
                        </span>
                        <strong style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
                          Key: {item.key}
                        </strong>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Historical'}
                      </span>
                    </div>

                    <p style={{ margin: '10px 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {item.value}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {(item.tags || []).map((tag, tIdx) => (
                        <span key={tIdx} style={tagStyle}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-button-border)', paddingTop: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <span>Source: <strong>{item.source || 'Agent Inference'}</strong></span>
                      {item.customerId ? (
                        <span
                          onClick={() => navigate(`/customers/${item.customerId}`)}
                          style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Customer: {getCustomerName(item.customerId)}
                        </span>
                      ) : (
                        <span>Context: Global</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

const tabButtonStyle = {
  background: 'none',
  border: 'none',
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  outline: 'none',
  transition: 'border-bottom 0.2s',
};

const readOnlyFieldStyle = {
  display: 'grid',
  gap: 6
};

const readOnlyLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-text-secondary)'
};

const readOnlyInputStyle = {
  padding: 12,
  borderRadius: 10,
  background: 'var(--color-button-bg)',
  border: '1px solid var(--color-button-border)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  fontFamily: 'monospace',
  wordBreak: 'break-all'
};

const helpTextStyle = {
  margin: 0,
  fontSize: 12,
  color: 'var(--color-text-secondary)'
};

const labelStyle = { display: 'grid', gap: 6, fontSize: 14 };
const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid var(--color-button-border)',
  background: 'var(--color-card-bg)',
  color: 'var(--color-text-primary)'
};

const memoryCardStyle = {
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid var(--color-button-border)',
  borderRadius: 16,
  padding: 16,
};

function scopeBadgeStyle(scope) {
  const isCust = scope === 'customer';
  return {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 6,
    background: isCust ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
    color: isCust ? '#3b82f6' : '#8b5cf6',
  };
}

const tagStyle = {
  fontSize: 11,
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
};
