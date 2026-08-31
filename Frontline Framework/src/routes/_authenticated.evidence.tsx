import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, FileStack, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { EvidenceStatusBadge } from "@/components/slidms/badges";
import {
  EmptyState,
  GlassPanel,
  LoadingBlock,
  PanelHeader,
  SectionGlow,
} from "@/components/slidms/panels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, shortHash, titleCase } from "@/lib/slidms/format";
import { MOCK_CASES, MOCK_CUSTODY, MOCK_DIRECTORY, MOCK_EVIDENCE } from "@/lib/slidms/mock";
import type { EvidenceItem } from "@/lib/slidms/types";
import { errorMessage, withFallback } from "@/services/api";
import { caseService, evidenceService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence & Chain of Custody — SLIDMS" },
      {
        name: "description",
        content:
          "Registered evidence items with full chain-of-custody timelines, hash-linked transfers and custodian handovers.",
      },
      { property: "og:title", content: "Evidence & Chain of Custody — SLIDMS" },
      {
        property: "og:description",
        content: "Track evidence custody transfers with tamper-evident hash linking.",
      },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  const [transferFor, setTransferFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const casesQuery = useQuery({
    queryKey: ["cases", "list"],
    queryFn: () =>
      withFallback(
        () => (caseService.list({ page: 1, limit: 100 }) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_CASES,
      ),
  });

  const cases = (casesQuery.data?.data ?? []) as any[];

  const list = useQuery({
    queryKey: ["evidence", "list", selectedCaseId],
    queryFn: async () => {
      if (selectedCaseId === "ALL" && cases.length > 0) {
        const caseList = cases.slice(0, 10);
        const results = await Promise.all(
          caseList.map((cs) =>
            withFallback(
              () =>
                (evidenceService.list(cs.id) as Promise<any>).then((r: any) => {
                  const items = Array.isArray(r) ? r : (r?.items ?? []);
                  return items.map((ev: any) => ({
                    ...ev,
                    caseId: ev.caseId ?? cs.id,
                    caseFir: cs.firNumber ?? cs.fir_number ?? cs.id,
                  }));
                }),
              MOCK_EVIDENCE.filter((e) => e.caseId === cs.id),
            ),
          ),
        );
        return { data: results.flatMap((r) => r.data ?? []), demo: results[0]?.demo };
      }

      const caseIdToFetch = selectedCaseId !== "ALL" ? selectedCaseId : cases[0]?.id || MOCK_CASES[0]!.id;
      return withFallback(
        () => (evidenceService.list(caseIdToFetch) as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_EVIDENCE,
      );
    },
    enabled: cases.length > 0 || selectedCaseId !== "ALL",
  });

  const allItems = (list.data?.data ?? []) as (EvidenceItem & { caseFir?: string })[];

  const items = useMemo<(EvidenceItem & { caseFir?: string })[]>(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((e: any) => {
      const type = String(e.type ?? "").toLowerCase();
      const desc = String(e.description ?? "").toLowerCase();
      const collector = String(e.collectedBy?.name ?? "").toLowerCase();
      const status = String(e.status ?? "").toLowerCase();
      const id = String(e.id ?? "").toLowerCase();
      const fir = String(e.caseFir ?? e.caseId ?? "").toLowerCase();

      const matchQ =
        !q ||
        type.includes(q) ||
        desc.includes(q) ||
        collector.includes(q) ||
        status.includes(q) ||
        id.includes(q) ||
        fir.includes(q);

      const matchS = statusFilter === "ALL" || e.status === statusFilter;
      return matchQ && matchS;
    });
  }, [allItems, query, statusFilter]);

  const activeId = selected ?? items[0]?.id ?? null;
  const timeline = useQuery({
    queryKey: ["evidence", activeId, "timeline"],
    enabled: Boolean(activeId),
    queryFn: () =>
      withFallback(
        () =>
          (evidenceService.timeline(activeId!) as Promise<any>).then((r: any) =>
            Array.isArray(r) ? r : (r?.items ?? [])
          ),
        MOCK_CUSTODY,
      ),
  });

  const rawTimeline = timeline.data?.data;
  const timelineEvents: any[] = Array.isArray(rawTimeline)
    ? rawTimeline
    : (rawTimeline?.items ?? []);

  return (
    <AppShell title="Evidence" subtitle="Chain of custody register" demo={list.data?.demo}>
      <SectionGlow />

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Evidence &amp; Chain of Custody</h2>
        <p className="text-sm text-muted-foreground">
          Every handover is hash-linked to the previous custody event
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileStack className="size-4 text-primary" /> Evidence Register
              </h3>
              <p className="text-[11px] text-muted-foreground">{items.length} of {allItems.length} items</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search evidence..."
                className="h-8 w-36 rounded-lg border border-input bg-background-raised px-2.5 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {cases.length > 0 && (
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background-raised px-2 text-xs text-foreground"
                >
                  <option value="ALL">All Cases</option>
                  {cases.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firNumber ?? c.fir_number ?? c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {list.isLoading ? (
            <LoadingBlock label="Loading evidence register" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileStack}
              title="No evidence registered"
              description="Register evidence from a case workspace to begin custody tracking."
            />
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    activeId === e.id ? "bg-primary/8" : "hover:bg-primary/6"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{e.type}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.description}</p>
                    <p className="mono mt-1 text-[10px] text-subtle">
                      Collected {formatDateTime(e.collectedAt)} ·{" "}
                      <Link to="/cases/$id" params={{ id: e.caseId ?? "" }} className="text-primary">
                        case file
                      </Link>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <EvidenceStatusBadge status={e.status} />
                    <span
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setTransferFor(e.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRightLeft className="size-3" /> Transfer
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel glow>
          <PanelHeader
            title="Custody Timeline"
            subtitle="Tamper-evident handover chain"
            icon={ShieldCheck}
          />
          {timeline.isLoading ? (
            <LoadingBlock label="Rebuilding custody chain" />
          ) : timelineEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {activeId
                ? "No custody transfer history recorded for this item yet."
                : "Select an evidence item from the register to inspect its custody chain."}
            </div>
          ) : (
            <ol className="relative space-y-4 px-6 py-5">
              <span className="absolute left-[27px] top-6 bottom-6 w-px bg-border" aria-hidden />
              {timelineEvents.map((event: any) => {
                const fromName = event.fromUser?.name ?? event.from?.name;
                const toName = event.toUser?.name ?? event.to?.name ?? "Custodian";
                const hashStr = event.hash ? shortHash(event.hash, 10) : "";

                return (
                  <li key={event.id || `${event.action}-${event.createdAt}`} className="relative flex gap-4">
                    <span className="relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-chain/50 bg-background-raised">
                      <span className="size-1.5 rounded-full bg-chain" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-background-raised/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{titleCase(event.action)}</p>
                        <span className="mono text-[10px] text-subtle">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      {event.reason && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{event.reason}</p>
                      )}
                      <p className="mono mt-1.5 text-[10px] text-chain">
                        {fromName ? `${fromName} → ` : ""}
                        {toName} {hashStr ? `· ${hashStr}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </GlassPanel>
      </div>

      <TransferDialog id={transferFor} onClose={() => setTransferFor(null)} />
    </AppShell>
  );
}

function TransferDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [toUserId, setToUserId] = useState(MOCK_DIRECTORY[0]?.id ?? "");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => evidenceService.transfer(id!, { toUserId, reason }),
    onSuccess: () => {
      toast.success("Custody transferred and hash-linked");
      qc.invalidateQueries({ queryKey: ["evidence"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to transfer custody.")),
  });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Transfer Custody</DialogTitle>
          <DialogDescription>
            The handover is recorded as a new hash-linked custody event.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {MOCK_DIRECTORY.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for transfer (e.g. forensic imaging of seized device)"
            className="w-full rounded-lg border border-input bg-background-raised p-3 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="glow-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm Transfer
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
