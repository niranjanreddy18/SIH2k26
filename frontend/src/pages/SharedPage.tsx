import React, { useState, useEffect } from 'react';
import { Share2, FileText, Download, Clock, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import api from '../services/api';
import { ShareItem } from '../types';

interface Props {
  onSelectCase?: (caseId: string) => void;
}

export const SharedPage: React.FC<Props> = ({ onSelectCase }) => {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchSharedDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents/shared-with-me');
      if (res.data.success) {
        setShares(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error('Failed to load shared documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedDocs();
  }, []);

  const handleDownload = async (docId: string, docName: string) => {
    setDownloadingId(docId);
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', docName || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this document access grant?')) return;
    try {
      const res = await api.post(`/shares/${shareId}/revoke`);
      if (res.data.success) {
        alert('Share grant revoked successfully.');
        await fetchSharedDocs();
      }
    } catch (err: any) {
      alert('Revocation failed: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-blue-600" /> Documents Shared With Me
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controlled, time-bound access grants shared across investigation departments with cryptographic audit trails.
          </p>
        </div>

        <button
          onClick={fetchSharedDocs}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3 text-slate-500 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          Loading active document grants...
        </div>
      ) : shares.length === 0 ? (
        <div className="py-16 text-center bg-white p-8 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Documents Shared With You Currently</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When Investigating or Senior Officers grant you time-bound permissions for a case document, it will securely appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shares.map((s) => {
            const isExpired = new Date(s.expiresAt) <= new Date();
            return (
              <div key={s.shareId} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-colors shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {s.case?.firNumber || 'Case Document'}
                      </span>
                      {isExpired ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          EXPIRED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ACTIVE GRANT
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{s.document?.name || 'Investigation Document'}</h3>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* Permissions & Expiry */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-sans">Permissions:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-emerald-700 flex items-center gap-1 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> View
                      </span>
                      {s.canDownload ? (
                        <span className="text-emerald-700 flex items-center gap-1 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Download
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> No Download
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block font-sans">Valid Until:</span>
                    <span className="text-amber-700 flex items-center gap-1 text-[11px] font-bold mt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> {new Date(s.expiresAt).toLocaleDateString()} {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {onSelectCase && s.case?.id ? (
                    <button
                      onClick={() => onSelectCase(s.case.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Open Case File →
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {s.canDownload && (
                      <button
                        onClick={() => handleDownload(s.document.id, s.document.name)}
                        disabled={downloadingId === s.document.id || isExpired}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloadingId === s.document.id ? 'Downloading...' : 'Download File'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRevoke(s.shareId)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-bold transition-colors"
                      title="Revoke share access"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
