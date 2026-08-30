import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { User, CaseAssignment } from '../types';

interface Props {
  caseId: string;
  currentTeam: CaseAssignment[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddOfficerModal: React.FC<Props> = ({ caseId, currentTeam, onClose, onSuccess }) => {
  const [officers, setOfficers] = useState<User[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [userId, setUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const res = await api.get('/users');
        if (res.data.success) {
          const assignedIds = new Set(currentTeam.map(m => m.id));
          const list: User[] = (res.data.data || []).filter((u: User) => !assignedIds.has(u.id));
          setOfficers(list);
          if (list.length > 0) setUserId(list[0].id);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setAdding(true);
    try {
      const res = await api.post(`/cases/${caseId}/assignments`, { userId });
      if (res.data.success) {
        toast.success(`${res.data.data.addedUser.name} added to the case.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to add officer: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setAdding(false);
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
        borderRadius: '16px', width: '100%', maxWidth: '440px',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '7px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              <UserPlus size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Add Officer to Case</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdd} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
              Officer *
            </label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              style={inputStyle}
              disabled={loadingOfficers || officers.length === 0}
            >
              {loadingOfficers && <option>Loading officer directory...</option>}
              {!loadingOfficers && officers.length === 0 && <option>All officers already have access</option>}
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.role.replace('_', ' ')}{o.department ? ` (${o.department})` : ''}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
              They'll be able to view, upload to, and act on this case as if they were part of the original investigation team.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={adding || !userId} style={{
              flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: (adding || !userId) ? 'rgba(59,130,246,0.5)' : '#3b82f6', color: 'white',
              border: 'none', cursor: (adding || !userId) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}>
              {adding ? <><Loader size={13} className="animate-spin" /> Adding...</> : <><UserPlus size={13} /> Add to Case</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
