import React, { useState, useEffect } from 'react';
import {
  Shield, UserPlus, Lock, Unlock, Users, Key, FileCheck,
  RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, Settings, Search, Loader
} from 'lucide-react';
import api from '../services/api';
import { AdminUser, AuditEvent } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audit' | 'policies'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('INVESTIGATOR');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data.items || []);
      }
    } catch (err: any) {
      toast.error('Failed to load users: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAudit = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit');
      if (res.data.success) {
        setAuditLogs(res.data.data.items || []);
      }
    } catch (err: any) {
      toast.error('Failed to load audit logs: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') fetchUsers();
    else if (activeSubTab === 'audit') fetchAdminAudit();
    else setLoading(false);
  }, [activeSubTab]);

  const handleUnlockUser = async (userId: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/unlock`);
      if (res.data.success) {
        toast.success('User account unlocked successfully.');
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error('Unlock failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        toast.success('User role updated successfully.');
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error('Role update failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setCreating(true);
    try {
      const res = await api.post('/admin/users', {
        name,
        email,
        password,
        role,
        department,
        mfaEnabled: true
      });
      if (res.data.success) {
        toast.success('Officer account created.');
        setShowAddUser(false);
        setName('');
        setEmail('');
        setPassword('');
        setDepartment('');
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error('Create user failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '12px',
    outline: 'none',
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Directorate Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(139,92,246,0.06) 100%)',
        border: '1px solid var(--border)', borderRadius: '14px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', display: 'flex',
            }}>
              <Shield size={20} color="#f87171" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Admin Directorate
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                User access provisioning, cryptographic lockout controls, and master audit verification
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeSubTab === 'users' && (
            <button
              onClick={() => setShowAddUser(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px', borderRadius: '8px',
                background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: 'none',
                boxShadow: '0 4px 16px rgba(239,68,68,0.25)', transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
            >
              <UserPlus size={14} /> Add Officer Account
            </button>
          )}
          <button
            onClick={() => (activeSubTab === 'users' ? fetchUsers() : activeSubTab === 'audit' ? fetchAdminAudit() : null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '4px' }}>
        {[
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'audit', label: 'System Audit', icon: FileCheck },
          { id: 'policies', label: 'Security Policies', icon: Settings },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeSubTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveSubTab(id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', fontSize: '12px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f87171' : 'var(--text-muted)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? '#ef4444' : 'transparent'}`,
                transition: 'all 150ms',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {/* ─── Users Subtab ─── */}
      {activeSubTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* User Search Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search officer accounts by name, email, department, role..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ ...inputStyle, border: 'none', padding: '0', background: 'transparent' }}
            />
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader size={24} color="#f87171" className="animate-spin" style={{ margin: '0 auto 10px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading system accounts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No accounts match the criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Officer Name', 'Official Email', 'Assigned Role', 'Department', 'Lockout Status', 'Actions'].map((h, idx) => (
                        <th key={h} style={{
                          padding: '12px 16px', fontSize: '10px', fontWeight: 700,
                          textAlign: idx === 5 ? 'right' : 'left',
                          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                          fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 100ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {u.name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                              borderRadius: '6px', padding: '4px 8px', fontSize: '10px', outline: 'none', cursor: 'pointer',
                            }}
                          >
                            <option value="INVESTIGATOR">INVESTIGATOR</option>
                            <option value="SENIOR_OFFICER">SENIOR_OFFICER</option>
                            <option value="FORENSIC_OFFICER">FORENSIC_OFFICER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {u.department || 'General Directorate'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.isLocked ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '9999px', padding: '2px 8px',
                            }}>
                              <Lock size={10} /> LOCKED
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                              borderRadius: '9999px', padding: '2px 8px',
                            }}>
                              <CheckCircle2 size={10} /> Active
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {u.isLocked && (
                            <button
                              onClick={() => handleUnlockUser(u.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                                color: '#f59e0b', cursor: 'pointer',
                              }}
                            >
                              <Unlock size={11} /> Unlock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Audit Subtab ─── */}
      {activeSubTab === 'audit' && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader size={24} color="#f87171" className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading master audit events...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No master audit events recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Timestamp (UTC)', 'Action', 'Actor', 'Target Type', 'Result', 'Merkle Hash Link'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', fontSize: '10px', fontWeight: 700, textAlign: 'left',
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 100ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#f87171' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <div>{log.actor?.name || 'System'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{log.actor?.role}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {log.targetType || 'SYSTEM'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                          color: log.result === 'SUCCESS' ? '#10b981' : '#ef4444',
                          background: log.result === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${log.result === 'SUCCESS' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          borderRadius: '9999px', padding: '2px 8px',
                        }}>
                          {log.result}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.eventHash}>
                        {log.eventHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Security Policies Subtab (UX Spec §11.4) ─── */}
      {activeSubTab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[
            {
              title: 'Maximum File Upload Size',
              value: '50 MB',
              desc: 'Enforced at reverse proxy and API middleware gateway layers.',
              status: 'ENFORCED',
              color: '#10b981',
            },
            {
              title: 'Permitted MIME Types',
              value: 'PDF, DOCX, PNG, JPG, TXT',
              desc: 'Binary magic number validation rejects disguised executable payloads.',
              status: 'ENFORCED',
              color: '#10b981',
            },
            {
              title: 'Session Token Storage',
              value: 'Access Token (LocalStorage) + Refresh Token (HTTP-Only Cookie)',
              desc: 'Refresh tokens are rotated and never exposed to client-side script.',
              status: 'STRICT',
              color: '#3b82f6',
            },
            {
              title: 'MFA Enforcement Matrix',
              value: 'MANDATORY (ADMIN & SENIOR)',
              desc: 'Time-based OTP challenge required for sensitive command execution.',
              status: 'ACTIVE',
              color: '#a78bfa',
            },
            {
              title: 'Audit Immutability Anchor',
              value: 'Hyperledger Fabric 2.5',
              desc: 'Every audit event is cryptographically hashed to SHA-256 state ledger.',
              status: 'ACTIVE',
              color: '#10b981',
            },
            {
              title: 'Account Lockout Threshold',
              value: '5 Failed Consecutive Attempts',
              desc: 'Triggers automated biometric or administrative clearance requirement.',
              status: 'ACTIVE',
              color: '#f59e0b',
            },
          ].map(p => (
            <div key={p.title} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {p.title}
                </span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  color: p.color, background: `${p.color}15`, border: `1px solid ${p.color}30`,
                  borderRadius: '9999px', padding: '2px 8px',
                }}>{p.status}</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {p.value}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      {showAddUser && (
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
                <div style={{ padding: '7px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                  <UserPlus size={16} color="#f87171" />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Provision Officer Account</div>
              </div>
              <button onClick={() => setShowAddUser(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  Full Name *
                </label>
                <input
                  type="text" required placeholder="e.g. Officer Sunita Rao"
                  value={name} onChange={e => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  Official Email Address *
                </label>
                <input
                  type="email" required placeholder="e.g. s.rao@police.gov.in"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  Temporary Password *
                </label>
                <input
                  type="password" required placeholder="Min 8 chars with mixed case & symbol"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                    Assigned Role *
                  </label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                    <option value="INVESTIGATOR">INVESTIGATOR</option>
                    <option value="SENIOR_OFFICER">SENIOR_OFFICER</option>
                    <option value="FORENSIC_OFFICER">FORENSIC_OFFICER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                    Department / Unit
                  </label>
                  <input
                    type="text" placeholder="e.g. Cyber Crime Unit"
                    value={department} onChange={e => setDepartment(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button" onClick={() => setShowAddUser(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  type="submit" disabled={creating}
                  style={{
                    flex: 2, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                    background: creating ? 'rgba(239,68,68,0.5)' : '#ef4444', color: 'white',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: creating ? 'none' : '0 4px 16px rgba(239,68,68,0.25)',
                  }}
                >
                  {creating ? <><Loader size={13} className="animate-spin" /> Provisioning...</> : <><UserPlus size={13} /> Create Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
