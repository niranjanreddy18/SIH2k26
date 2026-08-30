import React, { useState, useEffect, useCallback } from 'react';
import { X, History, Loader, AlertTriangle, RefreshCw, Copy, Check, Eye, Download } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Document, VersionStatus } from '../types';
import { PreviewModal } from './PreviewModal';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<VersionStatus, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#f59e0b',
  UNDER_REVIEW: '#6366f1',
  REJECTED: '#ef4444',
  APPROVED: '#10b981',
  SIGNED: '#3b82f6',
  LOCKED: '#8b5cf6',
  ARCHIVED: '#4b5563',
};

export const VersionHistoryModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<{ versionNo: number; mimeType?: string } | null>(null);
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);
  const toast = useToast();

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.get(`/documents/${documentId}`)
      .then(res => { if (res.data.success) setDoc(res.data.data); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (versionNo: number) => {
    setDownloadingVersion(versionNo);
    try {
      const res = await api.get(`/documents/${documentId}/versions/${versionNo}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${documentName} (v${versionNo})`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err: any) {
      toast.error('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingVersion(null);
    }
  };

  const versions = [...(doc?.versionHistory || [])].sort((a, b) => b.versionNo - a.versionNo);
  const currentVersionNo = doc?.currentVersion?.versionNo;

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
            <div style={{ padding: '8px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px' }}>
              <History size={16} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Version History</div>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loader size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading version history...</div>
            </div>
          ) : loadError ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>Could not load version history.</div>
              <button
                onClick={fetchHistory}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No versions recorded for this document.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {versions.length > 1 && (
                <div style={{
                  position: 'absolute', left: '19px', top: '20px', bottom: '20px', width: '2px',
                  background: 'linear-gradient(180deg, #a78bfa, #3b82f6)', borderRadius: '1px',
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {versions.map((v, idx) => {
                  const isCurrent = v.versionNo === currentVersionNo;
                  const color = STATUS_COLORS[v.status] || '#6b7280';
                  const createdByName = typeof v.createdBy === 'object' ? v.createdBy?.name : v.createdBy;
                  return (
                    <div key={v.id || idx} className="animate-fade-in-up" style={{ display: 'flex', gap: '14px', animationDelay: `${idx * 50}ms` }}>
                      <div style={{ flexShrink: 0, width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%', marginTop: '14px',
                          background: color, border: '3px solid var(--bg-surface)',
                          boxShadow: `0 0 8px ${color}66`, zIndex: 1, position: 'relative',
                        }} />
                      </div>
                      <div style={{
                        flex: 1, background: 'var(--bg-elevated)',
                        border: `1px solid ${isCurrent ? color + '55' : 'var(--border)'}`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: '10px', padding: '14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                            v{v.versionNo}
                          </span>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                            color, background: `${color}20`, border: `1px solid ${color}40`,
                            borderRadius: '9999px', padding: '2px 8px',
                          }}>{v.status}</span>
                          {isCurrent && (
                            <span style={{
                              fontSize: '9px', fontWeight: 700, color: '#10b981',
                              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                              borderRadius: '9999px', padding: '2px 8px',
                            }}>CURRENT</span>
                          )}
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                            {new Date(v.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          {createdByName && <>Uploaded by <strong style={{ color: 'var(--text-primary)' }}>{createdByName}</strong></>}
                          {v.fileSize != null && <> · {(v.fileSize / 1024).toFixed(1)} KB</>}
                          {v.mimeType && <> · {v.mimeType}</>}
                        </div>

                        {v.comment && (
                          <div style={{
                            fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px',
                            padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px',
                          }}>
                            {v.comment}
                          </div>
                        )}

                        {v.hash && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                            <span style={{
                              flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#34d399',
                              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '6px', padding: '5px 8px', wordBreak: 'break-all',
                            }}>{v.hash}</span>
                            <button
                              onClick={() => copyHash(v.hash)}
                              style={{
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: copiedHash === v.hash ? '#10b981' : 'var(--text-muted)', fontSize: '10px',
                              }}
                            >
                              {copiedHash === v.hash ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setPreviewVersion({ versionNo: v.versionNo, mimeType: v.mimeType })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px',
                              borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa',
                            }}
                          >
                            <Eye size={11} /> View
                          </button>
                          <button
                            onClick={() => handleDownload(v.versionNo)}
                            disabled={downloadingVersion === v.versionNo}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px',
                              borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                              background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                              opacity: downloadingVersion === v.versionNo ? 0.5 : 1,
                            }}
                          >
                            {downloadingVersion === v.versionNo ? <Loader size={11} className="animate-spin" /> : <Download size={11} />}
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {previewVersion && (
        <PreviewModal
          documentId={documentId}
          documentName={documentName}
          mimeType={previewVersion.mimeType}
          versionNo={previewVersion.versionNo}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </div>
  );
};
