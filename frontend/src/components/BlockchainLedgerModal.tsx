import React, { useState, useEffect, useCallback } from 'react';
import { X, Link2, RefreshCw, CheckCircle2, Copy, Loader, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { BlockchainRecord } from '../types';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_CREATED:   '#3b82f6',
  DOCUMENT_SUBMITTED: '#f59e0b',
  DOCUMENT_APPROVED:  '#10b981',
  DOCUMENT_SIGNED:    '#60a5fa',
  DOCUMENT_LOCKED:    '#a78bfa',
  DOCUMENT_REJECTED:  '#ef4444',
  default:            '#6b7280',
};

export const BlockchainLedgerModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [networkSource, setNetworkSource] = useState<string>('HYPERLEDGER_FABRIC');
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.get(`/blockchain/records/${documentId}`)
      .then(res => {
        if (res.data.success) {
          setRecords(res.data.data.records || []);
          setNetworkSource(res.data.data.source || 'HYPERLEDGER_FABRIC');
          setNetworkInfo(res.data.data.network || null);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isFabric = networkSource === 'HYPERLEDGER_FABRIC' || networkInfo?.connected;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '700px',
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
            <div style={{ padding: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px' }}>
              <Link2 size={16} color="#818cf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Permissioned Blockchain Ledger
                </h3>
                <span style={{
                  fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  color: isFabric ? '#10b981' : '#f59e0b',
                  background: isFabric ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  border: `1px solid ${isFabric ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: '9999px', padding: '2px 8px',
                }}>
                  {isFabric ? 'Hyperledger Fabric 2.5' : 'PostgreSQL Crypto Chain'}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                {documentName}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loader size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading cryptographic ledger blocks...</div>
            </div>
          ) : loadError ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px',
            }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>Could not load blockchain records.</div>
              <button
                onClick={fetchRecords}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : records.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px',
              color: 'var(--text-muted)', fontSize: '12px',
            }}>
              <Link2 size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              No blockchain records anchored yet. Submit, approve, or sign this document to create immutable ledger entries.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Chain connector line */}
              {records.length > 1 && (
                <div style={{
                  position: 'absolute', left: '24px', top: '40px', bottom: '40px', width: '2px',
                  background: 'linear-gradient(180deg, #3b82f6, #a78bfa, #10b981)', borderRadius: '1px',
                }} />
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {records.map((r, idx) => {
                  const actionColor = ACTION_COLORS[r.action] || ACTION_COLORS.default;
                  return (
                    <div key={r.id} className="animate-fade-in-up" style={{ display: 'flex', gap: '16px', animationDelay: `${idx * 60}ms` }}>
                      {/* Node dot */}
                      <div style={{
                        flexShrink: 0, width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                          background: actionColor, border: '3px solid var(--bg-surface)',
                          boxShadow: `0 0 10px ${actionColor}66`, marginTop: '14px',
                          zIndex: 1, position: 'relative',
                        }} />
                      </div>

                      {/* Block card */}
                      <div style={{
                        flex: 1, background: 'var(--bg-elevated)', border: `1px solid ${actionColor}22`,
                        borderLeft: `3px solid ${actionColor}`,
                        borderRadius: '10px', padding: '14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700,
                            color: actionColor, background: `${actionColor}15`, border: `1px solid ${actionColor}30`,
                            borderRadius: '9999px', padding: '3px 9px',
                          }}>
                            <CheckCircle2 size={10} />
                            {r.txReference}
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)',
                            borderRadius: '9999px', padding: '3px 9px',
                          }}>{r.action}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>v{r.versionNo || 1}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                            {new Date(r.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {[
                          { label: 'Block Hash (SHA-256)', value: r.hash, color: '#10b981', key: `${r.id}-hash` },
                          { label: 'Previous Block Hash', value: r.prevHash, color: 'var(--text-secondary)', key: `${r.id}-prev` },
                        ].map(({ label, value, color, key }) => (
                          <div key={key} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}:</span>
                              <button
                                onClick={() => copy(value, key)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px',
                                  color: copiedId === key ? '#10b981' : '#60a5fa', background: 'transparent',
                                  border: 'none', cursor: 'pointer', fontWeight: 700,
                                }}
                              >
                                <Copy size={10} /> {copiedId === key ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div style={{
                              padding: '6px 10px', background: 'rgba(0,0,0,0.25)',
                              borderRadius: '6px', fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '10px', color, wordBreak: 'break-all',
                              border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
