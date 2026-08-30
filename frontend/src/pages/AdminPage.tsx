import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Lock, Unlock, Users, Key, FileCheck, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { AdminUser, AuditEvent } from '../types';

export const AdminPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('INVESTIGATOR');
  const [department, setDepartment] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
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
      console.error('Failed to load admin audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') fetchUsers();
    else fetchAdminAudit();
  }, [activeSubTab]);

  const handleUnlockUser = async (userId: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/unlock`);
      if (res.data.success) {
        alert('User account unlocked successfully.');
        await fetchUsers();
      }
    } catch (err: any) {
      alert('Unlock failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        alert('User role updated successfully.');
        await fetchUsers();
      }
    } catch (err: any) {
      alert('Role update failed: ' + (err.response?.data?.error?.message || err.message));
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
        setShowAddUser(false);
        setName('');
        setEmail('');
        setPassword('');
        await fetchUsers();
      }
    } catch (err: any) {
      alert('Create user failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Directorate Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-600" /> IT & Security Administration Directorate
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System configuration, user access provisioning, cryptographic lockout controls, and master audit verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSubTab === 'users' && (
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20"
            >
              <UserPlus className="w-4 h-4" /> Add Officer Account
            </button>
          )}
          <button
            onClick={() => (activeSubTab === 'users' ? fetchUsers() : fetchAdminAudit())}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'users'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> System Users & Lockout Controls
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'audit'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" /> System-Wide Master Audit
        </button>
      </div>

      {/* Create User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" /> Provision Officer Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Officer Sunita Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Official Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. s.rao@police.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars with mixed case & symbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="INVESTIGATOR">INVESTIGATOR</option>
                    <option value="SENIOR_OFFICER">SENIOR_OFFICER</option>
                    <option value="FORENSIC_OFFICER">FORENSIC_OFFICER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Department / Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Cyber Crime Unit"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-600/20"
                >
                  {creating ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Subtab */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-mono border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-4">Officer Name</th>
                  <th className="p-4">Email / Login</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Lockout Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{u.name}</td>
                    <td className="p-4 font-mono text-slate-500">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-purple-700 font-mono font-bold rounded-lg px-2.5 py-1 text-[11px]"
                      >
                        <option value="INVESTIGATOR">INVESTIGATOR</option>
                        <option value="SENIOR_OFFICER">SENIOR_OFFICER</option>
                        <option value="FORENSIC_OFFICER">FORENSIC_OFFICER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-600">{u.department || 'General Directorate'}</td>
                    <td className="p-4">
                      {u.isLocked ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold flex items-center gap-1.5 w-fit">
                          <Lock className="w-3 h-3 text-rose-600" /> LOCKED (Failed Attempts)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active (0 Fails)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {u.isLocked && (
                        <button
                          onClick={() => handleUnlockUser(u.id)}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <Unlock className="w-3.5 h-3.5 text-amber-600" /> Unlock Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Subtab */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Target Type</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Merkle Hash Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-purple-700">{log.action}</td>
                    <td className="p-4 font-sans text-slate-900 font-medium">
                      <div>{log.actor?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.actor?.role}</div>
                    </td>
                    <td className="p-4 text-slate-500">{log.targetType || 'SYSTEM'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {log.result}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-slate-400 max-w-[200px] truncate" title={log.eventHash}>
                      {log.eventHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
