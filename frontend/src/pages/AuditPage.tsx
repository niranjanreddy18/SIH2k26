import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Filter, Loader, Link2 } from 'lucide-react';
import api from '../services/api';
import { AuditEvent, AuditVerifyChainResult } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const AuditPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState<AuditVerifyChainResult | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('');

  // ADMIN sees the system-wide master log. Other roles see the audit trail for
  // their most recently active case — /admin/audit is ADMIN-only on the backend.
  const fetchAuditEvents = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      let res;
      if (user?.role === 'ADMIN') {
        const url = actionFilter ? `/admin/audit?action=${actionFilter}` : `/admin/audit`;
        res = await api.get(url);
      } else {
        const casesRes = await api.get('/cases?limit=1');
        const firstCase = casesRes.data.success ? casesRes.data.data.items?.[0] : null;
        if (firstCase) {
          const url = actionFilter
            ? `/cases/${firstCase.id}/audit?action=${actionFilter}`
            : `/cases/${firstCase.id}/audit`;
          res = await api.get(url);
        }
      }

      if (res && res.data.success) {
        setEvents(res.data.data.items || []);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      setLoadError(true);
      toast.error('Failed to load audit events: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await api.get('/audit/verify-chain');
      if (res.data.success) {
        setChainResult(res.data.data);
      }
    } catch (err: any) {
      toast.error('Chain verification failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setVerifyingChain(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [actionFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.06) 100%)',
        border: '1px solid var(--border)', borderRadius: '14px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#3b82f6" /> Tamper-Evident Audit Event Trail
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            End-to-end cryptographic hash chaining. Any database-level alteration breaks the hash chain sequence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', borderRadius: '8px',
              background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', border: 'none',
              boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
              opacity: verifyingChain ? 0.6 : 1,
            }}
          >
            <ShieldCheck size={14} className={verifyingChain ? 'animate-spin' : ''} />
            {verifyingChain ? 'Recomputing Hashes...' : 'Verify Full Hash Chain'}
          </button>

          <button
            onClick={fetchAuditEvents}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Hash Chain Verification Result Banner */}
      {chainResult && (
        <div
          className={`animate-fade-in ${chainResult.status === 'CHAIN_INTACT' ? 'animate-glow-green' : 'animate-glow-red animate-shake'}`}
          style={{
            padding: '18px 20px', borderRadius: '12px',
            background: chainResult.status === 'CHAIN_INTACT' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1.5px solid ${chainResult.status === 'CHAIN_INTACT' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.5)'}`,
            display: 'flex', alignItems: 'flex-start', gap: '14px',
          }}
        >
          {chainResult.status === 'CHAIN_INTACT' ? (
            <ShieldCheck size={28} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <ShieldAlert size={28} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px', animation: 'pulse 1s infinite' }} />
          )}
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em',
              color: chainResult.status === 'CHAIN_INTACT' ? '#10b981' : '#ef4444',
              textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              AUDIT LEDGER INTEGRITY: {chainResult.status}
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                ({chainResult.totalEvents} events verified sequentially)
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {chainResult.status === 'CHAIN_INTACT'
                ? 'All historical audit entries match their cryptographic parent hashes. No out-of-band DB tampering detected.'
                : `TAMPERING DETECTED! Hash chain broken at event ID ${chainResult.brokenAt}. Records after this point may be compromised.`}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
      }}>
        <Filter size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter by Action:</span>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 12px',
            fontSize: '12px', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <option value="">All Lifecycle Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="USER_LOGOUT">USER_LOGOUT</option>
          <option value="CASE_CREATED">CASE_CREATED</option>
          <option value="CASE_UPDATED">CASE_UPDATED</option>
          <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
          <option value="DOCUMENT_SUBMITTED">DOCUMENT_SUBMITTED</option>
          <option value="DOCUMENT_APPROVED">DOCUMENT_APPROVED</option>
          <option value="DOCUMENT_SIGNED">DOCUMENT_SIGNED</option>
          <option value="DOCUMENT_LOCKED">DOCUMENT_LOCKED</option>
          <option value="DOCUMENT_VERIFIED">DOCUMENT_VERIFIED</option>
          <option value="DOCUMENT_SHARED">DOCUMENT_SHARED</option>
          <option value="EVIDENCE_REGISTERED">EVIDENCE_REGISTERED</option>
          <option value="EVIDENCE_TRANSFERRED">EVIDENCE_TRANSFERRED</option>
        </select>
      </div>

      {/* Audit Table */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Loader size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading tamper-evident audit records...</span>
          </div>
        ) : loadError ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>Could not load audit events.</div>
            <button
              onClick={fetchAuditEvents}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            No audit events found matching the criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Timestamp (UTC)', 'Action', 'Officer / Actor', 'Target Type', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', fontSize: '10px', fontWeight: 700, textAlign: 'left',
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 100ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <div>{log.actor?.name || 'Officer'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {log.targetType || 'SYSTEM'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        color: log.result === 'SUCCESS' ? '#10b981' : '#ef4444',
                        background: log.result === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${log.result === 'SUCCESS' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: '9999px', padding: '2px 8px',
                      }}>
                        <CheckCircle2 size={10} /> {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
