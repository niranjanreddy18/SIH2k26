import React, { useState, useEffect } from 'react';
import { X, Box, ArrowRight, ShieldCheck, UserCheck, Calendar, Send } from 'lucide-react';
import api from '../services/api';
import { EvidenceCustodyEvent } from '../types';

interface Props {
  evidenceId: string;
  evidenceType: string;
  onClose: () => void;
  onCustodyUpdated?: () => void;
}

export const EvidenceTimelineModal: React.FC<Props> = ({
  evidenceId,
  evidenceType,
  onClose,
  onCustodyUpdated
}) => {
  const [events, setEvents] = useState<EvidenceCustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [toUserId, setToUserId] = useState('33333333-3333-3333-3333-333333333333');
  const [reason, setReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const fetchCustodyEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/evidence/${evidenceId}/custody`);
      if (res.data.success) {
        setEvents(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch custody:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustodyEvents();
  }, [evidenceId]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) return;
    setTransferring(true);
    try {
      const res = await api.post(`/evidence/${evidenceId}/transfer`, {
        toUserId,
        reason: reason || 'Forensic lab analysis transfer'
      });
      if (res.data.success) {
        setShowTransferForm(false);
        setReason('');
        await fetchCustodyEvents();
        if (onCustodyUpdated) onCustodyUpdated();
      }
    } catch (err: any) {
      alert('Transfer failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Chain of Custody Provenance Timeline</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{evidenceType}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Transfer Custody Button & Panel */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {!showTransferForm ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Transfer Custody Action</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Officially hand over physical or digital evidence to another authorized department officer.</p>
                </div>
                <button
                  onClick={() => setShowTransferForm(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" /> Transfer Custody
                </button>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-emerald-800">Initiate Evidence Transfer</span>
                  <button
                    type="button"
                    onClick={() => setShowTransferForm(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-700 mb-1 font-bold">Recipient Officer *</label>
                  <select
                    value={toUserId}
                    onChange={(e) => setToUserId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="33333333-3333-3333-3333-333333333333">Dr. Ananya Roy (Forensic Officer - CFSL)</option>
                    <option value="22222222-2222-2222-2222-222222222222">ACP Rajeshwar Sharma (Senior Officer)</option>
                    <option value="11111111-1111-1111-1111-111111111111">Inspector Vikram Singh (Cyber Crime Cell)</option>
                    <option value="44444444-4444-4444-4444-444444444444">Admin Desk Officer (Evidence Vault Custodian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-700 mb-1 font-bold">Reason for Handover / Examination Memo</label>
                  <input
                    type="text"
                    placeholder="e.g. Forensic memory dump recovery & drive analysis"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={transferring}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {transferring ? 'Recording...' : 'Confirm Handover & Sign'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Custody Timeline Nodes */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading custody log...</div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No custody transfers recorded yet. Initial registration logged.</div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-slate-300">
              {events.map((ev, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md shadow-emerald-500/20 group-hover:scale-125 transition-transform" />
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {ev.action}
                      </span>
                      <span className="text-slate-400 font-mono flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3" /> {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-700 pt-1">
                      {ev.from && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">From:</span> {ev.from.name}
                        </div>
                      )}
                      {ev.from && <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />}
                      <div className="flex items-center gap-1.5 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-slate-500">To:</span> <span className="text-emerald-800 font-bold">{ev.to.name}</span>
                      </div>
                    </div>

                    {ev.reason && (
                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-sans">
                        <span className="text-slate-400 font-medium">Memo: </span>
                        {ev.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
