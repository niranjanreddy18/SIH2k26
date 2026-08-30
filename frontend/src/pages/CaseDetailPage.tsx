import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Upload, ShieldCheck, Share2, 
  Box, CheckCircle2, XCircle, FileSignature, Lock, 
  RefreshCw, History, AlertTriangle, Eye, Download, Link2, Clock, Send
} from 'lucide-react';
import api from '../services/api';
import { Case, Document, Evidence, AuditEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { VerificationModal } from '../components/VerificationModal';
import { BlockchainLedgerModal } from '../components/BlockchainLedgerModal';
import { EvidenceModal } from '../components/EvidenceModal';
import { EvidenceTimelineModal } from '../components/EvidenceTimelineModal';
import { ShareModal } from '../components/ShareModal';

interface Props {
  caseId: string;
  onBack: () => void;
}

export const CaseDetailPage: React.FC<Props> = ({ caseId, onBack }) => {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'evidence' | 'audit'>('documents');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showUpload, setShowUpload] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState<{ id: string; name: string } | null>(null);
  const [ledgerDoc, setLedgerDoc] = useState<{ id: string; name: string } | null>(null);
  const [shareDoc, setShareDoc] = useState<{ id: string; name: string } | null>(null);
  const [timelineEv, setTimelineEv] = useState<{ id: string; type: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      const caseRes = await api.get(`/cases/${caseId}`);
      if (caseRes.data.success) {
        setCaseData(caseRes.data.data);
      }

      const docRes = await api.get(`/cases/${caseId}/documents`);
      if (docRes.data.success) {
        setDocuments(docRes.data.data.items || []);
      }

      const evRes = await api.get(`/cases/${caseId}/evidence`);
      if (evRes.data.success) {
        setEvidenceList(evRes.data.data.items || []);
      }

      const auditRes = await api.get(`/cases/${caseId}/audit`);
      if (auditRes.data.success) {
        setAuditEvents(auditRes.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load case details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const handleWorkflowAction = async (docId: string, action: 'submit' | 'approve' | 'reject' | 'sign' | 'lock') => {
    try {
      let body = {};
      if (action === 'approve' || action === 'reject') {
        body = { comment: `Action ${action.toUpperCase()} recorded by ${user?.name}` };
      }
      const res = await api.post(`/documents/${docId}/${action}`, body);
      if (res.data.success) {
        alert(`Document successfully updated: ${action.toUpperCase()}`);
        fetchCaseDetails();
      }
    } catch (err: any) {
      alert(`Action failed: ${err.response?.data?.error?.message || err.message}`);
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
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Download failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && !caseData) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-3 text-slate-500 text-xs">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        Loading case file & cryptographic signatures...
      </div>
    );
  }

  if (!caseData) {
    return <div className="p-12 text-center text-xs text-slate-500">Case record not found.</div>;
  }

  const isSeniorOfficer = user?.role === 'SENIOR_OFFICER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 transition-colors shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Cases
      </button>

      {/* Case Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                {caseData.firNumber}
              </span>
              <StatusBadge type="status" value={caseData.status} />
              <StatusBadge type="classification" value={caseData.classification} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">{caseData.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{caseData.description || 'No additional summary recorded.'}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <Upload className="w-4 h-4" /> Add Document
            </button>
            <button
              onClick={() => setShowEvidence(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 transition-colors"
            >
              <Box className="w-4 h-4 text-emerald-600" /> Register Evidence
            </button>
          </div>
        </div>

        {/* Sub-counts Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Crime Type:</span>
            <span className="text-slate-800 ml-2 font-bold">{caseData.crimeType || 'General'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Lead Investigator:</span>
            <span className="text-slate-800 ml-2 font-bold">
              {typeof caseData.createdBy === 'object' ? caseData.createdBy.name : 'Officer'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Documents Hashed:</span>
            <span className="text-blue-600 font-mono font-bold ml-2">{documents.length}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Evidence Tracked:</span>
            <span className="text-emerald-600 font-mono font-bold ml-2">{evidenceList.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> Case Documents ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'evidence'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Box className="w-4 h-4" /> Evidence & Custody Chain ({evidenceList.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" /> Case Audit Trail ({auditEvents.length})
        </button>
      </div>

      {/* ─── Documents Tab Content ─── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="py-16 text-center bg-white p-8 rounded-2xl border border-slate-200 text-xs text-slate-400">
              No documents uploaded for this case yet. Click "Add Document" above to register an investigation file.
            </div>
          ) : (
            documents.map((doc) => {
              const status = doc.currentVersion?.status || 'DRAFT';

              return (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-colors shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 uppercase font-mono">{doc.type}</span>
                        <StatusBadge type="classification" value={doc.classification} />
                        {doc.currentVersion && <StatusBadge type="status" value={doc.currentVersion.status} />}
                        <span className="text-[11px] font-mono font-semibold text-slate-400">v{doc.currentVersion?.versionNo || 1}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                      {doc.currentVersion?.hash && (
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-xl">
                          SHA-256: <span className="text-slate-700 font-semibold">{doc.currentVersion.hash}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setVerifyDoc({ id: doc.id, name: doc.name })}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verify Integrity
                      </button>

                      <button
                        onClick={() => setLedgerDoc({ id: doc.id, name: doc.name })}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Link2 className="w-4 h-4 text-indigo-600" /> Blockchain Blocks
                      </button>

                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.name)}
                        disabled={downloadingId === doc.id}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 text-slate-600" /> {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                      </button>

                      <button
                        onClick={() => setShareDoc({ id: doc.id, name: doc.name })}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-slate-600" /> Share
                      </button>

                      {/* Workflow Transitions */}
                      {status === 'DRAFT' && (
                        <button
                          onClick={() => handleWorkflowAction(doc.id, 'submit')}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Submit for Approval
                        </button>
                      )}

                      {isSeniorOfficer && (status === 'SUBMITTED' || status === 'UNDER_REVIEW') && (
                        <>
                          <button
                            onClick={() => handleWorkflowAction(doc.id, 'approve')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleWorkflowAction(doc.id, 'reject')}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {isSeniorOfficer && status === 'APPROVED' && (
                        <button
                          onClick={() => handleWorkflowAction(doc.id, 'sign')}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-600/20"
                        >
                          <FileSignature className="w-3.5 h-3.5" /> Apply Digital Signature
                        </button>
                      )}

                      {isSeniorOfficer && status === 'SIGNED' && (
                        <button
                          onClick={() => handleWorkflowAction(doc.id, 'lock')}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-600/20"
                        >
                          <Lock className="w-3.5 h-3.5" /> Lock Document
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

      {/* ─── Evidence Tab Content ─── */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {evidenceList.length === 0 ? (
            <div className="py-16 text-center bg-white p-8 rounded-2xl border border-slate-200 text-xs text-slate-400">
              No evidence items logged for this case. Click "Register Evidence" above to record seized physical or digital devices.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceList.map((ev) => (
                <div key={ev.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-colors shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {ev.status}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{ev.type}</h3>
                      <p className="text-xs text-slate-500 mt-1">{ev.description || 'No additional technical specs recorded.'}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                      <Box className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Seized: {new Date(ev.collectedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => setTimelineEv({ id: ev.id, type: ev.type })}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-600" /> Chain of Custody ({ev.custodyEventCount || 1})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Case Audit Trail Tab ─── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {auditEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No audit events found for this case.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Target Type</th>
                    <th className="p-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditEvents.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-blue-600">{log.action}</td>
                      <td className="p-4 font-sans text-slate-800 font-medium">{log.actor?.name}</td>
                      <td className="p-4 text-slate-500">{log.targetType || 'DOCUMENT'}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <DocumentUploadModal
          caseId={caseId}
          onClose={() => setShowUpload(false)}
          onSuccess={fetchCaseDetails}
        />
      )}

      {showEvidence && (
        <EvidenceModal
          caseId={caseId}
          onClose={() => setShowEvidence(false)}
          onSuccess={fetchCaseDetails}
        />
      )}

      {verifyDoc && (
        <VerificationModal
          documentId={verifyDoc.id}
          documentName={verifyDoc.name}
          onClose={() => setVerifyDoc(null)}
        />
      )}

      {ledgerDoc && (
        <BlockchainLedgerModal
          documentId={ledgerDoc.id}
          documentName={ledgerDoc.name}
          onClose={() => setLedgerDoc(null)}
        />
      )}

      {shareDoc && (
        <ShareModal
          documentId={shareDoc.id}
          documentName={shareDoc.name}
          onClose={() => setShareDoc(null)}
          onSuccess={fetchCaseDetails}
        />
      )}

      {timelineEv && (
        <EvidenceTimelineModal
          evidenceId={timelineEv.id}
          evidenceType={timelineEv.type}
          onClose={() => setTimelineEv(null)}
          onCustodyUpdated={fetchCaseDetails}
        />
      )}
    </div>
  );
};
