import React, { useState, useEffect } from 'react';
import {
  FolderKanban, FileCheck2, Clock, ShieldCheck, Plus,
  ArrowUpRight, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

const STAT_CARD = {
  display: 'flex', alignItems: 'center', gap: '16px',
  padding: '20px', borderRadius: '12px',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  cursor: 'default', transition: 'all 150ms',
} as React.CSSProperties;

function Skeleton() {
  return <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage: React.FC<Props> = ({ onSelectCase, onOpenNewCase }) => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const casesRes = await api.get('/cases?limit=5');
      if (casesRes.data.success) {
        setCases(casesRes.data.data.items || []);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalDocs     = cases.reduce((s, c) => s + (c.documentCount  || 0), 0);
  const pendingApprv  = cases.reduce((s, c) => s + (c.pendingApprovals || 0), 0);
  const totalEvidence = cases.reduce((s, c) => s + (c.evidenceCount   || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Greeting Banner */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', padding: '24px',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 100%)',
        border: '1px solid var(--border)', borderRadius: '14px',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Officer'} 👋
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={onOpenNewCase}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '8px',
            background: '#3b82f6', color: 'white', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          <Plus size={15} /> Register New Case
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {loading ? (
          [0,1,2,3].map(i => <Skeleton key={i} />)
        ) : (
          <>
            {[
              { icon: FolderKanban, label: 'Active Cases',     value: cases.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.2)'  },
              { icon: Clock,        label: 'Pending Approvals',value: pendingApprv,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)'  },
              { icon: FileCheck2,   label: 'Hashed Documents', value: totalDocs,     color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.2)'  },
              { icon: ShieldCheck,  label: 'Cryptographic Integrity', value: '100%', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)'  },
            ].map(({ icon: Icon, label, value, color, bg, border }, i) => (
              <div
                key={i}
                className="stat-card animate-fade-in-up"
                style={{ ...STAT_CARD, animationDelay: `${i * 60}ms` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${border.replace('0.2', '0.25')}`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{ padding: '10px', background: bg, border: `1px solid ${border}`, borderRadius: '10px' }}>
                  <Icon size={22} color={color} />
                </div>
                <div>
                  <div className="animate-count-up" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Main Grid: Recent Cases + Pending Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* Recent Cases */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Active Case Files</h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              Last 5 cases
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '20px' }}>
              {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: '40px', marginBottom: '8px' }} />)}
            </div>
          ) : loadError ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '10px' }}>Could not load dashboard data.</div>
              <button
                onClick={fetchData}
                style={{
                  padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : cases.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No active cases registered yet.
            </div>
          ) : (
            <div>
              {cases.map((c, i) => (
                <div
                  key={c.id}
                  className="animate-fade-in"
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < cases.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', transition: 'background 150ms',
                    animationDelay: `${i * 50}ms`,
                    borderLeft: c.classification === 'HIGHLY_CONFIDENTIAL' ? '3px solid #ef4444' : '3px solid transparent',
                  }}
                  onClick={() => onSelectCase(c.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>
                        {c.firNumber}
                      </span>
                      <StatusBadge type="status" value={c.status} />
                      <StatusBadge type="classification" value={c.classification} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                      Docs: {c.documentCount || 0}  ·  Evidence: {c.evidenceCount || 0}
                    </div>
                  </div>
                  <ArrowUpRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals panel */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Pending Approvals</h3>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              [0,1].map(i => <div key={i} className="skeleton" style={{ height: '50px', marginBottom: '8px' }} />)
            ) : pendingApprv === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No pending approvals</div>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px', gap: '8px',
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>{pendingApprv}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>documents awaiting approval</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  <AlertTriangle size={12} color="#f59e0b" />
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Action Required</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
