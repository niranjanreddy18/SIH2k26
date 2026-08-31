import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  Gavel,
  Loader2,
  Lock,
  Scale,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { RoleBadge } from "@/components/slidms/badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOCK_DIRECTORY } from "@/lib/slidms/mock";
import { type Role, type User } from "@/lib/slidms/types";
import { errorMessage, withFallback } from "@/services/api";
import { evidenceService, userService } from "@/services/slidms";

interface TransferCustodyDialogProps {
  id: string | null;
  evidenceName?: string | undefined;
  caseId?: string | undefined;
  onClose: () => void;
  onSuccess?: (() => void) | undefined;
}

const TRANSFER_ACTIONS = [
  {
    value: "TRANSFERRED_TO_FORENSICS",
    label: "Transfer to Forensics Lab",
    description: "Hand over for digital bit-stream imaging, extraction, DNA or ballistic analysis.",
    icon: FlaskConical,
    tone: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    defaultStatus: "ANALYZED",
    recommendedRole: "FORENSIC_OFFICER",
  },
  {
    value: "ANALYSIS_IN_PROGRESS",
    label: "Forensic Analysis Started",
    description: "Mark evidence actively under lab examination & integrity verification.",
    icon: FlaskConical,
    tone: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    defaultStatus: "ANALYZED",
    recommendedRole: "FORENSIC_OFFICER",
  },
  {
    value: "RETURNED_TO_VAULT",
    label: "Return to Secure Vault",
    description: "Return analyzed item to high-security central police evidence lockup.",
    icon: Lock,
    tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    defaultStatus: "STORED",
    recommendedRole: "INVESTIGATOR",
  },
  {
    value: "PRODUCED_IN_COURT",
    label: "Produce in Judicial Court",
    description: "Present physical or digital evidence before the Magistrate or Trial Court.",
    icon: Gavel,
    tone: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    defaultStatus: "SUBMITTED",
    recommendedRole: "SENIOR_OFFICER",
  },
  {
    value: "OFFICER_HANDOVER",
    label: "Internal Officer Handover",
    description: "Transfer primary custody to another investigating or supervisory officer.",
    icon: ArrowRightLeft,
    tone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    defaultStatus: "TRANSFERRED",
    recommendedRole: "INVESTIGATOR",
  },
];

export function TransferCustodyDialog({
  id,
  evidenceName,
  caseId,
  onClose,
  onSuccess,
}: TransferCustodyDialogProps) {
  const qc = useQueryClient();

  const [actionType, setActionType] = useState("TRANSFERRED_TO_FORENSICS");
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");
  const [tamperSealNumber, setTamperSealNumber] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Fetch real users from backend directory
  const usersQuery = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () =>
      withFallback(
        () => (userService.list() as Promise<any>).then((r: any) => (Array.isArray(r) ? r : (r?.items ?? []))),
        MOCK_DIRECTORY,
      ),
  });

  const allUsers = (usersQuery.data?.data ?? MOCK_DIRECTORY) as (User & { department?: string })[];

  // Auto-select initial recipient when users load or action changes
  useEffect(() => {
    if (allUsers.length > 0 && !toUserId) {
      const selectedAction = TRANSFER_ACTIONS.find((a) => a.value === actionType);
      const matchedUser = allUsers.find(
        (u) => u.role === selectedAction?.recommendedRole
      ) || allUsers[0];
      if (matchedUser) {
        setToUserId(matchedUser.id);
      }
    }
  }, [allUsers, actionType, toUserId]);

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter === "ALL") return true;
    return u.role === roleFilter;
  });

  const selectedActionConfig = TRANSFER_ACTIONS.find((a) => a.value === actionType) || TRANSFER_ACTIONS[0]!;

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No evidence selected.");
      if (!toUserId) throw new Error("Please select a recipient officer or lab custodian.");
      if (!reason.trim()) throw new Error("Custody transfer reason is required for legal chain of custody.");

      return evidenceService.transfer(id, {
        toUserId,
        reason: reason.trim(),
        action: actionType,
        status: selectedActionConfig.defaultStatus,
        tamperSealNumber: tamperSealNumber.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Custody transfer recorded on blockchain & hash linked");

      // Invalidate relevant query caches
      qc.invalidateQueries({ queryKey: ["evidence"] });
      if (caseId) {
        qc.invalidateQueries({ queryKey: ["case", caseId, "evidence"] });
        qc.invalidateQueries({ queryKey: ["case", caseId] });
      }
      if (id) {
        qc.invalidateQueries({ queryKey: ["evidence", id, "timeline"] });
        qc.invalidateQueries({ queryKey: ["evidence", id] });
      }
      qc.invalidateQueries({ queryKey: ["cases"] });

      // Reset form
      setReason("");
      setTamperSealNumber("");
      onClose();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Unable to record custody transfer."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate();
  };

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-xl border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <ArrowRightLeft className="size-4" />
            </span>
            <span>Evidence Custody Handover &amp; Forensics Flow</span>
          </DialogTitle>
          <DialogDescription>
            Record tamper-evident custody transition for{" "}
            <span className="font-bold text-foreground">
              {evidenceName || "selected evidence"}
            </span>
            . Generates SHA-256 hash linked to previous block.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Action / Destination Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground">Transfer Stage &amp; Purpose *</label>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRANSFER_ACTIONS.map((a) => {
                const isSelected = actionType === a.value;
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => {
                      setActionType(a.value);
                      const matched = allUsers.find((u) => u.role === a.recommendedRole);
                      if (matched) setToUserId(matched.id);
                    }}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border bg-background-raised/60 hover:border-border-strong hover:bg-background-raised"
                    }`}
                  >
                    <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border text-xs ${a.tone}`}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{a.label}</p>
                      <p className="line-clamp-2 text-[10px] text-muted-foreground">{a.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Receiving Custodian / Specialist *
              </label>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>Filter role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
                >
                  <option value="ALL">All Roles</option>
                  <option value="FORENSIC_OFFICER">Forensics Only</option>
                  <option value="INVESTIGATOR">Investigators Only</option>
                  <option value="SENIOR_OFFICER">Senior Officers</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Select destination officer or lab specialist...
              </option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace(/_/g, " ")}) — {u.department || "Cyber Crime Cell"}
                </option>
              ))}
            </select>
          </div>

          {/* Tamper Seal & Notes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Tamper Seal Tag # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. SEAL-8842-CYBER"
                value={tamperSealNumber}
                onChange={(e) => setTamperSealNumber(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Updated Evidence Status
              </label>
              <div className="mt-1 flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-bold text-chain">
                {selectedActionConfig.defaultStatus}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Official Reason &amp; Mandate *
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Handed over to Central Forensic Science Lab for bit-stream imaging and deleted partition carving under Sec 65B Indian Evidence Act."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background-raised p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={transferMutation.isPending}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferMutation.isPending || !toUserId || !reason.trim()}
              className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Recording Chain Hash...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-3.5" />
                  Sign &amp; Record Handover
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
