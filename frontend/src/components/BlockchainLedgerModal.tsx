import React, { useState, useEffect } from 'react';
import { X, Link2, RefreshCw, CheckCircle2, Copy } from 'lucide-react';
import api from '../services/api';
import { BlockchainRecord } from '../types';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

export const BlockchainLedgerModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/blockchain/records/${documentId}`);
      if (res.data.success) {
        setRecords(res.data.data.records || []);
      }
    } catch (err: any) {
      console.error('Failed to load blockchain records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [documentId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Permissioned Blockchain Ledger Transactions</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              Loading cryptographic ledger blocks...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              No blockchain records anchored for this document yet. Once submitted, approved, signed, or locked, immutable ledger blocks appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {r.txReference}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {r.action}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Version #{r.versionNo || 1}</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Hash Chaining Details */}
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Block Hash (SHA-256):</span>
                        <button
                          onClick={() => copyToClipboard(r.hash, `${r.id}-hash`)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold font-sans"
                        >
                          <Copy className="w-3 h-3" /> {copiedId === `${r.id}-hash` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-emerald-700 text-[11px] truncate mt-0.5 font-bold">
                        {r.hash}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Previous Block Hash Link:</span>
                        <button
                          onClick={() => copyToClipboard(r.prevHash, `${r.id}-prev`)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold font-sans"
                        >
                          <Copy className="w-3 h-3" /> {copiedId === `${r.id}-prev` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 text-[11px] truncate mt-0.5 font-medium">
                        {r.prevHash}
                      </div>
                    </div>
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
