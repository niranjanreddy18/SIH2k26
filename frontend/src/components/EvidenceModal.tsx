import React, { useState, useEffect } from 'react';
import { X, Box, ArrowRight, ShieldCheck, History } from 'lucide-react';
import api from '../services/api';
import { Evidence, EvidenceCustodyEvent } from '../types';

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EvidenceModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [custodyEvents, setCustodyEvents] = useState<EvidenceCustodyEvent[]>([]);
  const [existingEvidence, setExistingEvidence] = useState<Evidence[]>([]);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await api.get(`/cases/${caseId}`);
        if (res.data.success && res.data.data.counts) {
          // Fetch custody if existing
        }
      } catch (err) {}
    };
    fetchEvidence();
  }, [caseId]);

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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-lg">
            <Box className="w-5 h-5" /> Register Physical/Digital Evidence
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRegister} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Evidence Type / Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Encrypted SSD 1TB (Serial #SSD-99482)"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Collection Details & Serial Specs</label>
            <textarea
              rows={3}
              placeholder="Record exact scene location, seals, and forensic details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
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

