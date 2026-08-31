import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Eye, FileText, Search, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { ClassificationBadge, DocumentStatusBadge } from "@/components/slidms/badges";
import { EmptyState, GlassPanel, LoadingBlock, MetricCard, SectionGlow } from "@/components/slidms/panels";
import { SecureDocumentViewer } from "@/components/slidms/SecureDocumentViewer";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { formatBytes, relativeTime, shortHash, titleCase } from "@/lib/slidms/format";
import { MOCK_CASES, MOCK_DOCUMENTS } from "@/lib/slidms/mock";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, type DocumentItem } from "@/lib/slidms/types";
import { fileUrl, withFallback } from "@/services/api";
import { caseService, documentService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({
    meta: [
      { title: "Documents — SLIDMS Integrity Center" },
      {
        name: "description",
        content:
          "Every case document with version number, SHA-256 hash, workflow status and classification tier.",
      },
      { property: "og:title", content: "Documents — SLIDMS Integrity Center" },
      {
        property: "og:description",
        content: "Version-controlled, hash-verified legal documents across all investigation cases.",
      },
    ],
  }),
  component: DocumentsPage,
});

const inputCls =
  "h-9 rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("ALL");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const casesQuery = useQuery({
    queryKey: ["cases", "list"],
    queryFn: () =>
      withFallback(
        () => (caseService.list({ page: 1, limit: 100 }) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_CASES,
      ),
  });

  const cases = (casesQuery.data?.data ?? []) as any[];

  // Fetch documents for the active case, or all cases
  const { data, isLoading } = useQuery({
    queryKey: ["documents", "list", selectedCaseId],
    queryFn: async () => {
      if (selectedCaseId === "ALL" && cases.length > 0) {
        const caseList = cases.slice(0, 10);
        const results = await Promise.all(
          caseList.map((cs) =>
            withFallback(
              () =>
                (documentService.listForCase(cs.id, { page: 1, limit: 50 }) as Promise<any>).then(
                  (r: any) => {
                    const items = Array.isArray(r) ? r : (r?.items ?? []);
                    return items.map((doc: any) => ({
                      ...doc,
                      case: doc.case ?? { id: cs.id, firNumber: cs.firNumber ?? cs.fir_number ?? cs.id },
                    }));
                  },
                ),
              MOCK_DOCUMENTS.filter((d) => d.caseId === cs.id),
            ),
          ),
        );
        const combined = results.flatMap((r) => r.data ?? []);
        return { data: combined, demo: results[0]?.demo };
      }

      const caseIdToFetch = selectedCaseId !== "ALL" ? selectedCaseId : cases[0]?.id || MOCK_CASES[0]!.id;
      return withFallback(
        () =>
          (documentService.listForCase(caseIdToFetch, { page: 1, limit: 100 }) as Promise<any>).then(
            (r: any) => (Array.isArray(r) ? r : (r?.items ?? [])),
          ),
        MOCK_DOCUMENTS,
      );
    },
    enabled: cases.length > 0 || selectedCaseId !== "ALL",
  });

  const all = (data?.data ?? []) as DocumentItem[];
  const rows = useMemo(
    () =>
      all.filter((d: any) => {
        const q = query.trim().toLowerCase();
        const docName = String(d.name ?? "").toLowerCase();
        const docType = String(d.type ?? "").toLowerCase();
        const docHash = String(d.currentVersion?.hash ?? "").toLowerCase();
        const docStatus = String(d.currentVersion?.status ?? "DRAFT").toLowerCase();
        const docClass = String(d.classification ?? "").toLowerCase();
        const creator = String(d.createdBy?.name ?? "").toLowerCase();
        const fir = String(d.case?.firNumber ?? d.caseId ?? "").toLowerCase();

        const matchQ =
          !q ||
          docName.includes(q) ||
          docType.includes(q) ||
          docHash.includes(q) ||
          docStatus.includes(q) ||
          docClass.includes(q) ||
          creator.includes(q) ||
          fir.includes(q);

        const currentStatus = d.currentVersion?.status ?? "DRAFT";
        const matchS = status === "ALL" || currentStatus === status;
        const matchT = type === "ALL" || d.type === type;
        return matchQ && matchS && matchT;
      }),
    [all, query, status, type],
  );

  const counts = {
    draft: all.filter((d) => d.currentVersion?.status === "DRAFT").length,
    pending: all.filter((d) => ["SUBMITTED", "UNDER_REVIEW"].includes(d.currentVersion?.status ?? "")).length,
    signed: all.filter((d) => ["SIGNED", "LOCKED"].includes(d.currentVersion?.status ?? "")).length,
  };

  return (
    <AppShell title="Documents" subtitle="Version-controlled, hash-verified records" demo={data?.demo}>
      <SectionGlow />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Every version is hashed with SHA-256 and anchored to the audit chain
          </p>
        </div>
        <button
          onClick={() => toast.info("Open a case workspace to upload a new document version.")}
          className="glow-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-3.5 text-xs font-semibold text-primary-foreground"
        >
          <Upload className="size-4" /> Upload Document
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Documents" value={all.length} icon={FileText} />
        <MetricCard label="Drafts" value={counts.draft} icon={FileText} tone="chain" />
        <MetricCard label="Pending Approval" value={counts.pending} icon={FileText} tone="pending" />
        <MetricCard label="Signed / Locked" value={counts.signed} icon={ShieldCheck} tone="signed" />
      </div>

      <GlassPanel className="mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search document name, type, FIR, hash, officer..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          {cases.length > 0 && (
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className={inputCls}
            >
              <option value="ALL">All Cases ({cases.length})</option>
              {cases.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.firNumber ?? c.fir_number ?? c.title}
                </option>
              ))}
            </select>
          )}
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="ALL">All types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="ALL">All statuses</option>
            {DOCUMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading document index" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description="Try a different search term, type or workflow status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                  <th className="px-4 py-2.5 text-left font-semibold">Document Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Ver.</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Classification</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Size</th>
                  <th className="px-4 py-2.5 text-left font-semibold">SHA-256</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Updated</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-primary/6"
                  >
                    <td className="max-w-[280px] px-4 py-3">
                      <Link
                        to="/documents/$docId"
                        params={{ docId: d.id }}
                        className="block truncate text-xs font-medium text-foreground hover:text-primary"
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{titleCase(d.type)}</td>
                    <td className="mono px-4 py-3 text-[11px] text-muted-foreground">
                      v{d.currentVersion?.versionNo ?? 1}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={d.currentVersion?.status ?? "DRAFT"} />
                    </td>
                    <td className="px-4 py-3">
                      <ClassificationBadge classification={d.classification} />
                    </td>
                    <td className="mono px-4 py-3 text-[11px] text-muted-foreground">
                      {formatBytes(d.currentVersion?.fileSize ?? 0)}
                    </td>
                    <td className="mono px-4 py-3 text-[11px] text-chain">
                      {shortHash(d.currentVersion?.hash, 8)}
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
        )}
      </GlassPanel>

      {/* In-Page Secure Preview Dialog */}
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
