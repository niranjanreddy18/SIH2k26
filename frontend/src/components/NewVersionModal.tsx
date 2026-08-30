import React, { useState } from 'react';
import { X, Layers, FileText, CheckCircle2, Loader, CloudUpload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  documentId: string;
  documentName: string;
  currentVersionNo?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewVersionModal: React.FC<Props> = ({ documentId, documentName, currentVersionNo, onClose, onSuccess }) => {
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ hash: string; versionNo: number } | null>(null);
  const toast = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('comment', comment);
      if (file) formData.append('file', file);
      const res = await api.post(`/documents/${documentId}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setResult({ hash: res.data.data.hash, versionNo: res.data.data.versionNo });
        toast.success(`Version ${res.data.data.versionNo} created.`);
      }
    } catch (err: any) {
      toast.error('New version failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: '8px', padding: '9px 12px',
    fontSize: '12px', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '500px',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '7px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px' }}>
              <Layers size={16} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>New Version</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {documentName}{currentVersionNo ? ` · currently v${currentVersionNo}` : ''}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {result ? (
          /* Success State */
          <div className="animate-fade-in-up" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div className="animate-glow-green" style={{
              display: 'inline-flex', padding: '16px',
              background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)',
              borderRadius: '50%', marginBottom: '16px',
            }}>
              <CheckCircle2 size={32} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
              Version {result.versionNo} Created
            </h3>
            <div style={{
              marginTop: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '14px', textAlign: 'left',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>SHA-256:</div>
              <div style={{ fontSize: '11px', color: '#10b981', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {result.hash}
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
              New version starts fresh at DRAFT — it will need to go through the review workflow again.
            </p>
            <button
              onClick={() => { onSuccess(); onClose(); }}
              style={{
                width: '100%', marginTop: '16px', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer',
              }}
            >Done</button>
          </div>
        ) : (
          <form onSubmit={handleUpload} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                What changed? *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Corrected witness address, added missing signature page..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input-newversion')?.click()}
              style={{
                border: `2px dashed ${dragging ? '#a78bfa' : file ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(139,92,246,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)',
                transition: 'all 200ms',
              }}
            >
              <input id="file-input-newversion" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <>
                  <FileText size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>{file.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <CloudUpload size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Drag &amp; drop the revised file here, or click
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Max 50MB
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
              }}>Cancel</button>
              <button type="submit" disabled={uploading} style={{
                flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: uploading ? 'rgba(139,92,246,0.5)' : '#8b5cf6', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                boxShadow: uploading ? 'none' : '0 4px 16px rgba(139,92,246,0.25)',
              }}>
                {uploading ? <><Loader size={13} className="animate-spin" /> Creating Version...</> : <><Layers size={13} /> Create New Version</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
