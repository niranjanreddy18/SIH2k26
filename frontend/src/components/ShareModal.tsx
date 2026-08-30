import React, { useState } from 'react';
import { X, Share2, Calendar, Lock } from 'lucide-react';
import api from '../services/api';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ShareModal: React.FC<Props> = ({ documentId, documentName, onClose, onSuccess }) => {
  const [recipientId, setRecipientId] = useState('22222222-2222-2222-2222-222222222222');
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(3);
  const [sharing, setSharing] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setSharing(true);

    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + parseInt(expiresInDays.toString()));

    try {
      const res = await api.post(`/documents/${documentId}/share`, {
        recipientId,
        canView,
        canDownload,
        expiresAt: expiresDate.toISOString()
      });

      if (res.data.success) {
        alert(`Document "${documentName}" successfully shared with expiry!`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      alert('Sharing failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <Share2 className="w-5 h-5" /> Time-Bounded Document Share
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-6 space-y-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 font-medium">Sharing Document</div>
            <div className="font-bold text-slate-900">{documentName}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Recipient Officer *</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
            >
              <option value="22222222-2222-2222-2222-222222222222">ACP Rajeshwar Sharma (Senior Officer)</option>
              <option value="33333333-3333-3333-3333-333333333333">Dr. Ananya Roy (Forensic Officer - CFSL)</option>
              <option value="11111111-1111-1111-1111-111111111111">Inspector Vikram Singh (Cyber Crime Cell)</option>
              <option value="44444444-4444-4444-4444-444444444444">Admin Desk Officer (Directorate)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">Permissions</label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={canView}
                  onChange={(e) => setCanView(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                Can View
              </label>
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                Can Download
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Access Expiration Period</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 text-xs font-medium"
            >
              <option value={1}>1 Day (24 Hours)</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (1 Week)</option>
              <option value={30}>30 Days</option>
            </select>
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
              disabled={sharing}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? 'Granting Access...' : 'Grant Time-Bounded Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
