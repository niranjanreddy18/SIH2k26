import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Upload, ShieldCheck, Share2, 
  Box, CheckCircle2, XCircle, FileSignature, Lock, 
  RefreshCw, History, AlertTriangle, Eye 
} from 'lucide-react';
import api from '../services/api';
import { Case, Document, Evidence, AuditEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { VerificationModal } from '../components/VerificationModal';
import { EvidenceModal } from '../components/EvidenceModal';
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
  const [shareDoc, setShareDoc] = useState<{ id: string; name: string } | null>(null);

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      const caseRes = await api.get(`/cases/${caseId}`);
      if (caseRes.data.success) {
        setCaseData(caseRes.data.data);
      }

      // Fetch documents (simulated by querying or fetching case detail)
      // For demo, fetch document details if present in store
      const sampleDocRes = await api.get(`/documents/doc-1111-1111-1111-111111111111`).catch(() => null);
      if (sampleDocRes && sampleDocRes.data.success) {
        setDocuments([sampleDocRes.data.data]);
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
        body = { comment: `Action ${action} executed by ${user?.name}` };
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

  if (loading || !caseData) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading case details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Cases
      </button>

      {/* Case Header Card */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800">
                {caseData.firNumber}
              </span>
              <StatusBadge type="status" value={caseData.status} />
              <StatusBadge type="classification" value={caseData.classification} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100 mt-2">{caseData.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{caseData.description || 'No additional summary recorded.'}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUpload(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Upload className="w-4 h-4" /> Add Document
            </button>
            <button
              onClick={() => setShowEvidence(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Box className="w-4 h-4 text-emerald-400" /> Register Evidence
            </button>
          </div>
        </div>

        {/* Sub-counts Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500">Crime Type:</span>
            <span className="text-slate-200 ml-2 font-medium">{caseData.crimeType || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500">Registered By:</span>
            <span className="text-slate-200 ml-2 font-medium">
              {typeof caseData.createdBy === 'object' ? caseData.createdBy.name : 'Lead Officer'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Documents Hashed:</span>
            <span className="text-indigo-400 font-mono font-bold ml-2">{caseData.counts?.documents || 1}</span>
          </div>
          <div>
            <span className="text-slate-500">Evidence Items:</span>
            <span className="text-emerald-400 font-mono font-bold ml-2">{caseData.counts?.evidence || 1}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Hashed Case Documents
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'evidence'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" /> Evidence & Custody Chain
        </button>
      </div>

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-400 uppercase font-mono">{doc.type}</span>
                    <StatusBadge type="classification" value={doc.classification} />
                    {doc.currentVersion && <StatusBadge type="status" value={doc.currentVersion.status} />}
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-1">{doc.name}</h3>
                </div>

                {/* Workflow & Verification Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setVerifyDoc({ id: doc.id, name: doc.name })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify Integrity
                  </button>

                  <button
                    onClick={() => setShareDoc({ id: doc.id, name: doc.name })}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>

                  {/* Workflow Action Buttons */}
                  {doc.currentVersion?.status === 'DRAFT' && (
                    <button
                      onClick={() => handleWorkflowAction(doc.id, 'submit')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      Submit for Review
                    </button>
                  )}

                  {(doc.currentVersion?.status === 'SUBMITTED' || doc.currentVersion?.status === 'UNDER_REVIEW') && user?.role === 'SENIOR_OFFICER' && (
                    <>
                      <button
                        onClick={() => handleWorkflowAction(doc.id, 'approve')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleWorkflowAction(doc.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {doc.currentVersion?.status === 'APPROVED' && user?.role === 'SENIOR_OFFICER' && (
                    <button
                      onClick={() => handleWorkflowAction(doc.id, 'sign')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <FileSignature className="w-3.5 h-3.5" /> Sign Document
                    </button>
                  )}

                  {doc.currentVersion?.status === 'SIGNED' && user?.role === 'SENIOR_OFFICER' && (
                    <button
                      onClick={() => handleWorkflowAction(doc.id, 'lock')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" /> Lock & Anchor Ledger
                    </button>
                  )}
                </div>
              </div>

              {/* Version & Fingerprint info */}
              {doc.currentVersion && (
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Current Version: v{doc.currentVersion.versionNo}</span>
                    <span>Uploaded: {new Date(doc.currentVersion.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-300 flex items-center gap-2">
                    <span className="text-slate-500">SHA-256:</span>
                    <span className="text-emerald-400 truncate">{doc.currentVersion.hash}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Evidence Tab Content */}
      {activeTab === 'evidence' && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm">Physical & Digital Evidence Items</h3>
            <button
              onClick={() => setShowEvidence(true)}
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              + Register New Item
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400">Encrypted Solid State Drive (SSD 1TB)</span>
                <p className="text-xs text-slate-400 mt-0.5">Serial #SSD-99482. Extracted from primary command console.</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 text-xs font-mono border border-emerald-800">
                ANALYZED
              </span>
            </div>

            {/* Visual Custody Timeline */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Chain of Custody Timeline
              </div>

              <div className="relative border-l-2 border-slate-800 ml-4 space-y-4 py-2">
                <div className="ml-6 relative">
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900"></div>
                  <div className="text-xs font-semibold text-slate-200">Collected at Crime Scene</div>
                  <div className="text-[11px] text-slate-400">By Inspector Vikram Singh • 10 Aug 2026, 16:00 UTC</div>
                </div>

                <div className="ml-6 relative">
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-900"></div>
                  <div className="text-xs font-semibold text-slate-200">Transferred to Central Forensic Science Lab</div>
                  <div className="text-[11px] text-slate-400">Received by Dr. Ananya Roy • Reason: Forensic image extraction</div>
                </div>
              </div>
            </div>
          </div>
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

      {shareDoc && (
        <ShareModal
          documentId={shareDoc.id}
          documentName={shareDoc.name}
          onClose={() => setShareDoc(null)}
        />
      )}
    </div>
  );
};

