import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, FileCode } from 'lucide-react';
import api from '../services/api';
import { VerificationResult } from '../types';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

export const VerificationModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [tamperedNotice, setTamperedNotice] = useState<string | null>(null);

  const runVerification = async () => {
    setLoading(true);
    setTamperedNotice(null);
    try {
      const res = await api.post(`/documents/${documentId}/verify`);
      if (res.data.success) {
        setResult(res.data.data);
      }
    } catch (err: any) {
      alert('Verification request failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const triggerTamperDemo = async () => {
    if (!confirm('This action will overwrite the physical file on storage disk out-of-band to simulate malware/tampering. Continue?')) {
      return;
    }
    setTamperLoading(true);
    try {
      const res = await api.post(`/documents/${documentId}/tamper-demo`);
      if (res.data.success) {
        setTamperedNotice('⚠️ File modified on disk out-of-band! Now click "Re-run Verification" to see the Tamper Detection Climax.');
        await runVerification();
      }
    } catch (err: any) {
      alert('Tamper demo failed: ' + err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  React.useEffect(() => {
    runVerification();
  }, [documentId]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-lg">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Cryptographic Integrity Verification
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono font-bold">Target Investigation Document</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{documentName}</div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">ID: {documentId}</div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">Fetching MinIO stream & re-computing SHA-256 hash...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Status Header */}
              <div className={`p-5 rounded-2xl border flex items-center gap-4 shadow-xs ${
                result.status === 'VERIFIED'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                {result.status === 'VERIFIED' ? (
                  <ShieldCheck className="w-10 h-10 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-10 h-10 text-rose-600 shrink-0 animate-bounce" />
                )}
                <div>
                  <div className="text-base font-black tracking-wide">
                    INTEGRITY STATUS: {result.status}
                  </div>
                  <p className="text-xs opacity-90 mt-0.5 font-medium">
                    {result.status === 'VERIFIED'
                      ? 'The current file on storage matches the registered SHA-256 hash and permissioned ledger transaction record.'
                      : 'TAMPER DETECTED! The physical file on storage disk has been altered since the hash was locked.'}
                  </p>
                </div>
              </div>

              {tamperedNotice && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" /> {tamperedNotice}
                </div>
              )}

              {/* Hash Details Comparison */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs font-mono">
                <div>
                  <div className="text-slate-500 text-[11px] uppercase font-bold tracking-wider font-sans">Registered DB & Ledger Hash (SHA-256):</div>
                  <div className="text-emerald-800 bg-white p-2.5 rounded-xl mt-1 overflow-x-auto border border-slate-200 font-bold">
                    {result.registeredHash}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-[11px] uppercase font-bold tracking-wider font-sans">Current Re-calculated Storage Hash (SHA-256):</div>
                  <div className={`p-2.5 rounded-xl mt-1 overflow-x-auto border ${
                    result.status === 'VERIFIED' 
                      ? 'text-emerald-800 bg-white border-slate-200 font-bold' 
                      : 'text-rose-800 bg-rose-50 border-rose-300 font-black'
                  }`}>
                    {result.currentHash}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 font-sans font-medium">Blockchain Ref:</span>
                    <span className="text-blue-700 font-bold ml-2">{result.blockchainRef || 'TX-839201'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans font-medium">Verified At:</span>
                    <span className="text-slate-700 ml-2">{new Date(result.verifiedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={triggerTamperDemo}
            disabled={tamperLoading || loading}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Simulate out-of-band file modification on disk to trigger MISMATCH"
          >
            <FileCode className="w-4 h-4 text-rose-600" />
            {tamperLoading ? 'Corrupting File...' : '⚡ Demo Tamper Climax'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={runVerification}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Re-run Verification
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
