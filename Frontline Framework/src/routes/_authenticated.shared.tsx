import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Download, Eye, FolderOpen, Search, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/slidms/AppShell";
import { ClassificationBadge } from "@/components/slidms/badges";
import { EmptyState, GlassPanel, LoadingBlock, PanelHeader, SectionGlow } from "@/components/slidms/panels";
import { SecureDocumentViewer } from "@/components/slidms/SecureDocumentViewer";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { countdown, formatDateTime } from "@/lib/slidms/format";
import { MOCK_SHARES } from "@/lib/slidms/mock";
import { fileUrl, withFallback } from "@/services/api";
import { documentService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/shared")({
  head: () => ({
    meta: [
      { title: "Shared Documents & Cases — SLIDMS" },
      {
        name: "description",
        content:
          "Documents and case files shared with you, with granular view/download permissions and expiry countdowns.",
      },
      { property: "og:title", content: "Shared Documents & Cases — SLIDMS" },
      {
        property: "og:description",
        content: "Time-bound, permission-scoped document and case sharing across departments.",
      },
    ],
  }),
  component: SharedPage,
});

function SharedPage() {
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["shares", "with-me"],
    queryFn: () => withFallback(() => documentService.sharedWithMe().then((r) => (Array.isArray(r) ? r : (r?.items ?? []))), MOCK_SHARES),
  });

  const allShares = (data?.data ?? []) as any[];

  const shares = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allShares.filter((s) => {
      const docName = String(s.document?.name ?? s.name ?? "").toLowerCase();
      const docType = String(s.document?.type ?? "").toLowerCase();
      const fir = String(s.case?.firNumber ?? s.case?.id ?? "").toLowerCase();
      const sharer = String(s.sharedBy?.name ?? s.createdBy?.name ?? "").toLowerCase();

      return !q || docName.includes(q) || docType.includes(q) || fir.includes(q) || sharer.includes(q);
    });
  }, [allShares, query]);

  return (
    <AppShell title="Shared Documents & Cases" subtitle="Permission-scoped, time-bound collaboration" demo={data?.demo}>
      <SectionGlow />

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Shared With You</h2>
        <p className="text-sm text-muted-foreground">
          Cross-department access grants with tamper-evident audit logging and automatic expiry
        </p>
      </div>

      <GlassPanel>
        <PanelHeader
          title="Active Collaboration Shares"
          subtitle={`${shares.length} of ${allShares.length} documents & files`}
          icon={Share2}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shared documents..."
                className="h-8 w-56 rounded-lg border border-input bg-background-raised pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          }
        />
        {isLoading ? (
          <LoadingBlock label="Loading shared documents and case files" />
        ) : shares.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Nothing shared with you yet"
            description="When a colleague assigns you to a case or shares a case document with your badge ID, it will appear here."
          />
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {shares.map((s: any) => {
              const expiry = countdown(s.expiresAt);
              return (
                <div
                  key={s.shareId || s.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background-raised/60 p-4 transition-colors hover:border-border-strong"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/documents/$docId"
                        params={{ docId: s.document?.id ?? s.id }}
                        className="line-clamp-2 text-xs font-semibold text-foreground hover:text-primary"
                      >
                        {s.document?.name ?? s.name ?? "Case Document"}
                      </Link>
                      <ClassificationBadge classification={s.document?.classification ?? s.classification ?? "CONFIDENTIAL"} />
                    </div>

                    {s.case && (
                      <Link
                        to="/cases/$id"
                        params={{ id: s.case.id }}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <FolderOpen className="size-3" /> FIR: {s.case.firNumber ?? s.case.id}
                      </Link>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      Shared by <span className="text-foreground">{s.sharedBy?.name ?? s.createdBy?.name ?? "Colleague"}</span>
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                            s.canView
                              ? "border-verified/35 bg-verified/10 text-verified"
                              : "border-border text-subtle"
                          }`}
                        >
                          <Eye className="size-3" /> View
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                            s.canDownload
                              ? "border-signed/35 bg-signed/10 text-signed"
                              : "border-border text-subtle"
                          }`}
                        >
                          <Download className="size-3" /> Download
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(s)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                      >
                        <Eye className="size-3" /> Preview
                      </button>
                    </div>

                    <div className="rounded-lg border border-pending/30 bg-pending/8 px-2.5 py-1.5">
                      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-pending">
                        <Clock className="size-3" /> {expiry.label}
                      </p>
                      <p className="mono mt-0.5 text-[10px] text-muted-foreground">
                        {formatDateTime(s.expiresAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {s.canDownload && (
                        <a
                          href={fileUrl(documentService.downloadPath(s.document?.id ?? s.id))}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background-raised text-[11px] font-semibold text-foreground transition-colors hover:bg-background-raised/80"
                        >
                          <Download className="size-3" /> Download
                        </a>
                      )}
                      {/* Recipients cannot revoke. Only the sharer can revoke from
                          the Case Workspace → Access & Collaboration tab. */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* In-Page Secure Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="flex h-[92vh] max-w-6xl flex-col overflow-hidden border-border bg-card p-0 text-foreground">
          {previewDoc ? (
            <SecureDocumentViewer
              documentId={previewDoc.document?.id ?? previewDoc.id}
              documentName={previewDoc.document?.name ?? previewDoc.name ?? "Shared Document"}
              versionNo={previewDoc.document?.versionNo ?? 1}
              mimeType={previewDoc.document?.mimeType}
              heightClass="h-[84vh]"
              showControls={true}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
