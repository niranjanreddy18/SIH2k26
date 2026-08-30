import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, ShieldAlert, RefreshCw, FileCode, Check, Loader } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Props {
  documentId: string;
  documentName: string;
  onClose: () => void;
}

type VerifyResult = {
  status: 'VERIFIED' | 'MISMATCH';
  registeredHash: string;
  currentHash: string | null;
  txReference?: string;
  blockchainRef?: string | null;
  fabricVerification?: any;
  checkedAt?: string;
  verifiedAt?: string;
};

// Character-by-character hash reveal animation
const HashReveal: React.FC<{ hash: string; color: string; mismatchHash?: string; isAnimating: boolean }> = ({
  hash, color, mismatchHash, isAnimating
}) => {
  const [displayed, setDisplayed] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!isAnimating) { setDisplayed(hash); return; }
    setDisplayed('');
    let i = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(hash.slice(0, i));
      if (i >= hash.length) clearInterval(intervalRef.current);
    }, 18);
    return () => clearInterval(intervalRef.current);
  }, [hash, isAnimating]);

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', padding: '10px 12px',
      background: 'rgba(255,255,255)', borderRadius: '6px',
      border: `1px solid ${color}44`, wordBreak: 'break-all', lineHeight: 1.6,
    }}>
      {displayed.split('').map((ch, idx) => {
        const isDiff = mismatchHash && mismatchHash[idx] && hash[idx] !== mismatchHash[idx];
        return (
          <span
            key={idx}
            className="hash-char"
            style={{
              color: isDiff ? '#ef4444' : color,
              background: isDiff ? 'rgba(239,68,68,0.2)' : 'transparent',
              animationDelay: isAnimating ? `${idx * 18}ms` : '0ms',
            }}
          >
            {ch}
          </span>
        );
      })}
      {displayed.length < hash.length && (
        <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          {hash.slice(displayed.length).split('').map((_, i) => '·').join('')}
        </span>
      )}
    </div>
  );
};

// Step-by-step loading
const LOADING_STEPS = [
  'Retrieving file from secure storage...',
  'Calculating SHA-256 cryptographic hash...',
  'Comparing with registered ledger hash...',
  'Querying blockchain transaction reference...',
];

export const VerificationModal: React.FC<Props> = ({ documentId, documentName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [tamperedNotice, setTamperedNotice] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const toast = useToast();
  const confirm = useConfirm();

  const runVerification = async () => {
    setLoading(true);
    setLoadingStep(0);
    setIsAnimating(false);

    // Step progress animation
    const stepInterval = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 400);

    try {
      const res = await api.post(`/documents/${documentId}/verify`);
      clearInterval(stepInterval);
      if (res.data.success) {
        const data = res.data.data;
        setResult(data);
        setIsAnimating(true);
        // If tampered, trigger shake after a short delay
        if (data.status === 'MISMATCH') {
          setTimeout(() => setShakeKey(k => k + 1), 300);
        }
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      toast.error('Verification failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const triggerTamperDemo = async () => {
    const ok = await confirm({
      title: 'Simulate Tampering',
      message: 'This will overwrite the physical file on disk to simulate tampering/malware. Continue?',
      confirmLabel: 'Corrupt File',
      danger: true,
    });
    if (!ok) return;
    setTamperLoading(true);
    setTamperedNotice(null);
    try {
      await api.post(`/documents/${documentId}/tamper-demo`);
      setTamperedNotice('File modified on disk out-of-band! Re-running verification...');
      await runVerification();
    } catch (err: any) {
      toast.error('Tamper demo failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setTamperLoading(false);
    }
  };

  useEffect(() => { runVerification(); }, [documentId]);

  const isVerified = result?.status === 'VERIFIED';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '620px',
        overflow: 'hidden', boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              <ShieldCheck size={18} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                DOCUMENT INTEGRITY VERIFICATION
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {documentName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <Loader size={32} color="#3b82f6" className="animate-spin" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '340px' }}>
                {LOADING_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={i <= loadingStep ? 'animate-fade-in' : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      opacity: i > loadingStep ? 0 : 1,
                      animationDelay: `${i * 400}ms`,
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: i < loadingStep ? '#10b981' : i === loadingStep ? '#3b82f6' : 'var(--bg-elevated)',
                      border: `1px solid ${i < loadingStep ? '#10b981' : i === loadingStep ? '#3b82f6' : 'var(--border)'}`,
                    }}>
                      {i < loadingStep
                        ? <Check size={10} color="white" />
                        : i === loadingStep
                          ? <Loader size={10} color="white" className="animate-spin" />
                          : null
                      }
                    </div>
                    <span style={{ fontSize: '12px', color: i <= loadingStep ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tampered notice */}
              {tamperedNotice && (
                <div className="animate-fade-in" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '8px', color: '#f59e0b', fontSize: '12px', fontWeight: 600,
                }}>
                  ⚠️ {tamperedNotice}
                </div>
              )}

              {/* Registered Hash */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
                  Registered Hash (SHA-256):
                </div>
                <HashReveal
                  hash={result.registeredHash}
                  color="#10b981"
                  isAnimating={isAnimating}
                />
              </div>

              {/* Current Hash */}
              {result.currentHash && (
                <div>
                  <div style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', marginBottom: '6px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isVerified ? 'var(--text-muted)' : '#f87171',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    Current Hash (SHA-256):
                    {!isVerified && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, color: '#ef4444',
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '9999px', padding: '2px 8px',
                      }}>MISMATCH</span>
                    )}
                  </div>
                  <HashReveal
                    hash={result.currentHash}
                    color={isVerified ? '#10b981' : '#f87171'}
                    mismatchHash={isVerified ? undefined : result.registeredHash}
                    isAnimating={isAnimating}
                  />
                </div>
              )}

              {/* Blockchain Reference */}
              {(result.txReference || result.blockchainRef) && (
                <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Blockchain Reference:
                  </div>
                  <div style={{
                    padding: '8px 12px', borderRadius: '6px',
                    background: 'rgba(255,255,255)', border: '1px solid black',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#60a5fa',
                  }}>
                    {result.txReference || result.blockchainRef}
                  </div>
                </div>
              )}

              {/* Result Panel */}
              <div
                key={shakeKey}
                className={`animate-fade-in-up ${isVerified ? 'animate-glow-green' : 'animate-glow-red animate-shake'}`}
                style={{
                  padding: '20px', borderRadius: '10px', marginTop: '4px',
                  background: isVerified ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `2px solid ${isVerified ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.5)'}`,
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}
              >
                {isVerified
                  ? <ShieldCheck size={36} color="#10b981" style={{ flexShrink: 0 }} />
                  : <ShieldAlert size={36} color="#ef4444" style={{ flexShrink: 0, animation: 'pulse 1s infinite' }} />
                }
                <div>
                  <div style={{
                    fontSize: '15px', fontWeight: 800, letterSpacing: '0.04em',
                    color: isVerified ? '#10b981' : '#ef4444',
                    textTransform: 'uppercase', marginBottom: '4px',
                  }}>
                    {isVerified ? 'INTEGRITY VERIFIED' : 'TAMPERING DETECTED'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {isVerified
                      ? 'Hashes match · Document is authentic · Blockchain record confirmed.'
                      : 'Hash mismatch — document has been altered since registration. Evidence integrity compromised!'
                    }
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
                    Verified: {new Date(result.checkedAt || result.verifiedAt || Date.now()).toISOString()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <button
            onClick={triggerTamperDemo}
            disabled={tamperLoading || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px',
              borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', opacity: (tamperLoading || loading) ? 0.5 : 1,
              transition: 'all 150ms',
            }}
          >
            <FileCode size={14} />
            {tamperLoading ? 'Corrupting file...' : '⚡ Demo Tamper Climax'}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={runVerification}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px',
                borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: '#3b82f6', color: 'white', border: 'none',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Re-run Verification
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
