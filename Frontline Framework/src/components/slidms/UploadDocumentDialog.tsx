import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, FileText, Loader2, Upload, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENT_TYPES, type Classification, type DocumentType } from "@/lib/slidms/types";
import { errorMessage } from "@/services/api";
import { documentService } from "@/services/slidms";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string | undefined;
  cases?: { id: string; firNumber?: string; title?: string }[] | undefined;
  onSuccess?: (() => void) | undefined;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  caseId: initialCaseId,
  cases = [],
  onSuccess,
}: UploadDocumentDialogProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || cases[0]?.id || "");
  const [name, setName] = useState("");
  const [type, setType] = useState<DocumentType>("WITNESS_STATEMENT");
  const [classification, setClassification] = useState<Classification>("INTERNAL");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  // Sync selected case if prop changes
  React.useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
    } else if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0]?.id || "");
    }
  }, [initialCaseId, cases]);

  const targetCaseId = initialCaseId || selectedCaseId;

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!targetCaseId) throw new Error("Please select a target case file.");
      if (!name.trim()) throw new Error("Document title is required.");
      if (!file) throw new Error("Please select a document file to upload.");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("type", type);
      formData.append("classification", classification);
      formData.append("file", file);

      const res = await documentService.create(targetCaseId, formData);
      return res;
    },
    onSuccess: (data: any) => {
      const doc = data?.data || data;
      const hash = doc?.currentVersion?.hash || doc?.hash || "";
      const hashSnippet = hash ? ` — SHA-256 ${hash.slice(0, 12)}…` : "";
      toast.success(`Document uploaded successfully${hashSnippet}`);

      // Invalidate relevant caches
      qc.invalidateQueries({ queryKey: ["case", targetCaseId, "documents"] });
      qc.invalidateQueries({ queryKey: ["case", targetCaseId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["cases"] });

      // Reset form
      setName("");
      setType("WITNESS_STATEMENT");
      setClassification("INTERNAL");
      setFile(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Failed to upload document."));
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      if (!name) {
        // Auto fill document name from filename without extension
        const cleanName = dropped.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setName(cleanName);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!name) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setName(cleanName);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Upload className="size-4" />
            </span>
            <span>Upload Case Document</span>
          </DialogTitle>
          <DialogDescription>
            Files are cryptographically hashed with SHA-256 and anchored to the tamper-evident audit ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* If no initial caseId, let user choose target case */}
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

          <div>
            <label className="text-xs font-semibold text-foreground">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Witness Statement — Informant Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Document Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Classification Tier *</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as Classification)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background-raised px-3 text-xs text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="RESTRICTED">RESTRICTED</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="SECRET">SECRET</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="text-xs font-semibold text-foreground">File Attachment *</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragging
                  ? "border-primary bg-primary/10"
                  : file
                  ? "border-verified/60 bg-verified/5"
                  : "border-border bg-background-raised/50 hover:border-primary/50 hover:bg-background-raised"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-xl border border-verified/30 bg-verified/15 text-verified">
                    <FileText className="size-5" />
                  </span>
                  <p className="mt-2 text-xs font-bold text-foreground">{file.name}</p>
                  <p className="mono mt-0.5 text-[10px] text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CloudUpload className="size-8 text-muted-foreground opacity-60" />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    Drag &amp; drop file here, or click to browse
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Supported: PDF, DOCX, PNG, JPG, TXT, JSON · Max 50 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-background-raised hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !file || !name.trim()}
              className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary to-primary-bright px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Uploading &amp; Hashing...
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  Upload Document
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
