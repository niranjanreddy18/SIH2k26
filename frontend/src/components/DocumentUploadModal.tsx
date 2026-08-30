import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import api from '../services/api';

interface Props {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DocumentUploadModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('WITNESS_STATEMENT');
  const [classification, setClassification] = useState('INTERNAL');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', type);
      formData.append('classification', classification);
      if (file) {
        formData.append('file', file);
      }

      const res = await api.post(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      alert('Upload failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <Upload className="w-5 h-5" /> Upload Document & Register SHA-256
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Witness Statement - Informant Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
              >
                <option value="FIR">FIR</option>
                <option value="COMPLAINT">COMPLAINT</option>
                <option value="WITNESS_STATEMENT">WITNESS STATEMENT</option>
                <option value="INVESTIGATION_REPORT">INVESTIGATION REPORT</option>
                <option value="FORENSIC_REPORT">FORENSIC REPORT</option>
                <option value="SEIZURE_MEMO">SEIZURE MEMO</option>
                <option value="CHARGE_SHEET">CHARGE SHEET</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Classification Tier</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="HIGHLY_CONFIDENTIAL">HIGHLY CONFIDENTIAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF, DOCX, TXT, Image)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <p className="text-[11px] text-slate-500 mt-1">If no file is chosen, a sample document stream will be generated automatically.</p>
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
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading & Hashing...' : 'Upload & Fingerprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
