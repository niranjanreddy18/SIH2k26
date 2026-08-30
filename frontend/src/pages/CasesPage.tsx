import React, { useState, useEffect } from 'react';
import {
  Search, Plus, FolderOpen, FileText, AlertTriangle, Users, Briefcase,
  SlidersHorizontal, Archive, Hourglass, Calendar, ArrowRight, MoreVertical,
  LayoutGrid, List,
} from 'lucide-react';
import api from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

interface Props {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

function formatUpdated(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
}

const STATUS_LEGEND: { label: string; color: string; desc: string }[] = [
  { label: 'OPEN', color: '#2563eb', desc: 'Open Case' },
  { label: 'UNDER INVESTIGATION', color: '#d97706', desc: 'Active Investigation' },
  { label: 'CHARGESHEET PREPARED', color: '#6366f1', desc: 'Chargesheet Ready' },
  { label: 'COURT SUBMITTED', color: '#059669', desc: 'With Court' },
  { label: 'CLOSED', color: '#6b7280', desc: 'Case Closed' },
];

export const CasesPage: React.FC<Props> = ({ onSelectCase, onOpenNewCase }) => {
  const toast = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Split by relationship to the viewer, not just a flat list — "shared with
  // you" (assigned by someone else) reads very differently than "your case."
  const myCases = filtered.filter(c => c.isOwner);
  const sharedCases = filtered.filter(c => !c.isOwner && c.isAssigned);
  const otherCases = filtered.filter(c => !c.isOwner && !c.isAssigned);

  const Stat: React.FC<{ icon: React.ElementType; value: number; label: string; warn?: boolean }> = ({ icon: Icon, value, label, warn }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={15} style={{ color: warn && value > 0 ? 'var(--warning)' : 'var(--text-muted)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.1, color: warn && value > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
          {value}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{label}</div>
      </div>
    </div>
  );

  const renderCaseCard = (c: Case, i: number) => {
    const isHighlyConf = c.classification === 'HIGHLY_CONFIDENTIAL';
    const updated = formatUpdated(c.updatedAt || c.createdAt);
    return (
      <div
        key={c.id}
        className="animate-fade-in-up"
        onClick={() => onSelectCase(c.id)}
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${isHighlyConf ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
          borderLeft: `4px solid ${isHighlyConf ? 'var(--danger)' : 'var(--primary)'}`,
          borderRadius: '14px', padding: '20px',
          cursor: 'pointer', transition: 'transform 150ms, box-shadow 150ms',
          animationDelay: `${i * 40}ms`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = isHighlyConf
            ? '0 8px 24px rgba(220,38,38,0.15)' : '0 8px 24px rgba(37,99,235,0.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* Top row — FIR number, badges, overflow menu */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
            {c.firNumber}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatusBadge type="status" value={c.status} />
            <StatusBadge type="classification" value={c.classification} />
            <button
              onClick={e => { e.stopPropagation(); toast.info('More actions coming soon.'); }}
              title="More actions"
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px',
              }}
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
          {c.title}
        </div>

        {c.crimeType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <Users size={13} style={{ color: 'var(--text-muted)' }} />
            {c.crimeType}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '12px',
          paddingTop: '14px', paddingBottom: '14px', borderTop: '1px solid var(--border)',
        }}>
          <Stat icon={FileText} value={c.documentCount || 0} label="Documents" />
          <Stat icon={Archive} value={c.evidenceCount || 0} label="Evidence" />
          <Stat icon={Hourglass} value={c.pendingApprovals || 0} label="Pending" warn />
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '14px', borderTop: '1px solid var(--border)',
        }}>
          {updated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Calendar size={12} />
              Updated {updated}
            </div>
          ) : <span />}
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--primary-dim)', border: '1px solid rgba(37,99,235,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            flexShrink: 0,
          }}>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    );
  };

  const gridStyle: React.CSSProperties = viewMode === 'grid'
    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }
    : { display: 'flex', flexDirection: 'column', gap: '10px' };

  const SectionHeader: React.FC<{ icon: React.ReactNode; label: string; count: number; showViewToggle?: boolean }> = ({ icon, label, count, showViewToggle }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '2px 9px',
        }}>{count}</span>
      </div>
      {showViewToggle && (
        <div style={{
          display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '2px', gap: '2px',
        }}>
          {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={mode === 'grid' ? 'Grid view' : 'List view'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '26px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: viewMode === mode ? 'var(--primary)' : 'transparent',
                color: viewMode === mode ? 'white' : 'var(--text-muted)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: '10px', padding: '10px 14px',
    fontSize: '12px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: 'var(--primary-dim)', border: '1px solid rgba(37,99,235,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={20} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Case File Repository</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Search, filter, and inspect registered investigation files.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenNewCase}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '10px 18px', borderRadius: '10px',
            background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 16px rgba(37,99,235,0.25)', transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Plus size={14} /> Register New Case
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by FIR, title, crime type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, padding: '12px 14px 12px 38px', width: '100%', borderRadius: '12px' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <SlidersHorizontal size={13} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, padding: '12px 14px 12px 34px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="CHARGESHEET_PREPARED">CHARGESHEET PREPARED</option>
            <option value="COURT_SUBMITTED">COURT SUBMITTED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        <select
          value={classificationFilter}
          onChange={e => setClassificationFilter(e.target.value)}
          style={{ ...inputStyle, borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
        >
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
              fontSize: '11px', fontWeight: 700, color: 'var(--danger)',
              background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : loadError ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '14px',
        }}>
          <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', marginBottom: '10px' }}>Could not load case files</div>
          <button
            onClick={fetchCases}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: 'var(--danger)', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
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
                color: 'var(--primary)', background: 'var(--primary-dim)', border: '1px solid rgba(37,99,235,0.2)',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {myCases.length > 0 && (
            <div>
              <SectionHeader icon={<FolderOpen size={15} color="var(--primary)" />} label="My Cases" count={myCases.length} showViewToggle />
              <div style={gridStyle}>
                {myCases.map((c, i) => renderCaseCard(c, i))}
              </div>
            </div>
          )}

          {sharedCases.length > 0 && (
            <div>
              <SectionHeader icon={<Users size={15} color="#7c3aed" />} label="Shared With You" count={sharedCases.length} />
              <div style={gridStyle}>
                {sharedCases.map((c, i) => renderCaseCard(c, i))}
              </div>
            </div>
          )}

          {otherCases.length > 0 && (
            <div>
              <SectionHeader icon={<FolderOpen size={15} color="var(--text-muted)" />} label="Other Cases (Admin Access)" count={otherCases.length} />
              <div style={gridStyle}>
                {otherCases.map((c, i) => renderCaseCard(c, i))}
              </div>
            </div>
          )}

          {/* Status legend */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '9999px',
            padding: '12px 24px',
          }}>
            {STATUS_LEGEND.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{item.label}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
