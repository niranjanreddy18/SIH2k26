import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileEdit,
  FileText,
  History,
  Link2,
  Lock,
  Maximize2,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { ClassificationBadge, DocumentStatusBadge, ResultBadge, RoleBadge } from "@/components/slidms/badges";
import { GlassPanel, InfoRow, LoadingBlock, PanelHeader, SectionGlow } from "@/components/slidms/panels";
import { SecureDocumentViewer } from "@/components/slidms/SecureDocumentViewer";
import { VerifyModal } from "@/components/slidms/VerifyModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { formatBytes, formatDateTime, relativeTime, shortHash, titleCase } from "@/lib/slidms/format";
import { MOCK_AUDIT, MOCK_BLOCKCHAIN_RECORDS, MOCK_DIRECTORY, mockDocumentDetail } from "@/lib/slidms/mock";
import type { AuditEvent, VerifyResult } from "@/lib/slidms/types";
import { errorMessage, fileUrl, withFallback } from "@/services/api";
import { blockchainService, documentService, userService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/documents/$docId")({
  head: () => ({
    meta: [
      { title: "Document Integrity & Workflow — SLIDMS" },
      {
        name: "description",
        content:
          "Document lifecycle progression, digital signatures, blockchain anchoring and SHA-256 verification.",
      },
      { property: "og:title", content: "Document Integrity & Workflow — SLIDMS" },
      {
        property: "og:description",
        content: "Trace legal workflow stages from Draft to Signed and Immutable Blockchain Anchor.",
      },
    ],
  }),
  component: DocumentDetailPage,
});

const WORKFLOW_STAGES = [
  { key: "DRAFT", label: "1. Draft", description: "Authoring & upload" },
  { key: "SUBMITTED", label: "2. Submitted", description: "Pending review" },
  { key: "APPROVED", label: "3. Approved", description: "Senior approval" },
  { key: "SIGNED", label: "4. Signed", description: "Cryptographic signature" },
  { key: "LOCKED", label: "5. Locked", description: "Immutable ledger" },
] as const;

function DocumentDetailPage() {
  const { docId } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  // Preview & Modal states
  const [inlinePreview, setInlinePreview] = useState(true);
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Workflow Dialog states
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionComment, setNewVersionComment] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareCanDownload, setShareCanDownload] = useState(true);
  const [shareDays, setShareDays] = useState("7");
  // Version-specific preview: stores the version number the user clicked
  const [versionPreview, setVersionPreview] = useState<{ versionNo: number; hash?: string; mimeType?: string; fileSize?: number } | null>(null);

  // Queries
  const detail = useQuery({
    queryKey: ["document", docId],
    queryFn: () => withFallback(() => documentService.detail(docId), mockDocumentDetail(docId)),
  });

  const audit = useQuery({
    queryKey: ["document", docId, "audit"],
    queryFn: () =>
      withFallback(
        () => (documentService.audit(docId) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_AUDIT.slice(0, 8),
      ),
  });

  const chain = useQuery({
    queryKey: ["document", docId, "records"],
    queryFn: () =>
      withFallback(
        () => blockchainService.records(docId).then((r) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_BLOCKCHAIN_RECORDS,
      ),
  });

  const officers = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => withFallback(() => userService.list(), MOCK_DIRECTORY),
  });

  // Mutations
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["document", docId] });
    qc.invalidateQueries({ queryKey: ["documents"] });
    setPreviewKey((k) => k + 1);
  };

  const submitMutation = useMutation({
    mutationFn: () => documentService.submit(docId),
    onSuccess: () => {
      toast.success("Document submitted for Senior Officer approval");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to submit document")),
  });

  const approveMutation = useMutation({
    mutationFn: () => documentService.approve(docId, approveComment),
    onSuccess: () => {
      toast.success("Document approved successfully");
      setApproveOpen(false);
      setApproveComment("");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to approve document")),
  });

  const rejectMutation = useMutation({
    mutationFn: () => documentService.reject(docId, rejectComment),
    onSuccess: () => {
      toast.success("Document rejected with remarks");
      setRejectOpen(false);
      setRejectComment("");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to reject document")),
  });

  const signMutation = useMutation({
    mutationFn: () => documentService.sign(docId),
    onSuccess: () => {
      toast.success("Document digitally signed & anchored to Hyperledger Fabric");
      setSignOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to sign document")),
  });

  const lockMutation = useMutation({
    mutationFn: () => documentService.lock(docId),
    onSuccess: () => {
      toast.success("Document permanently locked as immutable evidence");
      setLockOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to lock document")),
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (newVersionFile) fd.append("file", newVersionFile);
      if (newVersionComment) fd.append("comment", newVersionComment);
      return documentService.createVersion(docId, fd);
    },
    onSuccess: () => {
      toast.success("New document version uploaded successfully");
      setNewVersionOpen(false);
      setNewVersionFile(null);
      setNewVersionComment("");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to upload version")),
  });

  const tamperMutation = useMutation({
    mutationFn: () => documentService.tamperDemo(docId),
    onSuccess: () => {
      toast.warning("Simulated file corruption in evidence vault! Click 'Verify Integrity' to test hash detection.");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to simulate tampering")),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const days = parseInt(shareDays, 10) || 7;
      const expiry = new Date(Date.now() + days * 86400000).toISOString();
      return documentService.share(docId, {
        recipientId: shareRecipient,
        canView: true,
        canDownload: shareCanDownload,
        expiresAt: expiry,
      });
    },
    onSuccess: () => {
      toast.success("Document shared with officer successfully");
      setShareOpen(false);
      setShareRecipient("");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to share document")),
  });

  const d = detail.data?.data;
  if (detail.isLoading || !d) {
    return (
      <AppShell title="Document">
        <LoadingBlock label="Loading document integrity & workflow data" />
      </AppShell>
    );
  }

  const v = d.currentVersion;
  const currentStatus = v?.status ?? "DRAFT";
  const isSeniorOrAdmin = user?.role === "SENIOR_OFFICER" || user?.role === "ADMIN";
  const isCreator = (v?.createdBy as any)?.id === user?.id || (d.createdBy as any)?.id === user?.id || v?.createdBy?.name === user?.name;
  const isLocked = currentStatus === "LOCKED";
  const isSigned = currentStatus === "SIGNED";

  // Stepper calculations
  const stageOrder: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    UNDER_REVIEW: 1,
    APPROVED: 2,
    SIGNED: 3,
    LOCKED: 4,
    REJECTED: -1,
  };
  const currentStageIndex = stageOrder[currentStatus] ?? 0;

  return (
    <AppShell title={d.name} subtitle={`Document workflow & integrity · v${v.versionNo}`} demo={detail.data?.demo}>
      <SectionGlow />

      {/* Breadcrumb Navigation */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-subtle">
        <Link to="/documents" className="hover:text-primary">
          Documents
        </Link>
        <span>/</span>
        <Link to="/cases/$id" params={{ id: d.caseId ?? "" }} className="mono hover:text-primary">
          {d.caseId}
        </Link>
        <span>/</span>
        <span className="truncate font-medium text-foreground">{d.name}</span>
      </nav>

      {/* ─── Workflow Progression Stepper ───────────────────────────────── */}
      <GlassPanel className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Document Lifecycle Stage
            </span>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {currentStatus === "REJECTED" ? "Rejected (Revision Required)" : titleCase(currentStatus)}
              </h2>
              <DocumentStatusBadge status={currentStatus} />
              <ClassificationBadge classification={d.classification} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Active Version:</span>
            <span className="mono rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              v{v.versionNo}
            </span>
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const isPassed = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx && currentStatus !== "REJECTED";
            return (
              <div
                key={stage.key}
                className={`relative flex flex-col rounded-lg border p-2.5 transition-colors ${
                  isCurrent
                    ? "border-primary/60 bg-primary/15 shadow-sm"
                    : isPassed
                    ? "border-verified/40 bg-verified/8"
                    : "border-border/60 bg-background-raised/40 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`mono text-[10px] font-bold ${
                      isCurrent
                        ? "text-primary"
                        : isPassed
                        ? "text-verified"
                        : "text-muted-foreground"
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  {isPassed ? (
                    <Check className="size-3.5 text-verified" />
                  ) : isCurrent ? (
                    <span className="flex size-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <Clock className="size-3 text-subtle" />
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.label.split(". ")[1]}</p>
                <p className="text-[10px] text-muted-foreground">{stage.description}</p>
              </div>
            );
          })}
        </div>

        {/* Rejection Alert if applicable */}
        {currentStatus === "REJECTED" ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            <AlertOctagon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Reviewer Rejected this Version</p>
              <p className="mt-0.5 text-[11px] text-danger/90">
                {v.comment ? `Remarks: "${v.comment}"` : "Please review the feedback, upload a corrected revision, and re-submit."}
              </p>
            </div>
          </div>
        ) : null}
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* ─── Left Column: Viewer, Versions & Audit ──────────────────────── */}
        <div className="space-y-4">
          {/* Secure Document Previewer */}
          <GlassPanel>
            <PanelHeader
              title={d.name}
              subtitle={`${titleCase(d.type)} · ${formatBytes(v.fileSize)}`}
              icon={FileText}
              action={
                <div className="flex items-center gap-1.5">
                  <DocumentStatusBadge status={v.status} />
                  <ClassificationBadge classification={d.classification} />
                </div>
              }
            />
            <div className="p-4">
              <SecureDocumentViewer
                documentId={d.id}
                documentName={d.name}
                versionNo={v.versionNo}
                mimeType={v.mimeType}
                fileSize={v.fileSize}
                hash={v.hash}
                onExpand={() => setModalPreviewOpen(true)}
              />
            </div>
          </GlassPanel>

          {/* Version Lineage Table */}
          <GlassPanel>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Version Lineage</h3>
              </div>
              {!isLocked && !isSigned ? (
                <button
                  onClick={() => setNewVersionOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  <Upload className="size-3" /> Upload v{v.versionNo + 1}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">Lineage locked</span>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {d.versionHistory.map((ver) => {
                const isCurrent = ver.versionNo === v.versionNo;
                return (
                  <div key={ver.versionNo} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`mono rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                          isCurrent
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border bg-background-raised text-muted-foreground"
                        }`}
                      >
                        v{ver.versionNo}
                        {isCurrent && <span className="ml-1 text-[9px] uppercase tracking-wide">current</span>}
                      </span>
                      <DocumentStatusBadge status={ver.status} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="mono truncate text-[11px] text-chain" title={ver.hash}>
                        {ver.hash}
                      </span>
                      {ver.comment && (
                        <span className="truncate text-[10px] italic text-muted-foreground">"{ver.comment}"</span>
                      )}
                    </div>
                    <span className="mono shrink-0 text-[10px] text-subtle">{formatDateTime(ver.createdAt)}</span>
                    <div className="flex items-center gap-1.5">
                      {/* Preview this exact version */}
                      <button
                        type="button"
                        onClick={() => {
                          const p: { versionNo: number; hash?: string; mimeType?: string; fileSize?: number } = {
                            versionNo: ver.versionNo,
                            ...(ver.hash !== undefined && { hash: ver.hash }),
                            ...(ver.mimeType !== undefined && { mimeType: ver.mimeType }),
                            ...(ver.fileSize !== undefined && { fileSize: ver.fileSize }),
                          };
                          setVersionPreview(p);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
                        title={`Preview version ${ver.versionNo}`}
                      >
                        <Eye className="size-3" /> Preview
                      </button>
                      {/* Download this exact version */}
                      <a
                        href={fileUrl(documentService.versionDownloadPath(d.id, ver.versionNo))}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                        title={`Download version ${ver.versionNo}`}
                      >
                        <Download className="size-3" /> v{ver.versionNo}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Audit Trail Log */}
          <GlassPanel>
            <PanelHeader title="Document Audit Trail" icon={Activity} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Actor</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Result</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.data?.data ?? []).map((e: AuditEvent) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0">
                      <td className="mono px-4 py-2.5 text-[11px] text-muted-foreground">
                        {relativeTime(e.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{e.actorName}</td>
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                        {titleCase(e.action)}
                      </td>
                      <td className="px-4 py-2.5">
                        <ResultBadge result={e.result} />
                      </td>
                      <td className="mono px-4 py-2.5 text-right text-[10px] text-chain">
                        {shortHash(e.eventHash, 6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>

        {/* ─── Right Column: Workflow Control Center & Integrity ──────────── */}
        <div className="space-y-4">
          {/* 1. Workflow Actions Control Center */}
          <GlassPanel glow className="border-primary/30">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <Stamp className="size-4" /> Workflow Actions
                </span>
                <RoleBadge role={user?.role ?? "INVESTIGATOR"} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Role-gated lifecycle controls and transitions
              </p>
            </div>

            <div className="space-y-3 p-4">
              {/* STAGE 1: DRAFT or REJECTED */}
              {(currentStatus === "DRAFT" || currentStatus === "REJECTED") && (
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/8 p-3">
                  <p className="text-xs font-semibold text-foreground">Next Step: Submit for Review</p>
                  <p className="text-[11px] text-muted-foreground">
                    Submits this version to Senior Officers for verification and legal approval.
                  </p>
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="glow-primary inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="size-3.5" /> Submit for Approval
                  </button>
                </div>
              )}

              {/* STAGE 2: SUBMITTED / UNDER_REVIEW */}
              {(currentStatus === "SUBMITTED" || currentStatus === "UNDER_REVIEW") && (
                <div className="space-y-3 rounded-lg border border-pending/40 bg-pending/8 p-3">
                  <div>
                    <p className="text-xs font-semibold text-pending">Next Step: Senior Officer Approval</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Senior officers must verify the document contents before it can be digitally signed.
                    </p>
                  </div>

                  {isSeniorOrAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setApproveOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-verified/50 bg-verified/15 text-xs font-bold text-verified hover:bg-verified/25"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectOpen(true)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-danger/50 bg-danger/15 text-xs font-bold text-danger hover:bg-danger/25"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-background-deep p-2 text-[11px] text-muted-foreground">
                      <UserCheck className="mb-1 size-3.5 text-primary" />
                      Requires <strong>Senior Officer</strong> role to approve or reject. Switch persona at login to test.
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 3: APPROVED */}
              {currentStatus === "APPROVED" && (
                <div className="space-y-3 rounded-lg border border-signed/40 bg-signed/8 p-3">
                  <div>
                    <p className="text-xs font-semibold text-signed">Next Step: Digital Signature</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Approve state verified. Applying a digital signature generates a cryptographic proof anchored to Hyperledger Fabric.
                    </p>
                  </div>

                  {isSeniorOrAdmin ? (
                    <button
                      onClick={() => setSignOpen(true)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-signed/50 bg-signed/20 text-xs font-bold text-signed hover:bg-signed/30"
                    >
                      <Stamp className="size-3.5" /> Digitally Sign & Anchor
                    </button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Awaiting digital signature from a Senior Officer.
                    </p>
                  )}
                </div>
              )}

              {/* STAGE 4: SIGNED */}
              {currentStatus === "SIGNED" && (
                <div className="space-y-3 rounded-lg border border-pending/40 bg-pending/8 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Next Step: Lock Document</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Digitally signed by <strong>{d.signedBy?.name ?? "Senior Officer"}</strong>. Locking will make this record permanently immutable.
                    </p>
                  </div>

                  {isSeniorOrAdmin ? (
                    <button
                      onClick={() => setLockOpen(true)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-pending/50 bg-pending/20 text-xs font-bold text-pending hover:bg-pending/30"
                    >
                      <Lock className="size-3.5" /> Lock (Make Immutable)
                    </button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Awaiting Senior Officer to finalize lock state.
                    </p>
                  )}
                </div>
              )}

              {/* STAGE 5: LOCKED */}
              {currentStatus === "LOCKED" && (
                <div className="rounded-lg border border-verified/40 bg-verified/10 p-3 text-center">
                  <div className="mx-auto grid size-10 place-items-center rounded-full bg-verified/20 text-verified">
                    <Lock className="size-5" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-verified">Permanently Immutable</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    This document is cryptographically locked and committed to the Hyperledger Fabric ledger. No further edits or status changes are permitted.
                  </p>
                </div>
              )}

              {/* Secondary Actions: Version Upload & Sharing */}
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Collaboration & Versions
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewVersionOpen(true)}
                    disabled={isLocked || isSigned}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background-raised px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-background-raised/80 disabled:opacity-40"
                  >
                    <FileEdit className="size-3.5 text-primary" /> New Version
                  </button>
                  <button
                    onClick={() => setShareOpen(true)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background-raised px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-background-raised/80"
                  >
                    <Share2 className="size-3.5 text-chain" /> Share Access
                  </button>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* 2. Cryptographic Integrity & Tamper Testing */}
          <GlassPanel glow>
            <PanelHeader title="Integrity & Blockchain" subtitle="SHA-256 Ledger Verification" icon={ShieldCheck} />
            <div className="space-y-3 p-4">
              <div className="rounded-lg border border-chain/30 bg-chain/8 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-chain">
                  Registered SHA-256 Hash
                </p>
                <p className="mono mt-1 break-all text-[11px] leading-relaxed text-foreground">
                  {v.hash}
                </p>
              </div>

              <button
                onClick={async () => {
                  setVerifyOpen(true);
                  const res = await withFallback<VerifyResult>(() => documentService.verify(d.id), {
                    status: "VERIFIED",
                    registeredHash: v.hash,
                    currentHash: v.hash,
                    blockchainRef: d.blockchainRef ?? "fabric://slidms/doc-anchor",
                    verifiedAt: new Date().toISOString(),
                  });
                  setVerifyResult(res.data);
                }}
                className="glow-primary inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-xs font-bold text-primary-foreground"
              >
                <ShieldCheck className="size-4" /> Verify Hash Integrity
              </button>

              <InfoRow label="Algorithm" value="SHA-256" mono />
              <InfoRow label="Uploaded By" value={v.createdBy?.name ?? "—"} />
              <InfoRow label="Uploaded At" value={formatDateTime(v.createdAt)} mono />
              <InfoRow label="Signed By" value={d.signedBy?.name ?? "Not signed"} />
              <InfoRow
                label="Last Verified"
                value={d.verifiedAt ? formatDateTime(d.verifiedAt) : "Never"}
                mono
              />

              {/* Live Tamper Simulation Tool */}
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/8 p-3">
                <p className="flex items-center gap-1 text-[11px] font-bold text-danger">
                  <ShieldAlert className="size-3.5" /> Tamper-Evident Demo
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Simulate raw byte tampering in the vault to demonstrate blockchain mismatch detection.
                </p>
                <button
                  onClick={() => tamperMutation.mutate()}
                  disabled={tamperMutation.isPending}
                  className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-danger/40 bg-danger/15 text-[11px] font-semibold text-danger hover:bg-danger/25 disabled:opacity-50"
                >
                  <AlertTriangle className="size-3" /> Simulate Vault Tampering
                </button>
              </div>
            </div>
          </GlassPanel>

          {/* 3. Blockchain Anchor Details */}
          <GlassPanel>
            <PanelHeader title="Blockchain Records" subtitle="Hyperledger Fabric Channel" icon={Link2} />
            <div className="space-y-2 p-4">
              <InfoRow label="Blockchain Ref" value={d.blockchainRef ?? "Pending"} mono />
              {(chain.data?.data ?? []).map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-background-raised/60 p-2.5">
                  <p className="mono text-[10px] text-chain">{shortHash(r.txReference, 10)}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {titleCase(r.action)} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* ─── MODALS & DIALOGS ───────────────────────────────────────────── */}

      {/* 1. Verify Modal */}
      <VerifyModal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        result={verifyResult}
        documentName={d.name}
      />

      {/* 2. Fullscreen Preview Dialog */}
      <Dialog open={modalPreviewOpen} onOpenChange={setModalPreviewOpen}>
        <DialogContent className="flex h-[92vh] max-w-6xl flex-col overflow-hidden border-border bg-card p-0 text-foreground">
          <SecureDocumentViewer
            documentId={d.id}
            documentName={d.name}
            versionNo={v.versionNo}
            mimeType={v.mimeType}
            fileSize={v.fileSize}
            hash={v.hash}
            heightClass="h-[84vh]"
            showControls={true}
          />
        </DialogContent>
      </Dialog>

      {/* 3. Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-verified">
              <CheckCircle2 className="size-5" /> Approve Document
            </DialogTitle>
            <DialogDescription>
              Confirming legal review for <strong>{d.name} (v{v.versionNo})</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-foreground">Approval Note (Optional)</label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="e.g., Reviewed against FIR forensic standards and cleared for signature."
              className="h-20 w-full rounded-lg border border-input bg-background-raised p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setApproveOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-verified/50 bg-verified px-3 py-1.5 text-xs font-bold text-verified-foreground disabled:opacity-50"
            >
              Confirm Approval
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <XCircle className="size-5" /> Reject Document Version
            </DialogTitle>
            <DialogDescription>
              Please provide feedback on why version <strong>v{v.versionNo}</strong> is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-foreground">Rejection Reason (Required)</label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g., Missing chain-of-custody stamp or forensic annexure."
              className="h-20 w-full rounded-lg border border-input bg-background-raised p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-danger"
            />
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectComment.trim() || rejectMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/50 bg-danger px-3 py-1.5 text-xs font-bold text-danger-foreground disabled:opacity-50"
            >
              Reject Version
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Digitally Sign Dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-signed">
              <Stamp className="size-5" /> Digital Signature & Blockchain Anchor
            </DialogTitle>
            <DialogDescription>
              Applying digital stamp to <strong>{d.name}</strong> as <strong>{user?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 rounded-lg border border-border bg-background-deep p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signer:</span>
              <span className="font-semibold text-foreground">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-semibold text-signed">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document SHA-256:</span>
              <span className="mono text-chain">{shortHash(v.hash, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Network:</span>
              <span className="mono text-foreground">Hyperledger Fabric (slidms-channel)</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setSignOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-signed/50 bg-signed px-3 py-1.5 text-xs font-bold text-signed-foreground disabled:opacity-50"
            >
              Sign & Anchor On-Chain
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Lock Dialog */}
      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pending">
              <Lock className="size-5" /> Permanent Immutability Lock
            </DialogTitle>
            <DialogDescription>
              Locking document <strong>{d.name}</strong> will prevent any further edits, versions, or status changes forever.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-pending/30 bg-pending/10 p-3 text-xs text-pending">
            <p className="font-semibold">⚠️ Legal Evidence Rule</p>
            <p className="mt-1 text-[11px] text-pending/90">
              Once locked, the state is permanently frozen on the blockchain for courtroom presentation.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setLockOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pending/50 bg-pending px-3 py-1.5 text-xs font-bold text-pending-foreground disabled:opacity-50"
            >
              Lock Document
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. New Version Upload Dialog */}
      <Dialog open={newVersionOpen} onOpenChange={setNewVersionOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" /> Upload Version v{v.versionNo + 1}
            </DialogTitle>
            <DialogDescription>
              Create a new version for <strong>{d.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">File</label>
              <input
                type="file"
                onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                className="mt-1 w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Version Comments</label>
              <input
                type="text"
                value={newVersionComment}
                onChange={(e) => setNewVersionComment(e.target.value)}
                placeholder="e.g., Added forensic lab signature page"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setNewVersionOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Upload Version
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Share Document Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-chain" /> Share Document
            </DialogTitle>
            <DialogDescription>
              Grant temporary, audited access to another officer or forensic analyst.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Recipient Officer</label>
              <select
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select an officer...</option>
                {(officers.data?.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.department || o.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Validity (Days)</label>
                <select
                  value={shareDays}
                  onChange={(e) => setShareDays(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground"
                >
                  <option value="1">24 Hours</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={shareCanDownload}
                    onChange={(e) => setShareCanDownload(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  Allow Download
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShareOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => shareMutation.mutate()}
              disabled={!shareRecipient || shareMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Grant Access
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Preview Dialog — shows the exact binary for a chosen historical version */}
      <Dialog open={Boolean(versionPreview)} onOpenChange={(open) => !open && setVersionPreview(null)}>
        <DialogContent className="flex h-[94vh] max-w-6xl flex-col overflow-hidden border-border bg-card p-0 text-foreground">
          {versionPreview && (
            <>
              {/* Modal Header */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="mono rounded-md border border-primary/50 bg-primary/15 px-2.5 py-1 text-sm font-bold text-primary">
                    v{versionPreview.versionNo}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                    <p className="mono truncate text-[11px] text-chain" title={versionPreview.hash}>
                      SHA-256: {versionPreview.hash ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {versionPreview.versionNo === v.versionNo && (
                    <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Current Version
                    </span>
                  )}
                  <a
                    href={fileUrl(documentService.versionDownloadPath(d.id, versionPreview.versionNo))}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Download className="size-3.5" /> Download v{versionPreview.versionNo}
                  </a>
                </div>
              </div>
              {/* Viewer body */}
              <div className="flex-1 overflow-hidden p-4">
                <SecureDocumentViewer
                  documentId={d.id}
                  documentName={`${d.name} — v${versionPreview.versionNo}`}
                  versionNo={versionPreview.versionNo}
                  mimeType={versionPreview.mimeType}
                  fileSize={versionPreview.fileSize}
                  hash={versionPreview.hash}
                  heightClass="h-[78vh]"
                  showControls={true}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>

  );
}
