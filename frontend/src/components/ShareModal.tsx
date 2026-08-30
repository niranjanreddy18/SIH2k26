import React, { useState, useEffect } from 'react';
import { X, Share2, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ShareModal: React.FC<Props> = ({ documentId, documentName, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [officers, setOfficers] = useState<User[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [recipientId, setRecipientId] = useState('');
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(3);
  const [sharing, setSharing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const res = await api.get('/users');
        if (res.data.success) {
          const list: User[] = (res.data.data || []).filter((u: User) => u.id !== currentUser?.id);
          setOfficers(list);
          if (list.length > 0) setRecipientId(list[0].id);
        }
      } catch (err: any) {
        toast.error('Failed to load officer directory: ' + (err.response?.data?.error?.message || err.message));
      } finally {
        setLoadingOfficers(false);
      }
    };
    fetchOfficers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) return;
    setSharing(true);
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + Number(expiresInDays));
    try {
      const res = await api.post(`/documents/${documentId}/share`, {
        recipientId, canView, canDownload,
        expiresAt: expiresDate.toISOString(),
      });
      if (res.data.success) {
        toast.success('Document shared.');
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      toast.error('Sharing failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSharing(false);
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
        borderRadius: '16px', width: '100%', maxWidth: '460px',
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
              <Share2 size={16} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Share Document</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{documentName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleShare} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Recipient */}
          <div>
            <label style={labelStyle}>Recipient Officer *</label>
            <select
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              style={inputStyle}
              disabled={loadingOfficers || officers.length === 0}
            >
              {loadingOfficers && <option>Loading officer directory...</option>}
              {!loadingOfficers && officers.length === 0 && <option>No other officers available</option>}
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.role.replace('_', ' ')}{o.department ? ` (${o.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Permissions */}
          <div>
            <label style={labelStyle}>Permissions</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { label: 'Can View', checked: canView, onChange: setCanView },
                { label: 'Can Download', checked: canDownload, onChange: setCanDownload },
              ].map(({ label, checked, onChange }) => (
                <label key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
                }}>
                  <div
                    onClick={() => onChange(!checked)}
                    style={{
                      width: '16px', height: '16px', borderRadius: '4px',
                      background: checked ? '#3b82f6' : 'var(--bg-elevated)',
                      border: `1px solid ${checked ? '#3b82f6' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 150ms', flexShrink: 0,
                    }}
                  >
                    {checked && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '2px' }} />}
                  </div>
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label style={labelStyle}>Access Expiration Period</label>
            <select value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))} style={inputStyle}>
              <option value={1}>1 Day (24 Hours)</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (1 Week)</option>
              <option value={30}>30 Days</option>
            </select>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={sharing} style={{
              flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: sharing ? 'rgba(59,130,246,0.5)' : '#3b82f6', color: 'white',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: sharing ? 'none' : '0 4px 16px rgba(59,130,246,0.25)',
            }}>
              {sharing ? <><Loader size={13} className="animate-spin" /> Granting Access...</> : <><Share2 size={13} /> Share Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
