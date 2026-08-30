import React, { useState, useEffect } from 'react';
import { X, Loader, AlertTriangle, RefreshCw, FileQuestion, Download } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  documentId: string;
  documentName: string;
  mimeType?: string;
  onClose: () => void;
}

const isTextMime = (mimeType?: string) =>
  !!mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json');

const isPreviewable = (mimeType?: string) =>
  !!mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf' || isTextMime(mimeType));

// A file this large would be unpleasant to dump into a <pre> block — treat as download-only.
const MAX_TEXT_PREVIEW_BYTES = 512 * 1024;

export const PreviewModal: React.FC<Props> = ({ documentId, documentName, mimeType, onClose }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textTruncated, setTextTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const previewable = isPreviewable(mimeType);
  const isText = isTextMime(mimeType);

  const fetchPreview = () => {
    if (!previewable) { setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    api.get(`/documents/${documentId}/preview`, { responseType: 'blob' })
      .then(async res => {
        if (isText) {
          const truncated = res.data.size > MAX_TEXT_PREVIEW_BYTES;
          const slice = truncated ? res.data.slice(0, MAX_TEXT_PREVIEW_BYTES) : res.data;
          setTextContent(await slice.text());
          setTextTruncated(truncated);
        } else {
          setObjectUrl(URL.createObjectURL(res.data));
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPreview();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/documents/${documentId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', documentName || 'document');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err: any) {
      toast.error('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '860px',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Document Preview</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
              {documentName}{mimeType ? ` · ${mimeType}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflow: 'auto', display: 'flex', alignItems: isText ? 'stretch' : 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.25)', minHeight: '300px',
          padding: (previewable && (objectUrl || textContent !== null)) ? (isText ? '20px' : 0) : '32px',
        }}>
          {!previewable ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              <FileQuestion size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              Preview isn't available for this file type{mimeType ? ` (${mimeType})` : ''}.<br />
              Download it to view the full content.
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center' }}>
              <Loader size={24} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading preview...</div>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center' }}>
              <AlertTriangle size={24} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>Could not load preview.</div>
              <button
                onClick={fetchPreview}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : textContent !== null ? (
            <div style={{ width: '100%' }}>
              {textTruncated && (
                <div style={{
                  fontSize: '11px', color: 'var(--warning)', background: 'var(--warning-bg)',
                  border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px',
                }}>
                  File is large — showing the first {(MAX_TEXT_PREVIEW_BYTES / 1024).toFixed(0)} KB. Download for the full content.
                </div>
              )}
              <pre style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.6,
                color: 'var(--text-primary)', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: '8px', padding: '16px',
              }}>{textContent || '(empty file)'}</pre>
            </div>
          ) : objectUrl && mimeType?.startsWith('image/') ? (
            <img src={objectUrl} alt={documentName} style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
          ) : objectUrl && mimeType === 'application/pdf' ? (
            <iframe src={objectUrl} title={documentName} style={{ width: '100%', height: '75vh', border: 'none' }} />
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', cursor: 'pointer',
              opacity: downloading ? 0.5 : 1,
            }}
          >
            {downloading ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? 'Downloading...' : 'Download'}
          </button>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};
