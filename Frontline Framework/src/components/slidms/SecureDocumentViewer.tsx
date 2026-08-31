import {
  AlertTriangle,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import api, { fileUrl } from "@/services/api";
import { formatBytes, shortHash } from "@/lib/slidms/format";
import { documentService } from "@/services/slidms";

interface SecureDocumentViewerProps {
  documentId: string;
  documentName: string;
  versionNo?: number | undefined;
  mimeType?: string | undefined;
  fileSize?: number | undefined;
  hash?: string | undefined;
  className?: string | undefined;
  heightClass?: string | undefined;
  onExpand?: (() => void) | undefined;
  showControls?: boolean | undefined;
}

export function SecureDocumentViewer({
  documentId,
  documentName,
  versionNo = 1,
  mimeType: propMimeType,
  fileSize,
  hash,
  className = "",
  heightClass = "min-h-[520px] h-[560px]",
  onExpand,
  showControls = true,
}: SecureDocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>("");
  const [textContent, setTextContent] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      setTextContent(null);
      setBlobUrl(null);

      // Use the versioned endpoint when a specific version is requested,
      // otherwise fall back to the current-version preview route.
      const previewUrl =
        versionNo && versionNo > 1
          ? `/documents/${documentId}/versions/${versionNo}/preview`
          : `/documents/${documentId}/preview`;

      try {
        const response = await api.get(previewUrl, {
          responseType: "blob",
        });

        if (!active) return;

        const blob = response.data as Blob;
        const type = (blob.type || propMimeType || "application/octet-stream").toLowerCase();
        setDetectedType(type);

        if (type.startsWith("text/") || type.includes("json") || type.includes("csv")) {
          const text = await blob.text();
          if (active) setTextContent(text);
        }

        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(createdUrl);
          setLoading(false);
        }
      } catch (err: any) {
        if (!active) return;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load secure document stream from evidence vault.";
        setError(msg);
        setLoading(false);
      }
    }

    loadDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [documentId, versionNo, reloadKey, propMimeType]);

  const isImage = detectedType.startsWith("image/");
  const isPdf = detectedType.includes("pdf");
  const isText = Boolean(textContent);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border border-border bg-background-deep shadow-inner ${className}`}
    >
      {/* Top Controls Toolbar */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background-raised/70 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
              {documentName}
            </span>
            <span className="mono text-[10px] text-muted-foreground">v{versionNo}</span>
            {hash && (
              <span className="hidden mono text-[10px] text-chain md:inline-block">
                SHA: {shortHash(hash, 6)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isImage && (
              <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="rounded-md p-1 text-muted-foreground hover:bg-background-raised hover:text-foreground"
                  title="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="mono text-[10px] w-8 text-center text-muted-foreground">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  className="rounded-md p-1 text-muted-foreground hover:bg-background-raised hover:text-foreground"
                  title="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-background-raised hover:text-foreground"
                  title="Rotate image"
                >
                  <RotateCw className="size-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-background-raised hover:text-foreground"
              title="Reload preview"
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Reload
            </button>

            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                title="Expand fullscreen viewer"
              >
                <Maximize2 className="size-3" /> Fullscreen
              </button>
            )}

            <a
              href={fileUrl(documentService.downloadPath(documentId))}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-background-raised hover:text-foreground"
              title="Download file"
            >
              <Download className="size-3" /> Download
            </a>
          </div>
        </div>
      )}

      {/* Main Document Content Area — height adapts to content type */}
      <div className="relative flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <p className="text-xs font-semibold text-foreground">Decrypting &amp; Streaming File...</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Fetching authenticated binary payload from evidence vault.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="grid size-12 place-items-center rounded-xl border border-danger/40 bg-danger/10 text-danger">
              <AlertTriangle className="size-6" />
            </div>
            <p className="text-xs font-semibold text-danger">Unable to Render Preview</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">{error}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Retry
              </button>
              <a
                href={fileUrl(documentService.downloadPath(documentId))}
                className="rounded-md border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
              >
                Download File Instead
              </a>
            </div>
          </div>
        ) : isImage && blobUrl ? (
          /* Image — natural size, capped so it never overflows viewport */
          <div className="flex items-center justify-center overflow-auto p-4">
            <img
              src={blobUrl}
              alt={documentName}
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease-in-out",
                maxHeight: "75vh",
              }}
              className="max-w-full rounded-lg object-contain shadow-md"
            />
          </div>
        ) : isPdf && blobUrl ? (
          /* PDF iframe — must have an explicit height; use heightClass */
          <iframe
            src={`${blobUrl}#toolbar=1&navpanes=0`}
            className={`w-full rounded-lg border-0 bg-background-deep ${heightClass}`}
            title={documentName}
          />
        ) : isText && textContent ? (
          /* Text / JSON / CSV — grows with content, max-height scrollable */
          <div className="overflow-auto rounded-lg border border-border bg-background-raised/40 p-4 max-h-[70vh]">
            <pre className="mono whitespace-pre-wrap text-xs text-foreground leading-relaxed">
              {textContent}
            </pre>
          </div>
        ) : blobUrl ? (
          /* Other binary (e.g. Office docs served via browser viewer) — use heightClass */
          <iframe
            src={blobUrl}
            className={`w-full rounded-lg border-0 bg-background-deep ${heightClass}`}
            title={documentName}
          />
        ) : (
          /* Unknown / unrenderable — compact fallback */
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <FileText className="size-10 text-primary/60" />
            <p className="text-xs font-semibold text-foreground">{documentName}</p>
            <p className="text-[11px] text-muted-foreground">
              {detectedType} · {fileSize ? formatBytes(fileSize) : "Binary file"}
            </p>
            <a
              href={fileUrl(documentService.downloadPath(documentId))}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Download className="size-3.5" /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
