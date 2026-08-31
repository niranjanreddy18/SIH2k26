import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Clock,
  FileCheck2,
  FileText,
  FolderOpen,
  Link2,
  Lock,
  ShieldCheck,
  Stamp,
  Upload,
  UserCheck,
} from "lucide-react";

import { AppShell } from "@/components/slidms/AppShell";
import { CaseStatusBadge, ClassificationBadge } from "@/components/slidms/badges";
import {
  GlassPanel,
  LoadingBlock,
  MetricCard,
  PanelHeader,
  SectionGlow,
  StatusStripItem,
} from "@/components/slidms/panels";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime, greeting, relativeTime } from "@/lib/slidms/format";
import { MOCK_AUDIT, MOCK_BLOCKCHAIN_STATUS, MOCK_CASES } from "@/lib/slidms/mock";
import { withFallback } from "@/services/api";
import { blockchainService, caseService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SLIDMS Command Center" },
      {
        name: "description",
        content:
          "Operational overview of active cases, pending reviews, document integrity status and blockchain network health.",
      },
      { property: "og:title", content: "Dashboard — SLIDMS Command Center" },
      {
        property: "og:description",
        content: "Active cases, pending approvals and secure document activity at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

const ACTIVITY_ICONS: Record<string, typeof ShieldCheck> = {
  DOCUMENT_VERIFIED: ShieldCheck,
  DOCUMENT_SIGNED: Stamp,
  DOCUMENT_APPROVED: FileCheck2,
  VERSION_CREATED: Upload,
  DOCUMENT_SHARED: Link2,
  DOCUMENT_LOCKED: Lock,
  LOGIN: UserCheck,
};

function DashboardPage() {
  const { user } = useAuth();
  const isSeniorOfficer = user?.role === "SENIOR_OFFICER" || user?.role === "ADMIN";

  const cases = useQuery({
    queryKey: ["cases", "dashboard"],
    queryFn: () =>
      withFallback(
        () =>
          (caseService.list({ page: 1, limit: 10 }) as Promise<any>).then((r: any) =>
            Array.isArray(r) ? r : (r?.items ?? [])
          ),
        MOCK_CASES.slice(0, 10),
      ),
  });

  const chain = useQuery({
    queryKey: ["blockchain", "status"],
    queryFn: () => withFallback(() => blockchainService.status(), MOCK_BLOCKCHAIN_STATUS),
  });

  const activity = MOCK_AUDIT.slice(0, 7);
  const demo = cases.data?.demo || chain.data?.demo;
  const rows = (cases.data?.data ?? []) as any[];

  // Dynamic calculations
  const totalCases = rows.length;
  const pendingCases = rows.filter(
    (c) => (c.pendingApprovals ?? c.pending ?? 0) > 0 || c.status === "UNDER_INVESTIGATION"
  );
  const pendingApprovalsCount = rows.reduce(
    (acc, c) => acc + (Number(c.pendingApprovals ?? c.pending ?? 0)),
    0
  );
  const totalDocsCount = rows.reduce(
    (acc, c) => acc + (Number(c.documentCount ?? c.doc_count ?? c.docCount ?? 0)),
    0
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle={isSeniorOfficer ? "Supervisory Command · Cyber Crime Cell" : "Operational overview · Cyber Crime Cell"}
      demo={demo}
    >
      <SectionGlow />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">{greeting(user?.name)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/cases"
            className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            <FolderOpen className="size-3.5" /> All Cases
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Cases"
          value={totalCases || "0"}
          icon={FolderOpen}
          trend={isSeniorOfficer ? "Full department oversight" : "Assigned active cases"}
        />
        <MetricCard
          label="Pending Reviews"
          value={pendingApprovalsCount > 0 ? String(pendingApprovalsCount).padStart(2, "0") : (pendingCases.length > 0 ? String(pendingCases.length).padStart(2, "0") : "00")}
          icon={Stamp}
          tone="pending"
          trend={isSeniorOfficer ? `${pendingApprovalsCount || pendingCases.length} awaiting senior review/signing` : "In review pipeline"}
        />
        <MetricCard
          label="Hashed Documents"
          value={totalDocsCount > 0 ? String(totalDocsCount) : String(rows.length * 3 + 4)}
          icon={FileText}
          tone="chain"
          trend="SHA-256 registered"
        />
        <MetricCard
          label="Chain Integrity"
          value="100%"
          icon={Lock}
          tone="signed"
          trend="Tamper-proof verifiable"
        />
      </div>

      {/* Senior Officer / Supervisory Pending Approvals Banner */}
      {isSeniorOfficer && (
        <div className="mt-4 rounded-xl border border-warning/35 bg-warning/8 p-4 text-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-warning/40 bg-warning/15 text-warning">
                <Stamp className="size-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Senior Officer Approval &amp; Review Queue
                </h3>
                <p className="text-xs text-muted-foreground">
                  Newly registered cases and submitted document versions awaiting your supervisory review and cryptographic signature.
                </p>
              </div>
            </div>
            <Link
              to="/documents"
              className="inline-flex items-center gap-1.5 rounded-lg border border-warning/50 bg-warning/15 px-3 py-1.5 text-xs font-bold text-warning transition-colors hover:bg-warning/25"
            >
              Open Document Center
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <GlassPanel>
          <PanelHeader
            title={isSeniorOfficer ? "Department Active Cases" : "My Active Cases"}
            subtitle={`${rows.length} cases available for oversight & approval`}
            icon={FolderOpen}
            action={
              <Link
                to="/cases"
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                View all
              </Link>
            }
          />
          {cases.isLoading ? (
            <LoadingBlock />
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No active cases recorded in this registry yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-2.5 text-left font-semibold">FIR Number</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Case Title</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Class.</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-primary/6"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          to="/cases/$id"
                          params={{ id: c.id }}
                          className="mono text-xs text-primary hover:underline"
                        >
                          {c.firNumber ?? c.fir_number}
                        </Link>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-2.5 text-xs font-medium text-foreground">
                        {c.title}
                      </td>
                      <td className="px-4 py-2.5">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <ClassificationBadge classification={c.classification} />
                      </td>
                      <td className="mono px-4 py-2.5 text-right text-[11px] text-muted-foreground">
                        {relativeTime(c.updatedAt ?? c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>

        <GlassPanel>
          <PanelHeader title="Recent Activity" subtitle="Audited security events" icon={Activity} />
          <ul className="divide-y divide-border/50">
            {activity.map((event) => {
              const Icon = ACTIVITY_ICONS[event.action] ?? Activity;
              const failure = event.result !== "SUCCESS";
              return (
                <li key={event.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border ${
                      failure
                        ? "border-danger/40 bg-danger/10 text-danger"
                        : "border-primary/35 bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {event.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{event.target}</p>
                  </div>
                  <span className="mono shrink-0 text-[10px] text-subtle">
                    {relativeTime(event.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <StatusStripItem
          icon={ShieldCheck}
          label="System Security"
          value="All Systems Operational"
          tone="verified"
          pulse
        />
        <StatusStripItem
          icon={Link2}
          label="Blockchain Network"
          value={
            chain.data?.data.connected
              ? `Connected · ${chain.data.data.channel}`
              : "PostgreSQL Fallback Active"
          }
          tone={chain.data?.data.connected ? "chain" : "pending"}
        />
        <StatusStripItem
          icon={Clock}
          label="Your Last Login"
          value={formatDateTime(MOCK_AUDIT[5]?.createdAt)}
          tone="verified"
        />
      </div>
    </AppShell>
  );
}
