import { Loader2, WifiOff, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function GlassPanel({
  className,
  children,
  glow = false,
}: {
  className?: string | undefined;
  children: React.ReactNode;
  glow?: boolean | undefined;
}) {
  return (
    <section
      className={cn(
        "glass-panel animate-fade-in relative overflow-hidden",
        glow && "glow-primary",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string | undefined;
  icon?: LucideIcon | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string | undefined;
  tone?: "primary" | "pending" | "chain" | "signed" | "verified" | undefined;
}) {
  const toneMap = {
    primary: "text-primary border-primary/35 bg-primary/10",
    pending: "text-pending border-pending/35 bg-pending/10",
    chain: "text-chain border-chain/35 bg-chain/10",
    signed: "text-signed border-signed/35 bg-signed/10",
    verified: "text-verified border-verified/35 bg-verified/10",
  } as const;

  return (
    <GlassPanel className="animate-slide-up p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span
          className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", toneMap[tone])}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none text-foreground tabular-nums">
            {value}
          </p>
          {trend ? <p className="mt-1.5 text-[11px] text-subtle">{trend}</p> : null}
        </div>
      </div>
    </GlassPanel>
  );
}

export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-xs font-medium text-foreground break-all",
          mono && "mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-pending/35 bg-pending/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pending">
      <WifiOff className="size-3" /> Demo data
    </span>
  );
}

export function LoadingBlock({ label = "Loading secure data" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" /> {label}…
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-border bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function StatusStripItem({
  icon: Icon,
  label,
  value,
  tone = "verified",
  pulse = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "verified" | "pending" | "danger" | "chain" | undefined;
  pulse?: boolean | undefined;
}) {
  const toneMap = {
    verified: "text-verified border-verified/35 bg-verified/10",
    pending: "text-pending border-pending/35 bg-pending/10",
    danger: "text-danger border-danger/35 bg-danger/10",
    chain: "text-chain border-chain/35 bg-chain/10",
  } as const;
  return (
    <div className="glass-panel flex items-center gap-3 px-4 py-3">
      <span className={cn("grid size-8 place-items-center rounded-lg border", toneMap[tone])}>
        <Icon className={cn("size-4", pulse && "animate-pulse")} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function SectionGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-64 opacity-70"
      style={{
        background:
          "radial-gradient(600px 220px at 25% 100%, rgba(59,130,246,0.16), transparent 70%), radial-gradient(520px 200px at 80% 100%, rgba(129,140,248,0.14), transparent 70%)",
      }}
    />
  );
}
