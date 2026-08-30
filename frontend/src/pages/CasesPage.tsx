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
          setCases(res.data.data.items || []);
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
          <h2 className="text-xl font-extrabold text-slate-900">Case File Repository</h2>
          <p className="text-xs text-slate-500 mt-1">Search, filter, and inspect registered investigation files.</p>
        </div>
        <button
          onClick={onOpenNewCase}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Register New Case
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by FIR Number or Case Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="CHARGESHEET_PREPARED">CHARGESHEET PREPARED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
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
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading case repository...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No cases matched the search filter criteria.</div>
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
                {filteredCases.map((c) => (
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
