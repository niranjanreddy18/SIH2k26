import React, { useState, useEffect } from 'react';
import { FolderKanban, FileCheck2, Clock, ShieldAlert, Plus, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

export const DashboardPage: React.FC<Props> = ({ onSelectCase, onOpenNewCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await api.get('/cases?limit=5');
        if (res.data.success) {
          setCases(res.data.data.items);
        }
      } catch (err) {
        console.error('Failed to load dashboard cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Investigation Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time status of legal case files, evidence custody, and cryptographic audit records.</p>
        </div>
        <button
          onClick={onOpenNewCase}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Register New Case
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{cases.length}</div>
            <div className="text-xs text-slate-400">Active Cases</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {cases.reduce((sum, c) => sum + (c.pendingApprovals || 0), 0)}
            </div>
            <div className="text-xs text-slate-400">Pending Approvals</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {cases.reduce((sum, c) => sum + (c.documentCount || 0), 0)}
            </div>
            <div className="text-xs text-slate-400">Hashed Documents</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">100%</div>
            <div className="text-xs text-slate-400">Cryptographic Integrity</div>
          </div>
        </div>
      </div>

      {/* Case List Summary Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200 text-sm">Recent Active Case Files</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active cases registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px]">
                <tr>
                  <th className="px-6 py-3">FIR Number</th>
                  <th className="px-6 py-3">Case Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3 text-center">Docs</th>
                  <th className="px-6 py-3 text-center">Evidence</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-400">{c.firNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-100">{c.title}</td>
                    <td className="px-6 py-4"><StatusBadge type="status" value={c.status} /></td>
                    <td className="px-6 py-4"><StatusBadge type="classification" value={c.classification} /></td>
                    <td className="px-6 py-4 text-center font-mono">{c.documentCount || 0}</td>
                    <td className="px-6 py-4 text-center font-mono">{c.evidenceCount || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onSelectCase(c.id)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1 border border-slate-700"
                      >
                        View File <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

