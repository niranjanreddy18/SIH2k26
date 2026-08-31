import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Box, FileStack, Loader2, Plus, ShieldCheck } from "lucide-react";
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
import { RegisterEvidenceDialog } from "@/components/slidms/RegisterEvidenceDialog";
import { TransferCustodyDialog } from "@/components/slidms/TransferCustodyDialog";
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
  const [registerOpen, setRegisterOpen] = useState(false);

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
                    caseFir: cs.firNumber ?? cs.fir_number ?? cs.title,
                  }));
                }),
              MOCK_EVIDENCE.map((e) => ({
                ...e,
                caseId: cs.id,
                caseFir: cs.firNumber ?? cs.fir_number ?? cs.title,
              })),
            ),
          ),
        );
        return results.flatMap((r) => r.data ?? []);
      }
      const targetCase = cases.find((c: any) => c.id === selectedCaseId);
      const res = await withFallback(
        () =>
          (evidenceService.list(selectedCaseId) as Promise<any>).then((r: any) => {
            const items = Array.isArray(r) ? r : (r?.items ?? []);
            return items.map((ev: any) => ({
              ...ev,
              caseId: ev.caseId ?? selectedCaseId,
              caseFir: targetCase?.firNumber ?? targetCase?.fir_number ?? targetCase?.title ?? "Case",
            }));
          }),
        MOCK_EVIDENCE.map((e) => ({
          ...e,
          caseId: selectedCaseId,
          caseFir: targetCase?.firNumber ?? targetCase?.fir_number ?? targetCase?.title ?? "Case",
        })),
      );
      return res.data ?? [];
    },
    enabled: cases.length > 0 || selectedCaseId !== "ALL",
  });

  const allItems: any[] = useMemo(() => {
    const raw = list.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as any).items)) return (raw as any).items;
    return MOCK_EVIDENCE;
  }, [list.data]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((e) => {
      const type = (e.type ?? "").toLowerCase();
      const desc = (e.description ?? "").toLowerCase();
      const collector = (e.collectedBy ?? e.collected_by ?? "").toLowerCase();
      const status = (e.status ?? "").toLowerCase();
      const id = (e.id ?? "").toLowerCase();
      const fir = (e.caseFir ?? "").toLowerCase();

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Evidence &amp; Chain of Custody</h2>
          <p className="text-sm text-muted-foreground">
            Every handover is hash-linked to the previous custody event
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRegisterOpen(true)}
          className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-chain to-primary px-3.5 py-2 text-xs font-bold text-white transition-transform active:scale-95"
        >
          <Plus className="size-3.5" /> Register Evidence
        </button>
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
            <div className="p-10 text-center">
              <FileStack className="mx-auto size-10 text-muted-foreground opacity-40" />
              <p className="mt-3 text-sm font-semibold text-foreground">No evidence registered</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Register evidence to begin cryptographic custody tracking.
              </p>
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-chain/50 bg-chain/15 px-3.5 py-1.5 text-xs font-bold text-chain transition-colors hover:bg-chain/25"
              >
                <Plus className="size-3.5" /> Register Evidence Item
              </button>
            </div>
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
            action={
              activeId ? (
                <button
                  type="button"
                  onClick={() => setTransferFor(activeId)}
                  className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                >
                  <ArrowRightLeft className="size-3.5" /> Transfer Custody / Forensics
                </button>
              ) : undefined
            }
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

      <TransferCustodyDialog
        id={transferFor}
        evidenceName={items.find((e: any) => e.id === transferFor)?.description || items.find((e: any) => e.id === transferFor)?.type}
        onClose={() => setTransferFor(null)}
      />

      <RegisterEvidenceDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        caseId={selectedCaseId !== "ALL" ? selectedCaseId : undefined}
        cases={cases}
      />
    </AppShell>
  );
}
