import React, { useState, useEffect } from 'react';
import { X, Box, ArrowRight, UserCheck, Calendar, Send, Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { EvidenceCustodyEvent, User } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  evidenceId: string;
  evidenceType: string;
  onClose: () => void;
  onCustodyUpdated?: () => void;
}

// Alternating blue/violet dot colors per spec §9
const DOT_COLORS = ['#3b82f6', '#a78bfa', '#10b981', '#60a5fa', '#c084fc', '#34d399'];

export const EvidenceTimelineModal: React.FC<Props> = ({
  evidenceId, evidenceType, onClose, onCustodyUpdated
}) => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState<EvidenceCustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [officers, setOfficers] = useState<User[]>([]);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [actionType, setActionType] = useState('TRANSFERRED_TO_FORENSICS');
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');
  const [tamperSealNumber, setTamperSealNumber] = useState('');
  const [transferring, setTransferring] = useState(false);

  const fetchCustodyEvents = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get(`/evidence/${evidenceId}/custody`);
      if (res.data.success) setEvents(res.data.data.items || []);
    } catch (err: any) {
      setLoadError(true);
      toast.error('Failed to load custody timeline: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        const list: User[] = (res.data.data || []).filter((u: User) => u.id !== currentUser?.id);
        setOfficers(list);
        if (list.length > 0) setToUserId(list[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load officer directory: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  useEffect(() => { fetchCustodyEvents(); fetchOfficers(); }, [evidenceId]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) return;
    setTransferring(true);
    try {
      const res = await api.post(`/evidence/${evidenceId}/transfer`, {
        toUserId,
        action: actionType,
        reason: reason || 'Forensic lab analysis transfer',
        tamperSealNumber: tamperSealNumber.trim() || undefined,
      });
      if (res.data.success) {
        toast.success('Custody transferred and recorded on blockchain ledger.');
        setShowTransferForm(false);
        setReason('');
        setTamperSealNumber('');
        await fetchCustodyEvents();
        onCustodyUpdated?.();
      }
    } catch (err: any) {
      toast.error('Transfer failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setTransferring(false);
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
        borderRadius: '16px', width: '100%', maxWidth: '640px',
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
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px' }}>
              <Box size={16} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                Chain of Custody Provenance Timeline
              </h3>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '3px' }}>
                {evidenceType}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Transfer Panel */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px',
          }}>
            {!showTransferForm ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>Transfer Custody Action</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Officially hand over evidence to another authorized department officer.
                  </p>
                </div>
                <button
                  onClick={() => setShowTransferForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '8px', flexShrink: 0,
                    background: '#10b981', color: 'white', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', border: 'none',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                  }}
                >
                  <Send size={12} /> Transfer Custody
                </button>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>Initiate Evidence Transfer</span>
                  <button type="button" onClick={() => setShowTransferForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>
                      Transfer Purpose / Stage *
                    </label>
                    <select
                      value={actionType}
                      onChange={e => setActionType(e.target.value)}
                      style={{ ...inputStyle }}
                    >
                      <option value="TRANSFERRED_TO_FORENSICS">🔬 Transfer to Forensics Lab</option>
                      <option value="ANALYSIS_IN_PROGRESS">🧪 Forensic Analysis In Progress</option>
                      <option value="RETURNED_TO_VAULT">🔐 Return to Central Vault</option>
                      <option value="PRODUCED_IN_COURT">⚖️ Produce in Judicial Court</option>
                      <option value="OFFICER_HANDOVER">👮 Internal Officer Handover</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>
                      Tamper Seal Bag # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SEAL-9921-CYBER"
                      value={tamperSealNumber}
                      onChange={e => setTamperSealNumber(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>
                    Recipient Officer / Specialist *
                  </label>
                  <select value={toUserId} onChange={e => setToUserId(e.target.value)} style={{ ...inputStyle }} disabled={officers.length === 0}>
                    {officers.length === 0 && <option>Loading officer directory...</option>}
                    {officers.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} — {o.role.replace(/_/g, ' ')}{o.department ? ` (${o.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>
                    Reason / Examination Memo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Forensic bit-stream imaging & deleted partition extraction under Sec 65B"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={transferring}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '8px',
                      background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', border: 'none', opacity: transferring ? 0.6 : 1,
                    }}
                  >
                    {transferring ? <><Loader size={12} className="animate-spin" /> Recording...</> : 'Confirm Handover & Sign'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Custody Timeline */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Loader size={20} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Loading chain of custody...
            </div>
          ) : loadError ? (
            <div style={{
              textAlign: 'center', padding: '32px',
              color: 'var(--danger)', fontSize: '12px',
              background: 'var(--danger-bg)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <AlertTriangle size={24} style={{ margin: '0 auto 10px' }} />
              Could not load the custody timeline.
              <button
                onClick={fetchCustodyEvents}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', margin: '12px auto 0',
                  padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px',
              color: 'var(--text-muted)', fontSize: '12px',
              background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)',
            }}>
              <Box size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              No custody transfers recorded yet. Initial registration logged.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: '14px', top: '14px', bottom: '14px',
                width: '2px',
                background: 'linear-gradient(180deg, #3b82f6 0%, #a78bfa 50%, #10b981 100%)',
                borderRadius: '2px',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '36px' }}>
                {events.map((ev, idx) => {
                  const dotColor = DOT_COLORS[idx % DOT_COLORS.length];
                  return (
                    <div key={idx} className="animate-slide-in" style={{ position: 'relative', animationDelay: `${idx * 80}ms` }}>
                      {/* Dot */}
                      <div style={{
                        position: 'absolute', left: '-29px', top: '14px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: dotColor, border: `2px solid var(--bg-surface)`,
                        boxShadow: `0 0 8px ${dotColor}66`,
                        transform: 'translateX(-50%)',
                        zIndex: 1,
                      }} />

                      {/* Card */}
                      <div style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px',
                        padding: '14px', transition: 'border-color 150ms',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.05em', color: dotColor,
                            background: `${dotColor}15`, border: `1px solid ${dotColor}30`,
                            borderRadius: '9999px', padding: '3px 9px',
                          }}>
                            {ev.action}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'JetBrains Mono, monospace' }}>
                            <Calendar size={11} /> {new Date(ev.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 600 }}>
                          {ev.from && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                <UserCheck size={13} color="var(--text-muted)" />
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>From:</span>
                                {ev.from.name}
                              </div>
                              <ArrowRight size={13} color="var(--text-muted)" />
                            </>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: dotColor }}>
                            <UserCheck size={13} color={dotColor} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>To:</span>
                            <span style={{ color: dotColor, fontWeight: 700 }}>{ev.to.name}</span>
                          </div>
                        </div>

                        {ev.reason && (
                          <div style={{
                            marginTop: '10px', padding: '8px 10px', borderRadius: '6px',
                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                            fontSize: '11px', color: 'var(--text-secondary)',
                          }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Memo: </span>
                            {ev.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
          background: 'var(--bg-elevated)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
