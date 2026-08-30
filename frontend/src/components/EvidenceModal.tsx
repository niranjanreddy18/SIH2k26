import React, { useState } from 'react';
import { X, Box, ShieldCheck, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EvidenceModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/cases/${caseId}/evidence`, {
        type, description, collectedAt: new Date().toISOString()
      });
      if (res.data.success) { toast.success('Evidence registered.'); onSuccess(); onClose(); }
    } catch (err: any) {
      toast.error('Failed to register evidence: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSubmitting(false);
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
        borderRadius: '16px', width: '100%', maxWidth: '480px',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '7px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px' }}>
              <Box size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Register Physical/Digital Evidence</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleRegister} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              Evidence Type / Item Name *
            </label>
            <input type="text" required placeholder="e.g. Encrypted SSD 1TB (Serial #SSD-99482)" value={type} onChange={e => setType(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              Collection Details & Serial Specs
            </label>
            <textarea
              rows={3}
              placeholder="Record exact scene location, seals, and forensic details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{
              flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: submitting ? 'rgba(16,185,129,0.5)' : '#10b981', color: 'white',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(16,185,129,0.25)',
            }}>
              {submitting ? <><Loader size={13} className="animate-spin" /> Registering...</> : <><ShieldCheck size={13} /> Register Evidence</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
