import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  FileStack,
  FileText,
  Link2,
  Lock,
  Plus,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Stamp,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import {
  CaseStatusBadge,
  ClassificationBadge,
  DocumentStatusBadge,
  EvidenceStatusBadge,
  ResultBadge,
  RoleBadge,
} from "@/components/slidms/badges";
import {
  EmptyState,
  GlassPanel,
  InfoRow,
  LoadingBlock,
  PanelHeader,
  SectionGlow,
} from "@/components/slidms/panels";
import { SecureDocumentViewer } from "@/components/slidms/SecureDocumentViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { countdown, formatDate, formatDateTime, relativeTime, shortHash, titleCase } from "@/lib/slidms/format";
import {
  MOCK_ASSIGNMENTS,
  MOCK_AUDIT,
  MOCK_CUSTODY,
  MOCK_DIRECTORY,
  MOCK_DOCUMENTS,
  MOCK_EVIDENCE,
  MOCK_SHARES,
  mockCaseDetail,
} from "@/lib/slidms/mock";
import type {
  DocumentItem,
  EvidenceItem,
  CaseAssignment,
  AuditEvent,
  SharedDocument,
} from "@/lib/slidms/types";
import { errorMessage, fileUrl, withFallback } from "@/services/api";
import {
  CASE_DETAIL_CONTRACT,
  CASE_DOCUMENT_CONTRACT,
  inspectApiError,
  logContractMismatch,
  missingPaths,
} from "@/lib/slidms/debug";
import { caseService, documentService, evidenceService, shareService, userService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case Workspace — SLIDMS" },
      {
        name: "description",
        content:
          "Case workspace with documents, evidence chain of custody, timeline, audit events and access control.",
      },
      { property: "og:title", content: "Case Workspace — SLIDMS" },
      {
        property: "og:description",
        content: "Full case file: documents, evidence, timeline, audit trail and assigned officers.",
      },
    ],
  }),
  component: CaseDetailPage,
  errorComponent: ({ error }) => (
    <AppShell title="Case Workspace">
      <GlassPanel className="p-6">
        <h2 className="text-sm font-semibold text-foreground">Unable to open this case</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Unexpected response from the backend."}
        </p>
      </GlassPanel>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Case Workspace">
      <GlassPanel className="p-6">
        <p className="text-xs text-muted-foreground">This case could not be found.</p>
      </GlassPanel>
    </AppShell>
  ),
});

function asArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  return [];
}

function CaseDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState("overview");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Sharing & Assignment Modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAssignUserId, setSelectedAssignUserId] = useState("");

  const [shareDocOpen, setShareDocOpen] = useState(false);
  const [shareDocId, setShareDocId] = useState("");
  const [shareRecipientId, setShareRecipientId] = useState("");
  const [shareCanDownload, setShareCanDownload] = useState(true);
  const [shareDays, setShareDays] = useState("7");

  // Queries
  const detail = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      try {
        return await withFallback(() => caseService.detail(id), mockCaseDetail(id));
      } catch (error) {
        logContractMismatch({
          label: `GET /cases/${id} request failed with live backend`,
          expected: CASE_DETAIL_CONTRACT,
          payload: { error: String(error) },
        });
        throw error;
      }
    },
  });

  const docs = useQuery({
    queryKey: ["case", id, "documents"],
    queryFn: () =>
      withFallback(
        () => documentService.listForCase(id).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_DOCUMENTS.filter((d) => d.caseId === id),
      ),
  });

  const evidence = useQuery({
    queryKey: ["case", id, "evidence"],
    queryFn: () =>
      withFallback(
        () => evidenceService.list(id).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_EVIDENCE.filter((e) => e.caseId === id),
      ),
  });

  const assignments = useQuery({
    queryKey: ["case", id, "assignments"],
    queryFn: () => withFallback(() => caseService.assignments(id), MOCK_ASSIGNMENTS),
  });

  const audit = useQuery({
    queryKey: ["case", id, "audit"],
    queryFn: () =>
      withFallback(
        () => (caseService.audit(id) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_AUDIT.slice(0, 12),
      ),
  });

  const shares = useQuery({
    queryKey: ["case", id, "shares"],
    queryFn: () =>
      withFallback(
        () => (caseService.shares(id) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_SHARES.slice(0, 4),
      ),
  });

  const officers = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => withFallback(() => userService.list(), MOCK_DIRECTORY),
  });

  // Mutations
  const invalidateAccess = () => {
    qc.invalidateQueries({ queryKey: ["case", id, "assignments"] });
    qc.invalidateQueries({ queryKey: ["case", id, "shares"] });
    qc.invalidateQueries({ queryKey: ["case", id] });
    qc.invalidateQueries({ queryKey: ["cases"] });
  };

  const assignOfficerMutation = useMutation({
    mutationFn: () => caseService.assign(id, selectedAssignUserId),
    onSuccess: () => {
      toast.success("Officer assigned to case successfully");
      setAssignOpen(false);
      setSelectedAssignUserId("");
      invalidateAccess();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to assign officer to case")),
  });

  const unassignOfficerMutation = useMutation({
    mutationFn: (userId: string) => caseService.unassign(id, userId),
    onSuccess: () => {
      toast.success("Officer unassigned from case");
      invalidateAccess();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to unassign officer")),
  });

  const shareCaseDocMutation = useMutation({
    mutationFn: async () => {
      const days = parseInt(shareDays, 10) || 7;
      const expiry = new Date(Date.now() + days * 86400000).toISOString();
      return documentService.share(shareDocId, {
        recipientId: shareRecipientId,
        canView: true,
        canDownload: shareCanDownload,
        expiresAt: expiry,
      });
    },
    onSuccess: () => {
      toast.success("Case document shared successfully");
      setShareDocOpen(false);
      setShareDocId("");
      setShareRecipientId("");
      invalidateAccess();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to share document")),
  });

  const revokeShareMutation = useMutation({
    mutationFn: (shareId: string) => shareService.revoke(shareId),
    onSuccess: () => {
      toast.success("Access grant revoked");
      invalidateAccess();
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to revoke access")),
  });

  const c = detail.data?.data;
  const documents = asArray<DocumentItem>(docs.data?.data);
  const evidenceRows = asArray<EvidenceItem>(evidence.data?.data);
  const assignmentRows = asArray<CaseAssignment>(assignments.data?.data);
  const auditRows = asArray<AuditEvent>(audit.data?.data);
  const shareRows = asArray<any>(shares.data?.data);
  const counts = (c?.counts ?? {}) as Partial<NonNullable<typeof c>["counts"]>;

  const assignedUserIds = new Set(assignmentRows.map((a) => a.id));
  const availableOfficers = (officers.data?.data ?? []).filter((o) => !assignedUserIds.has(o.id));

  // ─── Permission model ───────────────────────────────────────────────────────
  // Only the case creator, ADMINs, and SENIOR_OFFICERs who are assigned to the
  // case may manage team membership, share documents, or revoke access grants.
  // Officers with other roles (INVESTIGATOR, FORENSIC_OFFICER) that are part of
  // the team can view everything but cannot alter access.
  // Recipients who received a shared document are NOT part of the assigned team
  // and therefore have strictly read-only access to this workspace.
  const isCaseCreator = Boolean(c?.createdBy?.id && user?.id && c.createdBy.id === user.id);
  const isAssignedOfficer = assignmentRows.some((a) => a.id === user?.id);
  const isAdminOrSenior = user?.role === "ADMIN" || user?.role === "SENIOR_OFFICER";
  // Can manage = must be on the assigned team AND (creator OR elevated role)
  const canManageCase = isAssignedOfficer && (isCaseCreator || isAdminOrSenior);
  // Can view access tab = at least an assigned team member (not bare recipient)
  const canViewAccessTab = isAssignedOfficer || isCaseCreator;

  useEffect(() => {
    if (!c) return;
    const missing = missingPaths(c, CASE_DETAIL_CONTRACT);
    if (missing.length) {
      logContractMismatch({
        label: `GET /cases/${id} payload is missing fields the UI reads`,
        expected: CASE_DETAIL_CONTRACT,
        payload: c,
      });
    }
  }, [c, id]);

  if (detail.isError) {
    return (
      <AppShell title="Case Workspace">
        <GlassPanel className="p-6">
          <h2 className="text-sm font-semibold text-foreground">Could not load this case</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {errorMessage(detail.error, "The backend rejected the request for this case.")}
          </p>
          <Link
            to="/cases"
            className="mt-4 inline-block rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Back to cases
          </Link>
        </GlassPanel>
      </AppShell>
    );
  }

  if (detail.isLoading || !c) {
    return (
      <AppShell title="Case Workspace">
        <LoadingBlock label="Opening case file" />
      </AppShell>
    );
  }

  return (
    <AppShell title={c.title} subtitle={`Case workspace · ${c.firNumber}`} demo={detail.data?.demo}>
      <SectionGlow />

      <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-subtle">
        <Link to="/cases" className="hover:text-primary">
          Cases
        </Link>
        <span>/</span>
        <span className="mono text-muted-foreground">{c.firNumber}</span>
      </nav>

      {/* Case Header Banner with Quick Actions */}
      <GlassPanel className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{c.title}</h2>
              <CaseStatusBadge status={c.status} />
              <ClassificationBadge classification={c.classification} />
            </div>
            <p className="mono mt-1 text-xs text-primary">{c.firNumber}</p>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {c.description ?? "No description recorded."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            {/* Management actions — only for assigned managers / admins */}
            {canManageCase && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("access");
                    setAssignOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <UserPlus className="size-3.5" /> Assign Officer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("access");
                    if (documents.length > 0 && documents[0]?.id) {
                      setShareDocId(documents[0].id);
                    }
                    setShareDocOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-chain/40 bg-chain/10 px-2.5 py-1.5 text-xs font-semibold text-chain transition-colors hover:bg-chain/20"
                >
                  <Share2 className="size-3.5" /> Share Document
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-1.5">
              {assignmentRows.map((a) => (
                <span
                  key={a.id}
                  className="rounded-lg border border-border bg-background-raised px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {a.name} {a.isCreator ? "★" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap bg-background-raised">
          {["overview", "documents", "evidence", "timeline", "audit"].map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">
              {t}
            </TabsTrigger>
          ))}
          {/* Access tab is only visible to assigned team members — not recipients */}
          {canViewAccessTab && (
            <TabsTrigger value="access" className="text-xs">
              Access &amp; Collaboration
            </TabsTrigger>
          )}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <GlassPanel>
            <PanelHeader title="Case Metadata" icon={FileText} />
            <div className="px-4 py-2">
              <InfoRow label="FIR Number" value={c.firNumber} mono />
              <InfoRow label="Crime Type" value={c.crimeType ?? "—"} />
              <InfoRow label="Status" value={<CaseStatusBadge status={c.status} />} />
              <InfoRow
                label="Classification"
                value={<ClassificationBadge classification={c.classification} />}
              />
              <InfoRow label="Registered By" value={c.createdBy?.name ?? "—"} />
              <InfoRow label="Registered On" value={formatDateTime(c.createdAt)} mono />
              <InfoRow label="Last Updated" value={formatDateTime(c.updatedAt ?? c.createdAt)} mono />
            </div>
          </GlassPanel>

          <GlassPanel glow>
            <PanelHeader title="Security & Case Summary" subtitle="Integrity & traceability" icon={ShieldCheck} />
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              <Count label="Documents" value={counts.documents ?? documents.length} icon={FileText} tone="text-primary" />
              <Count label="Evidence" value={counts.evidence ?? evidenceRows.length} icon={FileStack} tone="text-chain" />
              <Count
                label="Pending Approvals"
                value={counts.pendingApprovals ?? 0}
                icon={Stamp}
                tone="text-pending"
              />
              <Count label="Audit Events" value={counts.auditEvents ?? auditRows.length} icon={Activity} tone="text-verified" />
              <Count
                label="Assigned Team"
                value={assignmentRows.length}
                icon={Users}
                tone="text-primary"
              />
              <Count
                label="Shared Grants"
                value={shareRows.length}
                icon={Share2}
                tone="text-signed"
              />
            </div>
          </GlassPanel>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <GlassPanel>
            <PanelHeader
              title="Case Documents"
              subtitle={`${documents.length} documents · version controlled`}
              icon={FileText}
              action={
                <Link
                  to="/documents"
                  className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Document center
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-2.5 text-left font-semibold">Document</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Classification</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Ver.</th>
                    <th className="px-4 py-2.5 text-left font-semibold">SHA-256</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Updated</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-primary/6"
                    >
                      <td className="max-w-[260px] px-4 py-3">
                        <Link
                          to="/documents/$docId"
                          params={{ docId: d.id }}
                          className="block truncate text-xs font-medium text-foreground hover:text-primary"
                        >
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {titleCase(d.type ?? "")}
                      </td>
                      <td className="px-4 py-3">
                        <DocumentStatusBadge status={d.currentVersion?.status ?? "DRAFT"} />
                      </td>
                      <td className="px-4 py-3">
                        <ClassificationBadge classification={d.classification} />
                      </td>
                      <td className="mono px-4 py-3 text-[11px] text-muted-foreground">
                        v{d.currentVersion?.versionNo ?? 1}
                      </td>
                      <td className="mono px-4 py-3 text-[11px] text-chain">
                        {shortHash(d.currentVersion?.hash, 6)}
                      </td>
                      <td className="mono px-4 py-3 text-right text-[11px] text-muted-foreground">
                        {relativeTime(d.currentVersion?.createdAt ?? d.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                            title="Preview document in secure viewer"
                          >
                            <Eye className="size-3" /> Preview
                          </button>
                          <a
                            href={fileUrl(documentService.downloadPath(d.id))}
                            className="inline-flex items-center rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background-raised hover:text-foreground"
                            title="Download file"
                          >
                            <Download className="size-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </TabsContent>

        {/* EVIDENCE TAB */}
        <TabsContent value="evidence">
          <GlassPanel>
            <PanelHeader title="Evidence Register" subtitle="Chain of custody tracked" icon={FileStack} />
            <div className="divide-y divide-border/50">
              {evidenceRows.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{e.description}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {titleCase(e.type)} · Collected {formatDateTime(e.collectedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EvidenceStatusBadge status={e.status} />
                    <span className="mono text-[11px] text-chain">{shortHash((e as any).hash ?? (e as any).currentHash ?? e.id, 6)}</span>
                  </div>
                </div>
              ))}
              {evidenceRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No evidence registered for this case yet.
                </p>
              ) : null}
            </div>
          </GlassPanel>
        </TabsContent>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline">
          <GlassPanel>
            <PanelHeader title="Chain of Custody Timeline" subtitle="Verifiable handover chain" icon={Link2} />
            <ol className="space-y-3 p-4">
              {MOCK_CUSTODY.map((event) => (
                <li key={event.id} className="relative flex gap-3 text-xs">
                  <span className="mt-1 flex size-2.5 shrink-0 rounded-full border border-chain bg-chain/30" />
                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-background-raised/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{titleCase(event.action)}</p>
                      <span className="mono text-[10px] text-subtle">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{event.reason}</p>
                    <p className="mono mt-1.5 text-[10px] text-chain">
                      {event.fromUser?.name ? `${event.fromUser.name} → ` : ""}
                      {event.toUser?.name ?? "—"} · {shortHash(event.hash, 8)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </GlassPanel>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit">
          <GlassPanel>
            <PanelHeader title="Case Audit Trail" subtitle="Hash-chained events" icon={Activity} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Actor</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Result</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Event Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-primary/6">
                      <td className="mono px-4 py-2.5 text-[11px] text-muted-foreground">
                        {formatDateTime(e.createdAt)}
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
        </TabsContent>

        {/* ACCESS & COLLABORATION TAB */}
        <TabsContent value="access" className="grid gap-4 lg:grid-cols-2">
          {/* 1. Assigned Officers (Team Members) */}
          <GlassPanel glow>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Users className="size-4 text-primary" /> Assigned Officers ({assignmentRows.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Officers with full case read, write, and evidence permissions
                </p>
              </div>
              {canManageCase && (
                <button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <UserPlus className="size-3" /> Assign Officer
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {assignmentRows.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {a.name}
                      {a.isCreator ? (
                        <span className="ml-2 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase font-bold text-primary">
                          Lead Creator
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.email} · {a.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={a.role} />
                    {/* Only case managers can unassign — and never the lead creator */}
                    {canManageCase && !a.isCreator && (
                      <button
                        type="button"
                        onClick={() => unassignOfficerMutation.mutate(a.id)}
                        disabled={unassignOfficerMutation.isPending}
                        className="rounded-md border border-danger/30 p-1 text-danger/80 hover:bg-danger/10 hover:text-danger"
                        title="Unassign officer from case"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {assignmentRows.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No officers assigned yet.
                </p>
              )}
            </div>
          </GlassPanel>

          {/* 2. Shared Documents (Temporary & External Access) */}
          <GlassPanel glow>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Share2 className="size-4 text-chain" /> Shared Documents ({shareRows.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Time-bound, audited document access grants
                </p>
              </div>
              {canManageCase && (
                <button
                  type="button"
                  onClick={() => {
                    if (documents.length > 0 && documents[0]?.id) setShareDocId(documents[0].id);
                    setShareDocOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-chain/40 bg-chain/10 px-2.5 py-1 text-xs font-semibold text-chain hover:bg-chain/20"
                >
                  <Plus className="size-3" /> Share Document
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {shareRows.map((s: any) => {
                const isRevoked = Boolean(s.revokedAt);
                const isExpired = !isRevoked && new Date(s.expiresAt) <= new Date();
                const isActive = !isRevoked && !isExpired;

                return (
                  <div key={s.shareId || s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {s.document?.name ?? "Document"}
                        </p>
                        <span
                          className={`mono rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            isActive
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : isRevoked
                              ? "bg-danger/15 text-danger border border-danger/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {isActive ? "ACTIVE" : isRevoked ? "REVOKED" : "EXPIRED"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Shared with <span className="text-foreground">{s.recipient?.name ?? "Colleague"}</span> ·{" "}
                        {s.canDownload ? "View + Download" : "View only"}
                      </p>
                      <p className="mono text-[10px] text-subtle">
                        Expires {formatDate(s.expiresAt)} ({countdown(s.expiresAt).label})
                      </p>
                    </div>

                    {/* Only case managers can revoke grants — never the recipient */}
                    {isActive && canManageCase && (
                      <button
                        type="button"
                        onClick={() => revokeShareMutation.mutate(s.shareId || s.id)}
                        disabled={revokeShareMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger hover:bg-danger/20"
                        title="Revoke access immediately"
                      >
                        <ShieldOff className="size-3" /> Revoke
                      </button>
                    )}
                  </div>
                );
              })}
              {shareRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No active shares for this case yet. Click "Share Document" to grant access.
                </p>
              ) : null}
            </div>
          </GlassPanel>
        </TabsContent>
      </Tabs>

      {/* ─── MODALS & DIALOGS ───────────────────────────────────────────── */}

      {/* 1. Assign Officer to Case Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" /> Assign Officer to Case
            </DialogTitle>
            <DialogDescription>
              Grant team collaboration access to <strong>{c.firNumber}</strong>. Assigned officers can view case files, register evidence, and submit versions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Select Officer</label>
              <select
                value={selectedAssignUserId}
                onChange={(e) => setSelectedAssignUserId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Choose an officer from directory...</option>
                {availableOfficers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.department || o.role}) — {o.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setAssignOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => assignOfficerMutation.mutate()}
              disabled={!selectedAssignUserId || assignOfficerMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Assign to Case
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Share Case Document Modal */}
      <Dialog open={shareDocOpen} onOpenChange={setShareDocOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-chain" /> Share Case Document
            </DialogTitle>
            <DialogDescription>
              Grant temporary, audited document access to another investigator or external department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Target Document</label>
              <select
                value={shareDocId}
                onChange={(e) => setShareDocId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground"
              >
                <option value="">Select case document...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (v{d.currentVersion?.versionNo ?? 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Recipient Officer</label>
              <select
                value={shareRecipientId}
                onChange={(e) => setShareRecipientId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground"
              >
                <option value="">Select recipient...</option>
                {(officers.data?.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.department || o.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Access Duration</label>
                <select
                  value={shareDays}
                  onChange={(e) => setShareDays(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground"
                >
                  <option value="1">24 Hours</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
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
              onClick={() => setShareDocOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => shareCaseDocMutation.mutate()}
              disabled={!shareDocId || !shareRecipientId || shareCaseDocMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Grant Access
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. In-Page Secure Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="flex h-[92vh] max-w-6xl flex-col overflow-hidden border-border bg-card p-0 text-foreground">
          {previewDoc ? (
            <SecureDocumentViewer
              documentId={previewDoc.id}
              documentName={previewDoc.name}
              versionNo={previewDoc.currentVersion?.versionNo ?? 1}
              mimeType={previewDoc.currentVersion?.mimeType}
              fileSize={previewDoc.currentVersion?.fileSize}
              hash={previewDoc.currentVersion?.hash}
              heightClass="h-[84vh]"
              showControls={true}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Count({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof FileText;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-raised/60 p-3">
      <Icon className={`size-4 ${tone}`} />
      <p className="mt-2 text-lg font-semibold leading-none text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
