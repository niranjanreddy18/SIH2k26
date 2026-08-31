import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, MinusCircle, Play, PlugZap, XCircle } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/slidms/AppShell";
import { GlassPanel, PanelHeader, SectionGlow } from "@/components/slidms/panels";
import { runEndpointProbes, type ProbeResult } from "@/lib/slidms/endpointProbe";
import { API_BASE_URL } from "@/services/api";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "API Diagnostics — SLIDMS" },
      {
        name: "description",
        content:
          "Run read-only probes against every SLIDMS backend endpoint and inspect response contracts.",
      },
      { property: "og:title", content: "API Diagnostics — SLIDMS" },
      {
        property: "og:description",
        content: "Verify backend connectivity and response shapes for every SLIDMS endpoint.",
      },
    ],
  }),
  component: DiagnosticsPage,
});

const STATE_META = {
  ok: { icon: CheckCircle2, tone: "text-verified", label: "OK" },
  warn: { icon: AlertTriangle, tone: "text-pending", label: "Mismatch" },
  fail: { icon: XCircle, tone: "text-destructive", label: "Failed" },
  skipped: { icon: MinusCircle, tone: "text-subtle", label: "Skipped" },
} as const;

function DiagnosticsPage() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResults([]);
    const collected: ProbeResult[] = [];
    await runEndpointProbes((r) => {
      collected.push(r);
      setResults([...collected]);
      // eslint-disable-next-line no-console
      console.info(
        `[SLIDMS probe] ${r.spec.label} → ${r.status} (${r.durationMs}ms)`,
        r.state === "ok" ? "" : { state: r.state, missing: r.missing, message: r.message, shape: r.shape },
      );
    });
    setRanAt(new Date().toLocaleTimeString());
    setRunning(false);
  }

  const tally = {
    ok: results.filter((r) => r.state === "ok").length,
    warn: results.filter((r) => r.state === "warn").length,
    fail: results.filter((r) => r.state === "fail").length,
    skipped: results.filter((r) => r.state === "skipped").length,
  };

  return (
    <AppShell title="API Diagnostics" subtitle="Read-only endpoint verification">
      <SectionGlow />

      <GlassPanel className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Backend base URL</p>
            <p className="mono mt-1 truncate text-xs text-primary">{API_BASE_URL}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Every probe is a GET request — nothing is created, modified or deleted.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/25 disabled:opacity-60"
          >
            <Play className="size-3.5" aria-hidden />
            {running ? "Running probes…" : "Run all endpoint tests"}
          </button>
        </div>

        {results.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <Tally label="Passing" value={tally.ok} tone="text-verified" />
            <Tally label="Contract mismatch" value={tally.warn} tone="text-pending" />
            <Tally label="Failing" value={tally.fail} tone="text-destructive" />
            <Tally label="Skipped" value={tally.skipped} tone="text-subtle" />
            {ranAt ? <span className="mono text-subtle">last run {ranAt}</span> : null}
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel>
        <PanelHeader
          title="Endpoint Results"
          subtitle={`${results.length} of ${results.length || "—"} probes reported`}
          icon={PlugZap}
        />
        <div className="divide-y divide-border/50">
          {results.length === 0 && !running ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              Press “Run all endpoint tests” to probe every backend endpoint from this browser.
            </p>
          ) : null}
          {results.map((r) => {
            const meta = STATE_META[r.state];
            const Icon = meta.icon;
            return (
              <details key={r.spec.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-xs">
                  <Icon className={`size-4 shrink-0 ${meta.tone}`} aria-hidden />
                  <span className="font-semibold text-foreground">{r.spec.label}</span>
                  <span className="mono text-[11px] text-muted-foreground">{r.spec.path}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className={`mono text-[11px] ${meta.tone}`}>{r.status}</span>
                    {r.count !== undefined ? (
                      <span className="mono text-[10px] text-subtle">{r.count} rows</span>
                    ) : null}
                    {r.envelope !== "unknown" ? (
                      <span className="mono text-[10px] text-subtle">{r.envelope}</span>
                    ) : null}
                    <span className="mono text-[10px] text-subtle">{r.durationMs}ms</span>
                  </span>
                </summary>
                <div className="mt-3 space-y-2 pl-7">
                  {r.message ? (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="text-subtle">message:</span>{" "}
                      {typeof r.message === "string" ? r.message : JSON.stringify(r.message)}
                    </p>
                  ) : null}
                  {r.missing.length > 0 ? (
                    <p className="text-[11px] text-pending">
                      Missing fields the UI reads: <span className="mono">{r.missing.join(", ")}</span>
                    </p>
                  ) : null}
                  <pre className="mono max-h-64 overflow-auto rounded-lg border border-border bg-background-raised/70 p-3 text-[10px] leading-relaxed text-muted-foreground">
                    {JSON.stringify(r.shape, null, 2)}
                  </pre>
                </div>
              </details>
            );
          })}
        </div>
      </GlassPanel>
    </AppShell>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="rounded-md border border-border bg-background-raised px-2 py-1">
      <span className={`mono font-semibold ${tone}`}>{value}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
