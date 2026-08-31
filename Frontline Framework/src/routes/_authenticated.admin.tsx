import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, LockOpen, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { RoleBadge } from "@/components/slidms/badges";
import {
  GlassPanel,
  LoadingBlock,
  MetricCard,
  PanelHeader,
  SectionGlow,
} from "@/components/slidms/panels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/slidms/format";
import { MOCK_ADMIN_USERS } from "@/lib/slidms/mock";
import { ROLES, type Role } from "@/lib/slidms/types";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, withFallback } from "@/services/api";
import { adminService, userService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — SLIDMS Directorate Control" },
      {
        name: "description",
        content:
          "Manage officer accounts, role assignments, locked accounts and department directory access.",
      },
      { property: "og:title", content: "Administration — SLIDMS Directorate Control" },
      {
        property: "og:description",
        content: "Officer account provisioning, role-based access control and account unlocking.",
      },
    ],
  }),
  component: AdminPage,
});

const inputCls =
  "h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const isAdmin = user?.role === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", user?.role],
    queryFn: () =>
      withFallback(
        () =>
          isAdmin
            ? adminService.users({ page: 1, limit: 100 }).then((r) => (Array.isArray(r) ? r : (r?.items ?? [])))
            : userService.list().then((r) => (Array.isArray(r) ? r : (r as any)?.items ?? [])),
        MOCK_ADMIN_USERS,
      ),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminService.updateRole(id, role),
    onSuccess: () => {
      toast.success("Role updated in PostgreSQL database");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to update role.")),
  });

  const unlock = useMutation({
    mutationFn: (id: string) => adminService.unlock(id),
    onSuccess: () => {
      toast.success("Account unlocked in PostgreSQL database");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to unlock account.")),
  });

  const users = (data?.data ?? []) as any[];
  const locked = users.filter((u) => u.isLocked).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const name = String(u.name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const dept = String(u.department ?? "").toLowerCase();
      const role = String(u.role ?? "").toLowerCase();

      const matchQ = !q || name.includes(q) || email.includes(q) || dept.includes(q) || role.includes(q);
      const matchR = roleFilter === "ALL" || u.role === roleFilter;
      return matchQ && matchR;
    });
  }, [users, query, roleFilter]);

  return (
    <AppShell title="Administration" subtitle="Directorate control panel" demo={data?.demo}>
      <SectionGlow />

      {!isAdmin && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-pending/40 bg-pending/10 p-4 text-xs text-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-pending" />
          <div className="space-y-1">
            <p className="font-bold text-pending">Read-Only Directory View (Not Logged in as Administrator)</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You are currently signed in as <span className="font-semibold text-foreground">{user?.name} ({user?.role})</span>.
              The backend restricts account provisioning, role changes, and unlocking to the <span className="font-mono font-semibold text-primary">ADMIN</span> role.
            </p>
            <p className="text-[11px] text-muted-foreground">
              To manage officers and view full security logs, sign out and log in with Directorate Admin credentials:
              <span className="ml-1 font-mono font-semibold text-foreground">admin@slidms.gov.in</span> (Password: <span className="font-mono font-semibold text-foreground">Password123!</span>).
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Administration</h2>
          <p className="text-sm text-muted-foreground">
            Officer provisioning and role-based access control
          </p>
        </div>
        {isAdmin && <NewUserDialog />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Officers" value={users.length} icon={Users} />
        <MetricCard
          label="Administrators"
          value={users.filter((u) => u.role === "ADMIN").length}
          icon={ShieldCheck}
          tone="signed"
        />
        <MetricCard
          label="Forensic Officers"
          value={users.filter((u) => u.role === "FORENSIC_OFFICER").length}
          icon={ShieldCheck}
          tone="chain"
        />
        <MetricCard label="Locked Accounts" value={locked} icon={LockOpen} tone="pending" />
      </div>

      <GlassPanel className="mt-4">
        <PanelHeader
          title="Officer Directory"
          subtitle={`${rows.length} of ${users.length} officers`}
          icon={Users}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, department..."
                  className="h-8 w-56 rounded-lg border border-input bg-background-raised pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background-raised px-2.5 text-xs text-foreground"
              >
                <option value="ALL">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        {isLoading ? (
          <LoadingBlock label="Loading officer directory" />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No officers match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-subtle">
                  <th className="px-4 py-2.5 text-left font-semibold">Officer</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Email</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Department</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Role</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Last Login</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-primary/6">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-foreground">{u.name}</p>
                      {u.isLocked ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-danger">
                          Locked
                        </p>
                      ) : null}
                    </td>
                    <td className="mono px-4 py-3 text-[11px] text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{u.department}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="mono px-4 py-3 text-[11px] text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as Role })}
                          className="h-8 rounded-lg border border-input bg-background-raised px-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => unlock.mutate(u.id)}
                          disabled={!u.isLocked || unlock.isPending}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-pending/35 px-2.5 text-[11px] font-semibold text-pending transition-colors hover:bg-pending/10 disabled:opacity-35"
                        >
                          <LockOpen className="size-3" /> Unlock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </AppShell>
  );
}

function NewUserDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "INVESTIGATOR" as Role,
    department: "Cyber Crime Cell",
  });

  const mutation = useMutation({
    mutationFn: () => adminService.createUser(form),
    onSuccess: () => {
      toast.success("Officer account created");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to create account.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="glow-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-3.5 text-xs font-semibold text-primary-foreground">
        <UserPlus className="size-4" /> New Officer
      </DialogTrigger>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Create Officer Account</DialogTitle>
          <DialogDescription>
            Accounts are provisioned with role-based access and full audit logging.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
          <input
            required
            type="email"
            placeholder="Official email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputCls}
          />
          <input
            required
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className={inputCls}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className={inputCls}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="glow-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Account
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
