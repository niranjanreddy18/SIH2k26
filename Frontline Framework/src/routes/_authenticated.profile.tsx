import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { ResultBadge, RoleBadge } from "@/components/slidms/badges";
import { GlassPanel, InfoRow, PanelHeader, SectionGlow } from "@/components/slidms/panels";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime, initials, relativeTime, titleCase } from "@/lib/slidms/format";
import { MOCK_AUDIT } from "@/lib/slidms/mock";
import { withFallback } from "@/services/api";
import { adminService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Officer Profile — SLIDMS" },
      {
        name: "description",
        content:
          "Your officer profile, assigned role permissions, session details and recent security activity.",
      },
      { property: "og:title", content: "Officer Profile — SLIDMS" },
      {
        property: "og:description",
        content: "Review your role permissions, session security and personal audit history.",
      },
    ],
  }),
  component: ProfilePage,
});

const PERMISSIONS: Record<string, string[]> = {
  INVESTIGATOR: [
    "Register and update assigned cases",
    "Upload documents and create new versions",
    "Submit documents for approval",
    "Register evidence and log custody transfers",
  ],
  SENIOR_OFFICER: [
    "All investigator permissions",
    "Approve or reject submitted documents",
    "Digitally sign and lock documents",
    "Assign officers to cases",
  ],
  FORENSIC_OFFICER: [
    "Verify document hash integrity",
    "Inspect blockchain anchor records",
    "Accept and transfer evidence custody",
    "Read-only access to assigned case files",
  ],
  ADMIN: [
    "Provision and manage officer accounts",
    "Assign and revoke roles",
    "Unlock locked accounts",
    "Full system audit trail access",
  ],
};

function ProfilePage() {
  const { user, logout } = useAuth();

  const audit = useQuery({
    queryKey: ["profile", "audit", user?.role],
    queryFn: () =>
      withFallback(
        () =>
          user?.role === "ADMIN"
            ? adminService.audit({ page: 1, limit: 10 }).then((r) => (Array.isArray(r) ? r : (r?.items ?? [])))
            : Promise.resolve([]),
        MOCK_AUDIT.slice(0, 10),
      ),
  });

  const permissions = PERMISSIONS[user?.role ?? "INVESTIGATOR"] ?? [];

  return (
    <AppShell title="Profile" subtitle="Officer identity and session security" demo={audit.data?.demo}>
      <SectionGlow />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <GlassPanel glow className="p-5 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-primary/40 bg-primary/12 text-lg font-semibold text-primary">
              {initials(user?.name)}
            </div>
            <h2 className="mt-3 text-base font-semibold text-foreground">{user?.name}</h2>
            <p className="mono text-[11px] text-muted-foreground">{user?.email}</p>
            <div className="mt-3 flex justify-center">
              <RoleBadge role={user?.role ?? "INVESTIGATOR"} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{user?.department}</p>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader title="Session" subtitle="Current secure session" icon={ShieldCheck} />
            <div className="px-4 py-2">
              <InfoRow label="Officer ID" value={user?.id ?? "—"} mono />
              <InfoRow label="Session Started" value={formatDateTime(new Date().toISOString())} mono />
              <InfoRow label="Token Type" value="JWT + HttpOnly refresh" />
              <InfoRow label="Transport" value="TLS 1.3 encrypted" />
            </div>
            <div className="grid gap-2 p-4 pt-1">
              <button
                onClick={() => toast.info("Password rotation is issued by the directorate administrator.")}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-primary/35 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <KeyRound className="size-3.5" /> Change Password
              </button>
              <button
                onClick={logout}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-danger/35 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="size-3.5" /> Sign Out
              </button>
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          <GlassPanel>
            <PanelHeader
              title="Role Permissions"
              subtitle={titleCase(user?.role)}
              icon={UserRound}
            />
            <ul className="grid gap-2 p-4 sm:grid-cols-2">
              {permissions.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background-raised/60 p-3 text-[11px] text-muted-foreground"
                >
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-verified" />
                  {p}
                </li>
              ))}
            </ul>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader title="My Recent Activity" subtitle="Your audited actions" icon={Activity} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-2.5 text-left font-semibold">When</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Target</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.data?.data ?? []).map((e) => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0">
                      <td className="mono px-4 py-2.5 text-[11px] text-muted-foreground">
                        {relativeTime(e.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{titleCase(e.action)}</td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-[11px] text-muted-foreground">
                        {e.target}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <ResultBadge result={e.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>
      </div>
    </AppShell>
  );
}
