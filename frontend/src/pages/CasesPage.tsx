import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderOpen, FileText, FlaskConical, Scale, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

const CRIME_ICONS: Record<string, React.ReactNode> = {
  CYBERCRIME:  <FlaskConical size={18} color="#60a5fa" />,
  FRAUD:       <FileText size={18} color="#f59e0b" />,
  MURDER:      <Scale size={18} color="#f87171" />,
};

export const CasesPage: React.FC<Props> = ({ onSelectCase, onOpenNewCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      let url = '/cases?limit=50';
      if (statusFilter)         url += `&status=${statusFilter}`;
      if (classificationFilter) url += `&classification=${classificationFilter}`;
      const res = await api.get(url);
      if (res.data.success) setCases(res.data.data.items || []);
    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, [statusFilter, classificationFilter]);

  const filtered = cases.filter(c =>
    c.firNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.crimeType || '').toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 12px',
    fontSize: '12px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Case File Repository</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Search, filter, and inspect registered investigation files.
          </p>
        </div>
        <button
          onClick={onOpenNewCase}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 16px', borderRadius: '8px',
            background: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 16px rgba(59,130,246,0.25)', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          <Plus size={14} /> Register New Case
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by FIR, title, crime type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '32px', width: '100%' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
          <option value="UNDER_REVIEW">UNDER REVIEW</option>
          <option value="CHARGESHEET_PREPARED">CHARGESHEET PREPARED</option>
          <option value="COURT_SUBMITTED">COURT SUBMITTED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select value={classificationFilter} onChange={e => setClassificationFilter(e.target.value)} style={inputStyle}>
          <option value="">All Classifications</option>
          <option value="PUBLIC">PUBLIC</option>
          <option value="INTERNAL">INTERNAL</option>
          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
          <option value="HIGHLY_CONFIDENTIAL">HIGHLY CONFIDENTIAL</option>
        </select>
        {(search || statusFilter || classificationFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setClassificationFilter(''); }}
            style={{
              fontSize: '11px', fontWeight: 600, color: '#f87171',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : loadError ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
        }}>
          <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', marginBottom: '10px' }}>Could not load case files</div>
          <button
            onClick={fetchCases}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <FolderOpen size={40} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>No cases found</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Try adjusting your search or filter criteria.
          </div>
          {(search || statusFilter || classificationFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setClassificationFilter(''); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filtered.map((c, i) => {
            const isHighlyConf = c.classification === 'HIGHLY_CONFIDENTIAL';
            return (
              <div
                key={c.id}
                className={`animate-fade-in-up ${isHighlyConf ? 'animate-pulse-border-red' : ''}`}
                onClick={() => onSelectCase(c.id)}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isHighlyConf ? '#ef4444' : 'var(--border)'}`,
                  borderLeft: `4px solid ${isHighlyConf ? '#ef4444' : 'rgba(59,130,246,0.3)'}`,
                  borderRadius: '12px', padding: '18px',
                  cursor: 'pointer', transition: 'all 200ms',
                  animationDelay: `${i * 40}ms`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = isHighlyConf
                    ? '0 8px 24px rgba(239,68,68,0.15)' : '0 8px 24px rgba(59,130,246,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace' }}>
                    {c.firNumber}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <StatusBadge type="status" value={c.status} />
                    <StatusBadge type="classification" value={c.classification} />
                  </div>
                </div>

                {/* Title */}
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
                  {c.title}
                </div>

                {c.crimeType && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {c.crimeType}
                  </div>
                )}

                {/* Stats */}
                <div style={{
                  display: 'flex', gap: '12px',
                  paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)',
                }}>
                  <span>📄 {c.documentCount || 0} docs</span>
                  <span>🔬 {c.evidenceCount || 0} evidence</span>
                  {(c.pendingApprovals || 0) > 0 && (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ {c.pendingApprovals} pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
