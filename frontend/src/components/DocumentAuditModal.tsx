import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, Loader, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';
import { AuditEvent } from '../types';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_UPLOADED:  '#3b82f6',
  DOCUMENT_SUBMITTED: '#f59e0b',
  DOCUMENT_APPROVED:  '#10b981',
  DOCUMENT_REJECTED:  '#ef4444',
  DOCUMENT_SIGNED:    '#60a5fa',
  DOCUMENT_LOCKED:    '#a78bfa',
  DOCUMENT_VERIFIED:  '#34d399',
  DOCUMENT_SHARED:    '#818cf8',
  default:            '#6b7280',
};

export const DocumentAuditModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchAudit = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.get(`/documents/${documentId}/audit`)
      .then(res => {
        if (res.data.success) setEvents(res.data.data.items || []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '720px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              <ShieldCheck size={16} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Document Audit Trail
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                {documentName}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Loader size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading audit events for this document...</div>
            </div>
          ) : loadError ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>Could not load audit events.</div>
              <button
                onClick={fetchAudit}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              <ShieldCheck size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              No audit events recorded for this document yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0 }}>
                    {['Timestamp', 'Action', 'Officer / Actor', 'Result'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', fontSize: '10px', fontWeight: 700, textAlign: 'left',
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => {
                    const color = ACTION_COLORS[ev.action] || ACTION_COLORS.default;
                    return (
                      <tr
                        key={ev.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 100ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 16px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(ev.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                            color, background: `${color}15`, border: `1px solid ${color}30`,
                            borderRadius: '9999px', padding: '3px 9px',
                          }}>{ev.action}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {ev.actor?.name || 'System'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                            color: ev.result === 'SUCCESS' ? 'var(--success)' : 'var(--danger)',
                            background: ev.result === 'SUCCESS' ? 'var(--success-bg)' : 'var(--danger-bg)',
                            border: `1px solid ${ev.result === 'SUCCESS' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            borderRadius: '9999px', padding: '2px 8px',
                          }}>
                            {ev.result === 'SUCCESS' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {ev.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};
