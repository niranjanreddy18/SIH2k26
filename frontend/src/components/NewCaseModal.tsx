import React, { useState } from 'react';
import { X, Plus, FolderKanban, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewCaseModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [firNumber, setFirNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [crimeType, setCrimeType] = useState('Cyber Crime & Fraud');
  const [classification, setClassification] = useState('INTERNAL');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firNumber || !title) return;
    setSubmitting(true);
    try {
      const res = await api.post('/cases', { firNumber, title, description, crimeType, classification });
      if (res.data.success) { toast.success('Case file registered.'); onSuccess(); onClose(); }
    } catch (err: any) {
      toast.error('Failed to create case: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: '8px', padding: '9px 12px',
    fontSize: '12px', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '520px',
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
              <FolderKanban size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Register New Case File</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>FIR Number *</label>
            <input type="text" required placeholder="e.g. FIR-2026-9042" value={firNumber} onChange={e => setFirNumber(e.target.value)} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
          </div>

          <div>
            <label style={labelStyle}>Case Title *</label>
            <input type="text" required placeholder="e.g. Financial Fraud & Cyber Heist" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Crime Type</label>
              <input type="text" value={crimeType} onChange={e => setCrimeType(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Classification Tier</label>
              <select value={classification} onChange={e => setClassification(e.target.value)} style={inputStyle}>
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="HIGHLY_CONFIDENTIAL">HIGHLY CONFIDENTIAL</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Case Summary / Description</label>
            <textarea
              rows={3}
              placeholder="Enter brief details regarding FIR allegations, station, and scope..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{
              flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: submitting ? 'rgba(59,130,246,0.5)' : '#3b82f6', color: 'white',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.25)',
            }}>
              {submitting ? <><Loader size={13} className="animate-spin" /> Creating...</> : <><Plus size={13} /> Register Case File</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
