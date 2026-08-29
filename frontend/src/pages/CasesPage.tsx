import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

export const CasesPage: React.FC<Props> = ({ onSelectCase, onOpenNewCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      try {
        let url = '/cases?limit=50';
        if (statusFilter) url += `&status=${statusFilter}`;
        if (classificationFilter) url += `&classification=${classificationFilter}`;
        const res = await api.get(url);
        if (res.data.success) {
          setCases(res.data.data.items);
        }
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [statusFilter, classificationFilter]);

  const filteredCases = cases.filter(
    (c) =>
      c.firNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Case File Repository</h2>
          <p className="text-xs text-slate-400 mt-1">Search, filter, and inspect registered investigation files.</p>
        </div>
        <button
          onClick={onOpenNewCase}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Register New Case
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by FIR Number or Case Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Classifications</option>
            <option value="PUBLIC">PUBLIC</option>
            <option value="INTERNAL">INTERNAL</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="HIGHLY_CONFIDENTIAL">HIGHLY CONFIDENTIAL</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading case repository...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No cases matched the search filter criteria.</div>
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
                {filteredCases.map((c) => (
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
                        className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1 border border-slate-700"
                      >
                        Inspect Case <ArrowUpRight className="w-3.5 h-3.5" />
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

