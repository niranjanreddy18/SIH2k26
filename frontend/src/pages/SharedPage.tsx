import React, { useState, useEffect } from 'react';
import { Share2, FileText, Download, Clock, AlertCircle, RefreshCw, Loader, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { ShareItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Props {
  onSelectCase?: (caseId: string) => void;
}

function getShareState(share: ShareItem): 'active' | 'expiring' | 'expired' {
  if (!share.expiresAt) return 'active';
  const expiresMs = new Date(share.expiresAt).getTime();
  const now = Date.now();
  if (now > expiresMs) return 'expired';
  if (expiresMs - now < 24 * 60 * 60 * 1000) return 'expiring';
  return 'active';
}

const STATE_BADGE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  label: 'Active' },
  expiring: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'Expires soon' },
  expired:  { color: '#6b7280', bg: 'rgba(75,85,99,0.12)',    border: 'rgba(75,85,99,0.3)',    label: 'Access expired' },
};

export const SharedPage: React.FC<Props> = () => {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const fetchSharedDocs = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/documents/shared-with-me');
      if (res.data.success) setShares(res.data.data.items || []);
    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSharedDocs(); }, []);

  const handleDownload = async (docId: string, docName: string) => {
    setDownloadingId(docId);
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', docName || 'document.pdf');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err: any) {
      toast.error('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRevoke = async (shareId: string) => {
    const ok = await confirm({ message: 'Revoke this document access grant?', confirmLabel: 'Revoke', danger: true });
    if (!ok) return;
    try {
      await api.post(`/shares/${shareId}/revoke`);
      toast.success('Access revoked.');
      await fetchSharedDocs();
    } catch (err: any) {
      toast.error('Revocation failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Documents Shared With Me</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Time-bounded access grants from other officers in the system.
          </p>
        </div>
        <button
          onClick={fetchSharedDocs}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />)}
        </div>
      ) : loadError ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
        }}>
          <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Could not load shared documents</div>
          <button
            onClick={fetchSharedDocs}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px',
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : shares.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <Share2 size={36} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No shared documents</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Documents shared with you by other officers will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {shares.map((share, i) => {
            const state = getShareState(share);
            const badge = STATE_BADGE[state];
            const isExpired = state === 'expired';
            const isExpiring = state === 'expiring';
            const docId = share.document?.id;
            const docName = share.document?.name || 'Document';

            return (
              <div
                key={share.shareId}
                className="animate-fade-in-up"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isExpiring ? 'rgba(245,158,11,0.3)' : isExpired ? 'rgba(255,255,255,0.05)' : 'var(--border)'}`,
                  borderRadius: '12px', padding: '18px 20px',
                  opacity: isExpired ? 0.6 : 1,
                  animationDelay: `${i * 50}ms`,
                  transition: 'border-color 200ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Doc name + state badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <FileText size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {docName}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`,
                        borderRadius: '9999px', padding: '2px 8px',
                      }}>
                        {badge.label}
                      </span>
                      {isExpiring && <AlertCircle size={13} color="#f59e0b" />}
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>
                        Permissions: <strong style={{ color: 'var(--text-secondary)' }}>
                          {[share.canView && 'View', share.canDownload && 'Download'].filter(Boolean).join(' + ')}
                        </strong>
                      </span>
                      {share.expiresAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isExpiring ? '#f59e0b' : 'var(--text-muted)' }}>
                          <Clock size={11} />
                          Expires: {new Date(share.expiresAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      {share.case?.firNumber && (
                        <span>Case: <strong style={{ color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace' }}>{share.case.firNumber}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isExpired && docId && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {(share.canView || share.canDownload) && (
                        <button
                          onClick={() => handleDownload(docId, docName)}
                          disabled={downloadingId === docId}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px',
                            borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa',
                            opacity: downloadingId === docId ? 0.5 : 1,
                          }}
                        >
                          {downloadingId === docId
                            ? <Loader size={11} className="animate-spin" />
                            : <Download size={11} />
                          }
                          {share.canDownload ? 'Download' : 'View'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRevoke(share.shareId)}
                        style={{
                          padding: '7px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                        }}
                      >
                        Revoke
                      </button>
                    </div>
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
