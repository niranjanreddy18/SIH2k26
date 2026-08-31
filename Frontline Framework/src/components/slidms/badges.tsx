import { Lock, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/slidms/format";
import type {
  CaseStatus,
  Classification,
  DocumentStatus,
  EvidenceStatus,
  Role,
} from "@/lib/slidms/types";

const base =
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap";

const tone = {
  slate: "border-subtle/40 bg-subtle/10 text-muted-foreground",
  blue: "border-primary/40 bg-primary/12 text-primary",
  green: "border-verified/40 bg-verified/12 text-verified",
  amber: "border-pending/40 bg-pending/12 text-pending",
  red: "border-danger/45 bg-danger/12 text-danger",
  purple: "border-signed/40 bg-signed/12 text-signed",
  indigo: "border-chain/40 bg-chain/12 text-chain",
} as const;

type Tone = keyof typeof tone;

export function Chip({
  children,
  variant = "slate",
  className,
  icon,
}: {
  children: React.ReactNode;
  variant?: Tone | undefined;
  className?: string | undefined;
  icon?: React.ReactNode | undefined;
}) {
  return (
    <span className={cn(base, tone[variant], className)}>
      {icon}
      {children}
    </span>
  );
}

const ROLE_TONE: Record<Role, Tone> = {
  INVESTIGATOR: "blue",
  SENIOR_OFFICER: "purple",
  FORENSIC_OFFICER: "green",
  ADMIN: "red",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Chip variant={ROLE_TONE[role] ?? "slate"} className={className}>
      {titleCase(role)}
    </Chip>
  );
}

const CLASSIFICATION_TONE: Record<Classification, Tone> = {
  PUBLIC: "slate",
  INTERNAL: "blue",
  CONFIDENTIAL: "amber",
  HIGHLY_CONFIDENTIAL: "red",
};

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: Classification;
  className?: string | undefined;
}) {
  return (
    <Chip
      variant={CLASSIFICATION_TONE[classification] ?? "slate"}
      className={cn(classification === "HIGHLY_CONFIDENTIAL" && "animate-pulse-danger", className)}
    >
      {classification === "HIGHLY_CONFIDENTIAL" ? "Highly Conf." : titleCase(classification)}
    </Chip>
  );
}

const DOC_TONE: Record<DocumentStatus, Tone> = {
  DRAFT: "slate",
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  APPROVED: "green",
  REJECTED: "red",
  SIGNED: "purple",
  LOCKED: "indigo",
};

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string | undefined;
}) {
  return (
    <Chip
      variant={DOC_TONE[status] ?? "slate"}
      className={className}
      icon={
        status === "LOCKED" ? (
          <Lock className="size-3" />
        ) : status === "SIGNED" ? (
          <ShieldCheck className="size-3" />
        ) : undefined
      }
    >
      {titleCase(status)}
    </Chip>
  );
}

const CASE_TONE: Record<CaseStatus, Tone> = {
  OPEN: "blue",
  UNDER_INVESTIGATION: "amber",
  UNDER_REVIEW: "amber",
  CHARGESHEET_PREPARED: "purple",
  COURT_SUBMITTED: "indigo",
  CLOSED: "green",
  ARCHIVED: "slate",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <Chip variant={CASE_TONE[status] ?? "slate"} className={className}>
      {titleCase(status)}
    </Chip>
  );
}

const EVIDENCE_TONE: Partial<Record<EvidenceStatus, Tone>> = {
  REGISTERED: "slate",
  COLLECTED: "blue",
  UPLOADED: "blue",
  STORED: "indigo",
  TRANSFERRED: "amber",
  RECEIVED: "blue",
  ANALYZED: "green",
  REPORT_GENERATED: "purple",
  SUBMITTED: "blue",
  ARCHIVED: "slate",
};

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  return <Chip variant={EVIDENCE_TONE[status] ?? "slate"}>{titleCase(status)}</Chip>;
}

export function ResultBadge({ result }: { result: string }) {
  const ok = result?.toUpperCase() === "SUCCESS";
  return <Chip variant={ok ? "green" : "red"}>{titleCase(result)}</Chip>;
}
