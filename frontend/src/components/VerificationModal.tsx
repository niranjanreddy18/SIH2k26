import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Lock, FileCode } from 'lucide-react';
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
        // Automatically re-verify
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-lg">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Cryptographic Integrity Verification
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-xs text-slate-400 uppercase font-mono">Target Document</div>
            <div className="text-base font-semibold text-slate-100 mt-0.5">{documentName}</div>
            <div className="text-xs font-mono text-slate-500 mt-0.5">ID: {documentId}</div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Fetching MinIO stream & re-computing SHA-256 hash...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Status Header */}
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                result.status === 'VERIFIED'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/60 text-rose-300'
              }`}>
                {result.status === 'VERIFIED' ? (
                  <ShieldCheck className="w-10 h-10 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-10 h-10 text-rose-400 shrink-0 animate-bounce" />
                )}
                <div>
                  <div className="text-lg font-bold tracking-wide">
                    INTEGRITY STATUS: {result.status}
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    {result.status === 'VERIFIED'
                      ? 'The current file on storage matches the registered SHA-256 hash and permissioned ledger transaction record.'
                      : 'TAMPER DETECTED! The file content on disk has been modified since it was locked.'}
                  </p>
                </div>
              </div>

              {tamperedNotice && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {tamperedNotice}
                </div>
              )}

              {/* Hash Details Comparison */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Registered DB & Ledger Hash (SHA-256):</div>
                  <div className="text-emerald-400 bg-slate-900 p-2 rounded mt-1 overflow-x-auto border border-slate-800">
                    {result.registeredHash}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Current Re-calculated Storage Hash (SHA-256):</div>
                  <div className={`p-2 rounded mt-1 overflow-x-auto border ${
                    result.status === 'VERIFIED' 
                      ? 'text-emerald-400 bg-slate-900 border-slate-800' 
                      : 'text-rose-400 bg-rose-950/30 border-rose-800 font-bold'
                  }`}>
                    {result.currentHash}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Blockchain Ref:</span>
                    <span className="text-indigo-400 font-semibold ml-2">{result.blockchainRef}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Verified At:</span>
                    <span className="text-slate-300 ml-2">{new Date(result.verifiedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={triggerTamperDemo}
            disabled={tamperLoading || loading}
            className="px-3.5 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Simulate out-of-band file modification on disk to trigger MISMATCH"
          >
            <FileCode className="w-4 h-4 text-rose-400" />
            {tamperLoading ? 'Corrupting File...' : '⚡ Demo Tamper Climax'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={runVerification}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Re-run Verification
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

