import React, { useState } from 'react';
import { X, Upload, FileText, Loader, CloudUpload } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DocumentUploadModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('WITNESS_STATEMENT');
  const [classification, setClassification] = useState('INTERNAL');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) return;
    if (!file) { toast.error('Please choose a file to upload.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', type);
      formData.append('classification', classification);
      formData.append('file', file);
      const res = await api.post(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const doc = res.data.data;
        const hash = doc.hash || doc.sha256Hash || '';
        toast.success(`Document uploaded${hash ? ` — SHA-256 ${hash.slice(0, 16)}…` : ''}`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.response?.data?.error?.message || err.message));
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
            <div style={{ padding: '7px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              <Upload size={16} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Upload Document</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Registers SHA-256 & blockchain anchor</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpload} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              Document Name *
            </label>
            <input type="text" required placeholder="e.g. Witness Statement – Informant Alpha" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Type *</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="FIR">FIR</option>
                <option value="COMPLAINT">COMPLAINT</option>
                <option value="WITNESS_STATEMENT">WITNESS STATEMENT</option>
                <option value="INVESTIGATION_REPORT">INVESTIGATION REPORT</option>
                <option value="FORENSIC_REPORT">FORENSIC REPORT</option>
                <option value="SEIZURE_MEMO">SEIZURE MEMO</option>
                <option value="CHARGE_SHEET">CHARGE SHEET</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Classification</label>
              <select value={classification} onChange={e => setClassification(e.target.value)} style={inputStyle}>
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="HIGHLY_CONFIDENTIAL">HIGHLY CONFIDENTIAL</option>
              </select>
            </div>
          </div>

          {/* Drag-and-drop zone */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              File *
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input-upload')?.click()}
              style={{
                border: `2px dashed ${dragging ? '#3b82f6' : file ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(59,130,246,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)',
                transition: 'all 200ms',
              }}
            >
              <input id="file-input-upload" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
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
                    Drag &amp; drop file here, or click
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Supported: PDF, DOCX, PNG, JPG · Max 50MB
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={uploading || !file} style={{
              flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: (uploading || !file) ? 'rgba(59,130,246,0.5)' : '#3b82f6', color: 'white',
              border: 'none', cursor: (uploading || !file) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: (uploading || !file) ? 'none' : '0 4px 16px rgba(59,130,246,0.25)',
            }}>
              {uploading ? <><Loader size={13} className="animate-spin" /> Uploading &amp; Hashing...</> : <><Upload size={13} /> Upload Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
