import React, { useState } from 'react';
import { X, Box, ShieldCheck } from 'lucide-react';
import api from '../services/api';

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EvidenceModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/cases/${caseId}/evidence`, {
        type,
        description,
        collectedAt: new Date().toISOString()
      });
      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      alert('Failed to register evidence: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
            <Box className="w-5 h-5" /> Register Physical/Digital Evidence
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRegister} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Evidence Type / Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Encrypted SSD 1TB (Serial #SSD-99482)"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Collection Details & Serial Specs</label>
            <textarea
              rows={3}
              placeholder="Record exact scene location, seals, and forensic details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Register Evidence Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
