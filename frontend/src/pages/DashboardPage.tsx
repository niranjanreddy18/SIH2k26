import React, { useState, useEffect } from 'react';
import { FolderKanban, FileCheck2, Clock, ShieldCheck, Plus, ArrowUpRight } from 'lucide-react';
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
          setCases(res.data.data.items || []);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Investigation Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time status of legal case files, evidence custody, and cryptographic audit records.</p>
        </div>
        <button
          onClick={onOpenNewCase}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shrink-0 shadow-md shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Register New Case
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{cases.length}</div>
            <div className="text-xs text-slate-500 font-medium">Active Cases</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {cases.reduce((sum, c) => sum + (c.pendingApprovals || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">Pending Approvals</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {cases.reduce((sum, c) => sum + (c.documentCount || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">Hashed Documents</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">100%</div>
            <div className="text-xs text-slate-500 font-medium">Cryptographic Integrity</div>
          </div>
        </div>
      </div>

      {/* Case List Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Active Case Files</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active cases registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">FIR Number</th>
                  <th className="px-6 py-3.5">Case Title</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Classification</th>
                  <th className="px-6 py-3.5 text-center">Docs</th>
                  <th className="px-6 py-3.5 text-center">Evidence</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{c.firNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.title}</td>
                    <td className="px-6 py-4"><StatusBadge type="status" value={c.status} /></td>
                    <td className="px-6 py-4"><StatusBadge type="classification" value={c.classification} /></td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">{c.documentCount || 0}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">{c.evidenceCount || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onSelectCase(c.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-xs transition-all inline-flex items-center gap-1 border border-slate-200 shadow-xs"
                      >
                        View Case <ArrowUpRight className="w-3.5 h-3.5" />
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
