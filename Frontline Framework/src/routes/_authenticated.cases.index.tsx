import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  FileStack,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/slidms/AppShell";
import { CaseStatusBadge, ClassificationBadge } from "@/components/slidms/badges";
import { EmptyState, GlassPanel, LoadingBlock } from "@/components/slidms/panels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { relativeTime } from "@/lib/slidms/format";
import { MOCK_CASES } from "@/lib/slidms/mock";
import { CASE_STATUSES, CLASSIFICATIONS, type Classification } from "@/lib/slidms/types";
import { errorMessage, withFallback } from "@/services/api";
import { caseService } from "@/services/slidms";

export const Route = createFileRoute("/_authenticated/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — SLIDMS Investigation Repository" },
      {
        name: "description",
        content:
          "Manage and track all investigation cases with FIR numbers, status, classification tiers and document counts.",
      },
      { property: "og:title", content: "Cases — SLIDMS Investigation Repository" },
      {
        property: "og:description",
        content: "Search, filter and open investigation case files with full audit traceability.",
      },
    ],
  }),
  component: CasesPage,
});

const inputCls =
  "h-9 rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

function CasesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [classification, setClassification] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading } = useQuery({
    queryKey: ["cases", "list"],
    queryFn: () => withFallback(() => caseService.list({ page: 1, limit: 100 }).then((r) => (Array.isArray(r) ? r : (r?.items ?? []))), MOCK_CASES),
  });

  const all = (data?.data ?? []) as any[];
  const filtered = useMemo(
    () =>
      all.filter((c) => {
        const q = query.trim().toLowerCase();
        const fir = String(c.firNumber ?? c.fir_number ?? "").toLowerCase();
        const title = String(c.title ?? "").toLowerCase();
        const desc = String(c.description ?? "").toLowerCase();
        const crime = String(c.crimeType ?? c.crime_type ?? "").toLowerCase();
        const creator = String(c.createdBy?.name ?? c.creator_name ?? "").toLowerCase();
        const caseStatus = String(c.status ?? "").toLowerCase();
        const caseClass = String(c.classification ?? "").toLowerCase();

        const matchQ =
          !q ||
          fir.includes(q) ||
          title.includes(q) ||
          desc.includes(q) ||
          crime.includes(q) ||
          creator.includes(q) ||
          caseStatus.includes(q) ||
          caseClass.includes(q);

        const matchS = status === "ALL" || c.status === status;
        const matchC = classification === "ALL" || c.classification === classification;
        return matchQ && matchS && matchC;
      }),
    [all, query, status, classification],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * limit, current * limit);

  return (
    <AppShell title="Cases" subtitle="Manage and track all investigation cases" demo={data?.demo}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-56 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(560px 220px at 30% 0%, rgba(96,165,250,0.9), transparent 70%)",
        }}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-border bg-primary/10 text-primary">
            <Scale className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Cases</h2>
            <p className="text-sm text-muted-foreground">
              Manage and track all investigation cases
            </p>
          </div>
        </div>
        <NewCaseDialog />
      </div>

      <GlassPanel>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by FIR number or case title..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="ALL">All statuses</option>
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className={inputCls}
          >
            <option value="ALL">All classifications</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            onClick={() => toast.info("Advanced filters: date range, crime type, officer.")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" /> More Filters
          </button>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading case repository" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No cases match your filters"
            description="Adjust the search term, status or classification filter to widen the results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-border bg-background-raised/70 text-[10px] uppercase tracking-wider text-subtle">
                  <th className="px-4 py-2.5 text-left font-semibold">FIR Number</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Case Title</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Investigating Officer</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Classification</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Docs</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Evid.</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-primary/6"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/cases/$id"
                        params={{ id: c.id }}
                        className="mono text-xs text-primary hover:underline"
                      >
                        {c.firNumber}
                      </Link>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <Link
                        to="/cases/$id"
                        params={{ id: c.id }}
                        className="block truncate text-xs font-medium text-foreground hover:text-primary"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <CaseStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ClassificationBadge classification={c.classification} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="mono inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileText className="size-3 text-primary" /> {c.documentCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="mono inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileStack className="size-3 text-chain" /> {c.evidenceCount ?? 0}
                      </span>
                    </td>
                    <td className="mono px-4 py-3 text-right text-[11px] text-muted-foreground">
                      {relativeTime(c.updatedAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
          <p className="text-[11px] text-subtle">
            Showing {rows.length} of {filtered.length} cases
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <span className="mono px-1 text-[11px] text-foreground">
              {current} / {pages}
            </span>
            <button
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </GlassPanel>
    </AppShell>
  );
}

function NewCaseDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firNumber: "",
    title: "",
    description: "",
    crimeType: "Cyber Crime",
    classification: "INTERNAL" as Classification,
  });

  const mutation = useMutation({
    mutationFn: () => caseService.create(form),
    onSuccess: () => {
      toast.success("Case registered successfully");
      qc.invalidateQueries({ queryKey: ["cases"] });
      setOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to register case.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="glow-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-3.5 text-xs font-semibold text-primary-foreground">
        <Plus className="size-4" /> New Case
      </DialogTrigger>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Register New Case</DialogTitle>
          <DialogDescription>
            Case registration is recorded in the immutable audit chain.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <Field label="FIR Number">
            <input
              required
              value={form.firNumber}
              onChange={(e) => setForm({ ...form, firNumber: e.target.value })}
              placeholder="FIR/2026/0001"
              className={`${inputCls} mono w-full`}
            />
          </Field>
          <Field label="Case Title">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Cyber Fraud & Identity Theft"
              className={`${inputCls} w-full`}
            />
          </Field>
          <Field label="Crime Type">
            <input
              value={form.crimeType}
              onChange={(e) => setForm({ ...form, crimeType: e.target.value })}
              className={`${inputCls} w-full`}
            />
          </Field>
          <Field label="Classification">
            <select
              value={form.classification}
              onChange={(e) =>
                setForm({ ...form, classification: e.target.value as Classification })
              }
              className={`${inputCls} w-full`}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-input bg-background-raised p-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Brief summary of the offence and initial findings"
            />
          </Field>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="glow-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-primary to-primary-bright text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Register Case
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
