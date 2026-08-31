import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Calendar, FileStack, Loader2, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/services/api";
import { evidenceService } from "@/services/slidms";

const EVIDENCE_TYPES = [
  "DIGITAL_EVIDENCE",
  "PHYSICAL_EVIDENCE",
  "WEAPON",
  "DOCUMENT",
  "FORENSIC_SAMPLE",
  "CASH",
  "VEHICLE",
  "CCTV_FOOTAGE",
  "OTHER",
];

interface RegisterEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string | undefined;
  cases?: { id: string; firNumber?: string; title?: string }[] | undefined;
  onSuccess?: (() => void) | undefined;
}

export function RegisterEvidenceDialog({
  open,
  onOpenChange,
  caseId: initialCaseId,
  cases = [],
  onSuccess,
}: RegisterEvidenceDialogProps) {
  const qc = useQueryClient();

  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || cases[0]?.id || "");
  const [type, setType] = useState("DIGITAL_EVIDENCE");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
    } else if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0]?.id || "");
    }
  }, [initialCaseId, cases]);

  const targetCaseId = initialCaseId || selectedCaseId;

  const createEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!targetCaseId) throw new Error("Please select a target case file.");
      const finalType = type === "OTHER" && customType.trim() ? customType.trim() : type;
      if (!finalType) throw new Error("Evidence type is required.");
      if (!description.trim()) throw new Error("Evidence description is required.");

      return evidenceService.create(targetCaseId, {
        type: finalType,
        description: description.trim(),
        collectedAt: new Date(collectedAt).toISOString(),
      });
    },
    onSuccess: (data: any) => {
      const ev = data?.data || data;
      toast.success(`Evidence registered in vault & chain of custody started`);

      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: ["case", targetCaseId, "evidence"] });
      qc.invalidateQueries({ queryKey: ["case", targetCaseId] });
      qc.invalidateQueries({ queryKey: ["evidence"] });
      qc.invalidateQueries({ queryKey: ["cases"] });

      // Reset form
      setType("DIGITAL_EVIDENCE");
      setCustomType("");
      setDescription("");
      setCollectedAt(new Date().toISOString().slice(0, 16));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to register evidence."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvidenceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-chain/30 bg-chain/10 text-chain">
              <Box className="size-4" />
            </span>
            <span>Register New Evidence</span>
          </DialogTitle>
          <DialogDescription>
            Logs physical or digital items into the tamper-proof evidence register and establishes the cryptographic chain of custody.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Target Case selection (if opened globally) */}
          {!initialCaseId && cases.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-foreground">Target Case File *</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                required
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firNumber ? `${c.firNumber} — ` : ""}
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Evidence Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {EVIDENCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Seizure / Collection Date *</label>
              <div className="relative mt-1">
                <input
                  type="datetime-local"
                  required
                  value={collectedAt}
                  onChange={(e) => setCollectedAt(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {type === "OTHER" && (
            <div>
              <label className="text-xs font-semibold text-foreground">Custom Evidence Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Encrypted USB Token, CCTV DVR Box"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground">Detailed Description *</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Samsung 980 Pro 1TB NVMe SSD seized from suspect primary desktop workstation with intact tamper seal #TS-8842."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background-raised p-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={createEvidenceMutation.isPending}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvidenceMutation.isPending || !description.trim()}
              className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-chain to-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {createEvidenceMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Recording on Ledger...
                </>
              ) : (
                <>
                  <Box className="size-3.5" />
                  Register Evidence
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
