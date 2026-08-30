import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Upload, ShieldCheck, Share2,
  Box, CheckCircle2, XCircle, FileSignature, Lock,
  RefreshCw, History, Eye, Download, Link2, Clock, Send, Layout, Users, Loader, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { Case, Document, Evidence, AuditEvent, CaseShareItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { VerificationModal } from '../components/VerificationModal';
import { BlockchainLedgerModal } from '../components/BlockchainLedgerModal';
import { EvidenceModal } from '../components/EvidenceModal';
import { EvidenceTimelineModal } from '../components/EvidenceTimelineModal';
import { ShareModal } from '../components/ShareModal';
import { DocumentAuditModal } from '../components/DocumentAuditModal';
import { PreviewModal } from '../components/PreviewModal';

interface Props {
  caseId: string;
  onBack: () => void;
}

type TabId = 'overview' | 'documents' | 'evidence' | 'timeline' | 'audit' | 'access';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',   icon: Layout     },
  { id: 'documents',  label: 'Documents',  icon: FileText   },
  { id: 'evidence',   label: 'Evidence',   icon: Box        },
  { id: 'timeline',   label: 'Timeline',   icon: History    },
  { id: 'audit',      label: 'Audit',      icon: ShieldCheck},
  { id: 'access',     label: 'Access',     icon: Users      },
];

const ACTION_DOT_COLORS: Record<string, string> = {
  DOCUMENT_UPLOADED: '#3b82f6',
  DOCUMENT_SUBMITTED: '#f59e0b',
  DOCUMENT_APPROVED: '#10b981',
  DOCUMENT_SIGNED: '#60a5fa',
  DOCUMENT_LOCKED: '#a78bfa',
  DOCUMENT_REJECTED: '#ef4444',
  EVIDENCE_REGISTERED: '#34d399',
  EVIDENCE_TRANSFERRED: '#c084fc',
  default: '#6b7280',
};

export const CaseDetailPage: React.FC<Props> = ({ caseId, onBack }) => {
  const { user } = useAuth();
  const [caseData, setCaseData]       = useState<Case | null>(null);
  const [documents, setDocuments]     = useState<Document[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [shares, setShares]           = useState<CaseShareItem[]>([]);
  const [activeTab, setActiveTab]     = useState<TabId>('documents');
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(false);
  const [revokingId, setRevokingId]   = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const [showUpload, setShowUpload]     = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [verifyDoc, setVerifyDoc]   = useState<{ id: string; name: string } | null>(null);
  const [ledgerDoc, setLedgerDoc]   = useState<{ id: string; name: string } | null>(null);
  const [shareDoc, setShareDoc]     = useState<{ id: string; name: string } | null>(null);
  const [auditDoc, setAuditDoc]     = useState<{ id: string; name: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string; mimeType?: string } | null>(null);
  const [timelineEv, setTimelineEv] = useState<{ id: string; type: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [caseRes, docRes, evRes, auditRes, sharesRes] = await Promise.allSettled([
        api.get(`/cases/${caseId}`),
        api.get(`/cases/${caseId}/documents`),
        api.get(`/cases/${caseId}/evidence`),
        api.get(`/cases/${caseId}/audit`),
        api.get(`/cases/${caseId}/shares`),
      ]);
      if (caseRes.status  === 'fulfilled' && caseRes.value.data.success)  setCaseData(caseRes.value.data.data);
      else setLoadError(true);
      if (docRes.status   === 'fulfilled' && docRes.value.data.success)   setDocuments(docRes.value.data.data.items || []);
      if (evRes.status    === 'fulfilled' && evRes.value.data.success)    setEvidenceList(evRes.value.data.data.items || []);
      if (auditRes.status === 'fulfilled' && auditRes.value.data.success) setAuditEvents(auditRes.value.data.data.items || []);
      if (sharesRes.status === 'fulfilled' && sharesRes.value.data.success) setShares(sharesRes.value.data.data.items || []);
    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCaseDetails(); }, [caseId]);

  const handleWorkflowAction = async (docId: string, action: 'submit' | 'approve' | 'reject' | 'sign' | 'lock') => {
    try {
      const body = (action === 'approve' || action === 'reject')
        ? { comment: `Action ${action.toUpperCase()} recorded by ${user?.name}` } : {};
      const res = await api.post(`/documents/${docId}/${action}`, body);
      if (res.data.success) { toast.success(`Document ${action}${action.endsWith('e') ? 'd' : 'ed'}.`); fetchCaseDetails(); }
    } catch (err: any) {
      toast.error(`Action failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    const ok = await confirm({ message: 'Revoke this document access grant?', confirmLabel: 'Revoke', danger: true });
    if (!ok) return;
    setRevokingId(shareId);
    try {
      await api.post(`/shares/${shareId}/revoke`);
      toast.success('Access revoked.');
      await fetchCaseDetails();
    } catch (err: any) {
      toast.error('Revocation failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setRevokingId(null);
    }
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    setDownloadingId(docId);
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', docName || 'document.pdf');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err: any) {
      toast.error('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && !caseData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <Loader size={28} color="#3b82f6" className="animate-spin" />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading case file & cryptographic signatures...
        </span>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{
        padding: '48px 20px', textAlign: 'center',
        background: loadError ? 'var(--danger-bg)' : undefined,
        border: loadError ? '1px solid rgba(239,68,68,0.3)' : undefined,
        borderRadius: '12px',
      }}>
        {loadError && <AlertTriangle size={28} color="var(--danger)" style={{ margin: '0 auto 10px' }} />}
        <div style={{ fontSize: '13px', color: loadError ? 'var(--danger)' : 'var(--text-muted)', marginBottom: loadError ? '12px' : 0 }}>
          {loadError ? 'Could not load this case file.' : 'Case record not found.'}
        </div>
        {loadError && (
          <button
            onClick={fetchCaseDetails}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    );
  }

  const isSeniorOfficer = user?.role === 'SENIOR_OFFICER' || user?.role === 'ADMIN';

  const btnStyle = (color: string, bg: string, border: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
    color, background: bg, border: `1px solid ${border}`, transition: 'all 150ms', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', cursor: 'pointer', alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={14} /> Back to Cases
      </button>

      {/* Case Header */}
      <div style={{
        background: 'var(--bg-surface)', border: `1px solid ${caseData.classification === 'HIGHLY_CONFIDENTIAL' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
        borderLeft: `4px solid ${caseData.classification === 'HIGHLY_CONFIDENTIAL' ? '#ef4444' : '#3b82f6'}`,
        borderRadius: '12px', padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#60a5fa',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '6px', padding: '3px 10px',
              }}>{caseData.firNumber}</span>
              <StatusBadge type="status" value={caseData.status} />
              <StatusBadge type="classification" value={caseData.classification} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {caseData.title}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {caseData.description || 'No additional summary recorded.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={() => setShowUpload(true)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', background: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
            }}>
              <Upload size={13} /> Add Document
            </button>
            <button onClick={() => setShowEvidence(true)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#34d399',
              border: '1px solid rgba(16,185,129,0.25)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>
              <Box size={13} /> Register Evidence
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px', paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {[
            { label: 'Docs', value: documents.length, color: '#60a5fa' },
            { label: 'Evidence', value: evidenceList.length, color: '#34d399' },
            { label: 'Audit Events', value: auditEvents.length, color: '#a78bfa' },
            { label: 'Crime Type', value: caseData.crimeType || 'General', color: 'var(--text-secondary)', mono: false },
            { label: 'Created By', value: typeof caseData.createdBy === 'object' ? caseData.createdBy.name : 'Officer', color: 'var(--text-secondary)', mono: false },
          ].map(({ label, value, color, mono = true }) => (
            <div key={label} style={{ display: 'flex', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
              <span style={{ color, fontWeight: 700, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '2px' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 14px', fontSize: '12px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#60a5fa' : 'var(--text-muted)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                transition: 'all 150ms', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'FIR Number', value: caseData.firNumber, mono: true },
            { label: 'Title', value: caseData.title },
            { label: 'Crime Type', value: caseData.crimeType || 'General' },
            { label: 'Status', value: caseData.status },
            { label: 'Classification', value: caseData.classification },
            { label: 'Created By', value: typeof caseData.createdBy === 'object' ? caseData.createdBy.name : 'Officer' },
            { label: 'Created At', value: new Date(caseData.createdAt).toLocaleString('en-IN') },
            { label: 'Description', value: caseData.description || 'No summary recorded.', full: true },
          ].map(({ label, value, mono, full }) => (
            <div key={label} style={{
              padding: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
              gridColumn: full ? '1 / -1' : undefined,
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'JetBrains Mono, monospace' : undefined }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documents.length === 0 ? (
            <div style={{
              padding: '48px 20px', textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
            }}>
              <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>No documents uploaded yet</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click "Add Document" above to register an investigation file.</div>
            </div>
          ) : (
            documents.map((doc, i) => {
              const status = doc.currentVersion?.status || 'DRAFT';
              return (
                <div key={doc.id} className="animate-fade-in" style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '16px 18px', animationDelay: `${i * 40}ms`,
                  transition: 'border-color 150ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '16px', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>{doc.type}</span>
                        <StatusBadge type="classification" value={doc.classification} />
                        {doc.currentVersion && <StatusBadge type="status" value={doc.currentVersion.status} />}
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                          v{doc.currentVersion?.versionNo || 1}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{doc.name}</h3>
                      {doc.currentVersion?.hash && (
                        <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                          SHA-256: <span style={{ color: '#10b981' }}>{doc.currentVersion.hash.slice(0, 16)}…</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button style={btnStyle('#10b981','rgba(16,185,129,0.1)','rgba(16,185,129,0.25)')} onClick={() => setVerifyDoc({ id: doc.id, name: doc.name })}>
                        <ShieldCheck size={12} /> Verify
                      </button>
                      <button style={btnStyle('#60a5fa','rgba(59,130,246,0.08)','rgba(59,130,246,0.2)')} onClick={() => setPreviewDoc({ id: doc.id, name: doc.name, mimeType: doc.currentVersion?.mimeType })}>
                        <Eye size={12} /> Preview
                      </button>
                      <button style={btnStyle('#818cf8','rgba(99,102,241,0.1)','rgba(99,102,241,0.25)')} onClick={() => setLedgerDoc({ id: doc.id, name: doc.name })}>
                        <Link2 size={12} /> Blockchain
                      </button>
                      <button style={btnStyle('#a78bfa','rgba(139,92,246,0.1)','rgba(139,92,246,0.25)')} onClick={() => setAuditDoc({ id: doc.id, name: doc.name })}>
                        <History size={12} /> Audit
                      </button>
                      <button
                        style={btnStyle('var(--text-secondary)','var(--bg-elevated)','var(--border)')}
                        onClick={() => handleDownloadDocument(doc.id, doc.name)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? <Loader size={11} className="animate-spin" /> : <Download size={12} />}
                        {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                      </button>
                      <button style={btnStyle('#60a5fa','rgba(59,130,246,0.08)','rgba(59,130,246,0.2)')} onClick={() => setShareDoc({ id: doc.id, name: doc.name })}>
                        <Share2 size={12} /> Share
                      </button>

                      {/* Workflow Transitions */}
                      {status === 'DRAFT' && (
                        <button style={btnStyle('#f59e0b','rgba(245,158,11,0.1)','rgba(245,158,11,0.25)')} onClick={() => handleWorkflowAction(doc.id, 'submit')}>
                          <Send size={11} /> Submit
                        </button>
                      )}
                      {isSeniorOfficer && (status === 'SUBMITTED' || status === 'UNDER_REVIEW') && (
                        <>
                          <button style={{ ...btnStyle('#10b981','#10b981','#10b981'), color: 'white', background: '#10b981', border: 'none', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }} onClick={() => handleWorkflowAction(doc.id, 'approve')}>
                            <CheckCircle2 size={11} /> Approve
                          </button>
                          <button style={btnStyle('#f87171','rgba(239,68,68,0.1)','rgba(239,68,68,0.25)')} onClick={() => handleWorkflowAction(doc.id, 'reject')}>
                            <XCircle size={11} /> Reject
                          </button>
                        </>
                      )}
                      {isSeniorOfficer && status === 'APPROVED' && (
                        <button style={{ ...btnStyle('#3b82f6','#3b82f6','#3b82f6'), color: 'white', background: '#3b82f6', border: 'none', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }} onClick={() => handleWorkflowAction(doc.id, 'sign')}>
                          <FileSignature size={11} /> Sign
                        </button>
                      )}
                      {isSeniorOfficer && status === 'SIGNED' && (
                        <button style={{ ...btnStyle('#a78bfa','#a78bfa','#a78bfa'), color: 'white', background: '#a78bfa', border: 'none', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }} onClick={() => handleWorkflowAction(doc.id, 'lock')}>
                          <Lock size={11} /> Lock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Evidence Tab ── */}
      {activeTab === 'evidence' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {evidenceList.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
              color: 'var(--text-muted)', fontSize: '12px',
            }}>
              <Box size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              No evidence registered for this case yet.
            </div>
          ) : (
            evidenceList.map((ev, i) => (
              <div key={ev.id} className="animate-fade-in-up" style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
                padding: '16px', animationDelay: `${i * 50}ms`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '9999px', padding: '2px 8px', display: 'inline-block', marginBottom: '6px',
                    }}>{ev.status}</span>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{ev.type}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{ev.description || 'No description.'}</p>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', flexShrink: 0 }}>
                    <Box size={16} color="#10b981" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                    Seized: {new Date(ev.collectedAt).toLocaleDateString('en-IN')}
                  </span>
                  <button
                    onClick={() => setTimelineEv({ id: ev.id, type: ev.type })}
                    style={btnStyle('#34d399','rgba(16,185,129,0.1)','rgba(16,185,129,0.25)')}
                  >
                    <Clock size={11} /> Custody ({ev.custodyEventCount || 1})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Timeline Tab ── */}
      {activeTab === 'timeline' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {auditEvents.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No timeline events yet.
            </div>
          ) : (
            <div style={{ padding: '20px', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '36px', top: '30px', bottom: '30px', width: '2px',
                background: 'linear-gradient(180deg, #3b82f6, #a78bfa, #10b981)',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '52px' }}>
                {auditEvents.slice(0, 20).map((ev, i) => {
                  const dotColor = ACTION_DOT_COLORS[ev.action] || ACTION_DOT_COLORS.default;
                  return (
                    <div key={ev.id} className="animate-slide-in" style={{ position: 'relative', animationDelay: `${i * 40}ms` }}>
                      <div style={{
                        position: 'absolute', left: '-40px', top: '12px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: dotColor, border: '2px solid var(--bg-surface)',
                        boxShadow: `0 0 6px ${dotColor}66`, zIndex: 1,
                        transform: 'translateX(-50%)',
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                          {new Date(ev.createdAt).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {ev.actor?.name || 'System'}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                          color: dotColor, background: `${dotColor}15`,
                          borderRadius: '9999px', padding: '2px 8px',
                        }}>{ev.action}</span>
                        {ev.targetType && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.targetType}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Tab ── */}
      {activeTab === 'audit' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {auditEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No audit events found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Timestamp', 'Action', 'Actor', 'Target', 'Result'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', fontSize: '10px', fontWeight: 700, textAlign: 'left',
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((log, i) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 100ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {log.actor?.name}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {log.targetType || 'DOCUMENT'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                          color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: '9999px', padding: '2px 8px',
                        }}>{log.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Access Tab ── */}
      {activeTab === 'access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)',
          }}>
            📋 Documents from this case that have been shared with other officers. Revocation is available to whoever created the share, or an Admin.
          </div>

          {shares.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Users size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              No documents from this case have been shared yet. Use the Share action on a document to grant access.
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Document', 'Shared With', 'Shared By', 'Permissions', 'Expires', 'Status', ''].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', fontSize: '10px', fontWeight: 700, textAlign: 'left',
                          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                          fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shares.map(s => {
                      const canRevoke = s.status === 'ACTIVE' && (s.createdBy.id === user?.id || user?.role === 'ADMIN');
                      const statusColor = s.status === 'ACTIVE' ? '#10b981' : s.status === 'EXPIRED' ? '#6b7280' : '#ef4444';
                      return (
                        <tr key={s.shareId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.document.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.recipient.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.createdBy.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {[s.canView && 'View', s.canDownload && 'Download'].filter(Boolean).join(' + ')}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                            {new Date(s.expiresAt).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              color: statusColor, background: `${statusColor}20`, border: `1px solid ${statusColor}40`,
                              borderRadius: '9999px', padding: '2px 8px',
                            }}>{s.status}</span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {canRevoke && (
                              <button
                                onClick={() => handleRevokeShare(s.shareId)}
                                disabled={revokingId === s.shareId}
                                style={{
                                  padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
                                  opacity: revokingId === s.shareId ? 0.5 : 1,
                                }}
                              >
                                {revokingId === s.shareId ? 'Revoking...' : 'Revoke'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showUpload && <DocumentUploadModal caseId={caseId} onClose={() => setShowUpload(false)} onSuccess={fetchCaseDetails} />}
      {showEvidence && <EvidenceModal caseId={caseId} onClose={() => setShowEvidence(false)} onSuccess={fetchCaseDetails} />}
      {verifyDoc && <VerificationModal documentId={verifyDoc.id} documentName={verifyDoc.name} onClose={() => setVerifyDoc(null)} />}
      {ledgerDoc && <BlockchainLedgerModal documentId={ledgerDoc.id} documentName={ledgerDoc.name} onClose={() => setLedgerDoc(null)} />}
      {shareDoc && <ShareModal documentId={shareDoc.id} documentName={shareDoc.name} onClose={() => setShareDoc(null)} onSuccess={fetchCaseDetails} />}
      {auditDoc && <DocumentAuditModal documentId={auditDoc.id} documentName={auditDoc.name} onClose={() => setAuditDoc(null)} />}
      {previewDoc && <PreviewModal documentId={previewDoc.id} documentName={previewDoc.name} mimeType={previewDoc.mimeType} onClose={() => setPreviewDoc(null)} />}
      {timelineEv && <EvidenceTimelineModal evidenceId={timelineEv.id} evidenceType={timelineEv.type} onClose={() => setTimelineEv(null)} onCustodyUpdated={fetchCaseDetails} />}
    </div>
  );
};
