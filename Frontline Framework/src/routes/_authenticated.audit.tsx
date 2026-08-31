import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Link2, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/slidms/AppShell";
import { ResultBadge } from "@/components/slidms/badges";
import {
  EmptyState,
  GlassPanel,
  LoadingBlock,
  PanelHeader,
  SectionGlow,
  StatusStripItem,
} from "@/components/slidms/panels";
import { formatDateTime, shortHash, titleCase } from "@/lib/slidms/format";
import { MOCK_AUDIT, MOCK_CHAIN } from "@/lib/slidms/mock";
import { withFallback } from "@/services/api";
import { adminService, auditService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — SLIDMS Chain Integrity" },
      {
        name: "description",
        content:
          "Immutable hash-chained audit log of every access, approval, signature and share across the system.",
      },
      { property: "og:title", content: "Audit Trail — SLIDMS Chain Integrity" },
      {
        property: "og:description",
        content: "Verify the audit hash chain and inspect every security event with actor and IP.",
      },
    ],
  }),
  component: AuditPage,
});

const inputCls =
  "h-9 rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

import { useAuth } from "@/context/AuthContext";

function getActorName(e: any): string {
  return e.actor?.name ?? e.actorName ?? e.actor_name ?? "System";
}

function getActorEmail(e: any): string {
  return e.actor?.email ?? e.actorEmail ?? e.actor_email ?? "";
}

function getTargetLabel(e: any): string {
  if (e.target) return String(e.target);
  if (e.targetType && e.targetId) return `${titleCase(e.targetType)}: ${shortHash(e.targetId, 8)}`;
  if (e.targetType) return titleCase(e.targetType);
  if (e.targetId) return shortHash(e.targetId, 8);
  return "System";
}

function AuditPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["audit", "events", user?.role],
    queryFn: () =>
      withFallback(
        () =>
          user?.role === "ADMIN"
            ? adminService.audit({ page: 1, limit: 200 }).then((r) => (Array.isArray(r) ? r : (r?.items ?? [])))
            : Promise.resolve(MOCK_AUDIT),
        MOCK_AUDIT,
      ),
  });
  const chain = useQuery({
    queryKey: ["audit", "chain"],
    queryFn: () => withFallback(() => auditService.verifyChain(), MOCK_CHAIN),
  });

  const all = (events.data?.data ?? []) as any[];

  // Extract unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    all.forEach((e) => {
      if (e.action) set.add(e.action);
    });
    return Array.from(set).sort();
  }, [all]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      const actorName = getActorName(e).toLowerCase();
      const actorEmail = getActorEmail(e).toLowerCase();
      const action = String(e.action ?? "").toLowerCase();
      const target = getTargetLabel(e).toLowerCase();
      const targetType = String(e.targetType ?? e.target_type ?? "").toLowerCase();
      const targetId = String(e.targetId ?? e.target_id ?? "").toLowerCase();
      const hash = String(e.eventHash ?? e.event_hash ?? "").toLowerCase();
      const res = String(e.result ?? "").toLowerCase();

      const matchQ =
        !q ||
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        action.includes(q) ||
        target.includes(q) ||
        targetType.includes(q) ||
        targetId.includes(q) ||
        hash.includes(q) ||
        res.includes(q);

      const matchR = result === "ALL" || e.result === result;
      const matchA = actionFilter === "ALL" || e.action === actionFilter;

      return matchQ && matchR && matchA;
    });
  }, [all, query, result, actionFilter]);

  const valid = chain.data?.data.valid;

  return (
    <AppShell title="Audit Trail" subtitle="Immutable hash-chained security log" demo={events.data?.demo}>
      <SectionGlow />

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Audit Trail</h2>
        <p className="text-sm text-muted-foreground">
          Every event is linked to the previous event hash — tampering breaks the chain
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatusStripItem
          icon={ShieldCheck}
          label="Chain Integrity"
          value={valid ? "Chain Verified — No Tampering" : "Chain Broken"}
          tone={valid ? "verified" : "danger"}
          pulse={valid ?? false}
        />
        <StatusStripItem
          icon={Link2}
          label="Chain Length"
          value={`${chain.data?.data.chainLength ?? 0} linked events`}
          tone="chain"
        />
        <StatusStripItem
          icon={Activity}
          label="Broken At"
          value={chain.data?.data.brokenAt ?? "None"}
          tone={chain.data?.data.brokenAt ? "danger" : "verified"}
        />
      </div>

      <GlassPanel className="mt-4">
        <PanelHeader
          title="Security Events"
          subtitle={`${rows.length} of ${all.length} events`}
          icon={Activity}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search actor, action, hash, target..."
                  className={`${inputCls} w-64 pl-8`}
                />
              </div>
              {actionTypes.length > 0 && (
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className={inputCls}
                >
                  <option value="ALL">All actions</option>
                  {actionTypes.map((a) => (
                    <option key={a} value={a}>
                      {titleCase(a)}
                    </option>
                  ))}
                </select>
              )}
              <select value={result} onChange={(e) => setResult(e.target.value)} className={inputCls}>
                <option value="ALL">All results</option>
                <option value="SUCCESS">Success</option>
                <option value="DENIED">Denied</option>
                <option value="FAILURE">Failure</option>
              </select>
            </div>
          }
        />

        {events.isLoading ? (
          <LoadingBlock label="Verifying audit chain" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No audit events match"
            description="Adjust your search term, action type or result status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                  <th className="px-4 py-2.5 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Actor</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Target</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Result</th>
                  <th className="px-4 py-2.5 text-left font-semibold">IP / Host</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Event Hash</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const actor = getActorName(e);
                  const email = getActorEmail(e);
                  const targetText = getTargetLabel(e);
                  const hash = e.eventHash ?? e.event_hash ?? e.id;
                  const isExp = expanded === e.id;

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setExpanded(isExp ? null : e.id)}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-primary/6"
                    >
                      <td className="mono px-4 py-2.5 text-[11px] text-muted-foreground">
                        {formatDateTime(e.createdAt ?? e.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-foreground">{actor}</p>
                        {email && <p className="text-[10px] text-subtle">{email}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
                        <span className="rounded bg-background-raised px-1.5 py-0.5 border border-border">
                          {titleCase(e.action)}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-[11px] text-muted-foreground" title={targetText}>
                        {targetText}
                      </td>
                      <td className="px-4 py-2.5">
                        <ResultBadge result={e.result} />
                      </td>
                      <td className="mono px-4 py-2.5 text-[11px] text-muted-foreground">
                        {e.ipAddress ?? e.ip_address ?? "127.0.0.1"}
                      </td>
                      <td className="mono px-4 py-2.5 text-right text-[10px] text-chain">
                        {isExp ? hash : shortHash(hash, 8)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </AppShell>
  );
}

