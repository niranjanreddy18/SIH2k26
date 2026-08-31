import { AlertTriangle, ShieldCheck, Link2, Clock } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/slidms/format";
import type { VerifyResult } from "@/lib/slidms/types";

export function VerifyModal({
  open,
  onOpenChange,
  result,
  documentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: VerifyResult | null;
  documentName?: string | undefined;
}) {
  const verified = result?.status === "VERIFIED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg border-border bg-card p-0 text-foreground"
      >
        {result ? (
          <div className="animate-fade-in">
            <div
              className={`relative flex flex-col items-center gap-3 overflow-hidden border-b border-border px-6 py-8 text-center ${
                verified ? "bg-verified/8" : "bg-danger/10"
              }`}
            >
              <span
                className={`grid size-20 place-items-center rounded-2xl border ${
                  verified
                    ? "border-verified/45 bg-verified/12 text-verified"
                    : "animate-pulse-danger border-danger/50 bg-danger/12 text-danger"
                }`}
              >
                {verified ? (
                  <ShieldCheck className="size-10" />
                ) : (
                  <AlertTriangle className="size-10" />
                )}
              </span>
              <div>
                <h2
                  className={`text-lg font-semibold tracking-[0.14em] ${
                    verified ? "text-verified" : "text-danger"
                  }`}
                >
                  {verified ? "DOCUMENT VERIFIED" : "INTEGRITY MISMATCH"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {verified
                    ? "Hash matches the registered ledger entry. No tampering detected."
                    : "Current file hash does not match the registered hash. Possible tampering — escalate immediately."}
                </p>
              </div>
              {documentName ? (
                <p className="text-[11px] text-subtle">{documentName}</p>
              ) : null}
            </div>

            <div className="space-y-3 px-6 py-5">
              <HashRow label="Registered SHA-256" value={result.registeredHash} ok={verified} />
              <HashRow label="Current SHA-256" value={result.currentHash} ok={verified} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background-raised p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Link2 className="size-3 text-chain" /> Blockchain Ref
                  </p>
                  <p className="mono mt-1 break-all text-[11px] text-chain">
                    {result.blockchainRef}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background-raised p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock className="size-3 text-primary" /> Verified At
                  </p>
                  <p className="mono mt-1 text-[11px] text-foreground">
                    {formatDateTime(result.verifiedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 py-14">
            <div className="relative grid size-20 place-items-center overflow-hidden rounded-2xl border border-primary/40 bg-primary/10 text-primary">
              <ShieldCheck className="size-10" />
              <span className="animate-scan absolute inset-x-0 h-6 bg-linear-to-b from-primary/40 to-transparent" />
            </div>
            <p className="text-sm font-medium text-foreground">Verifying document integrity…</p>
            <p className="text-xs text-muted-foreground">
              Recomputing SHA-256 and comparing against the ledger record
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HashRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        ok ? "border-verified/30 bg-verified/6" : "border-danger/35 bg-danger/8"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mono mt-1 break-all text-[11px] text-foreground">{value}</p>
    </div>
  );
}
