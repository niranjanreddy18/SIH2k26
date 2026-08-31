import api, { API_BASE_URL } from "@/services/api";
import { describeShape, missingPaths } from "./debug";

export type ProbeGroup = "System" | "Auth" | "Cases" | "Documents" | "Evidence" | "Admin" | "Blockchain";

export type ProbeSpec = {
  id: string;
  group: ProbeGroup;
  label: string;
  path: string;
  params?: Record<string, unknown>;
  /** Field paths the UI reads from the unwrapped `data`. */
  contract?: readonly string[];
  /** When true, the probe extracts an id from the response for dependent probes. */
  capture?: "caseId" | "docId" | "evidenceId";
  /** Only run when the required id was captured. */
  requires?: "caseId" | "docId" | "evidenceId";
  /** 403/404 is an acceptable outcome (role-gated or empty dataset). */
  tolerate?: number[];
};

export type ProbeResult = {
  spec: ProbeSpec;
  state: "ok" | "warn" | "fail" | "skipped";
  status: number | "NETWORK" | "SKIPPED";
  durationMs: number;
  envelope: "wrapped" | "bare" | "unknown";
  count?: number | undefined;
  missing: string[];
  message?: string | undefined;
  shape: unknown;
};

/** Coerce any backend error payload (string, {code,message}, nested) into display text. */
function toText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("; ") || undefined;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const msg = toText(o["message"]) ?? toText(o["error"]) ?? toText(o["detail"]);
    const code = typeof o["code"] === "string" ? o["code"] : undefined;
    if (msg) return code ? `${code}: ${msg}` : msg;
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** GET-only probes — nothing here mutates backend state. */
export const PROBES: ProbeSpec[] = [
  { id: "health", group: "System", label: "Health check", path: "/health", contract: ["status"] },
  { id: "me", group: "Auth", label: "Current officer", path: "/auth/me", contract: ["id", "name", "email", "role"] },
  {
    id: "cases",
    group: "Cases",
    label: "Case list",
    path: "/cases",
    params: { page: 1, limit: 5 },
    contract: ["items"],
    capture: "caseId",
  },
  { id: "users", group: "Admin", label: "Officer directory", path: "/users", tolerate: [403] },
  {
    id: "caseDetail",
    group: "Cases",
    label: "Case detail",
    path: "/cases/:caseId",
    requires: "caseId",
    contract: ["id", "title", "firNumber", "status", "classification", "createdBy.name", "counts.documents"],
  },
  {
    id: "caseDocs",
    group: "Documents",
    label: "Case documents",
    path: "/cases/:caseId/documents",
    requires: "caseId",
    capture: "docId",
  },
  {
    id: "caseEvidence",
    group: "Evidence",
    label: "Case evidence",
    path: "/cases/:caseId/evidence",
    requires: "caseId",
    capture: "evidenceId",
  },
  { id: "caseAssignments", group: "Cases", label: "Case assignments", path: "/cases/:caseId/assignments", requires: "caseId" },
  { id: "caseAudit", group: "Cases", label: "Case audit trail", path: "/cases/:caseId/audit", requires: "caseId" },
  { id: "caseShares", group: "Cases", label: "Case shares", path: "/cases/:caseId/shares", requires: "caseId", tolerate: [404] },
  {
    id: "docDetail",
    group: "Documents",
    label: "Document detail",
    path: "/documents/:docId",
    requires: "docId",
    contract: ["id", "name", "classification", "currentVersion.versionNo", "currentVersion.hash"],
  },
  { id: "docAudit", group: "Documents", label: "Document audit", path: "/documents/:docId/audit", requires: "docId" },
  { id: "sharedWithMe", group: "Documents", label: "Shared with me", path: "/documents/shared-with-me" },
  { id: "evidenceTimeline", group: "Evidence", label: "Custody timeline", path: "/evidence/:evidenceId/timeline", requires: "evidenceId", tolerate: [404] },
  { id: "chain", group: "System", label: "Audit chain verify", path: "/audit/verify-chain", tolerate: [403] },
  { id: "bcStatus", group: "Blockchain", label: "Blockchain status", path: "/blockchain/status", tolerate: [403, 404] },
  {
    id: "bcRecords",
    group: "Blockchain",
    label: "Blockchain records",
    path: "/blockchain/records",
    params: { refType: "DOCUMENT_VERSION" },
    requires: "docId",
    tolerate: [403, 404],
  },
  { id: "adminUsers", group: "Admin", label: "Admin users", path: "/admin/users", params: { page: 1, limit: 3 }, tolerate: [403] },
  { id: "adminAudit", group: "Admin", label: "Admin audit", path: "/admin/audit", params: { page: 1, limit: 3 }, tolerate: [403] },
];

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const items = (data as { items?: unknown })?.items;
  return Array.isArray(items) ? items : [];
}

function firstId(data: unknown): string | null {
  const row = extractList(data)[0] as { id?: string; _id?: string } | undefined;
  return row?.id ?? row?._id ?? null;
}

export type ProbeRunResult = { baseUrl: string; results: ProbeResult[] };

export async function runEndpointProbes(
  onResult?: (result: ProbeResult) => void,
): Promise<ProbeRunResult> {
  const captured: Record<string, string | null> = { caseId: null, docId: null, evidenceId: null };
  const results: ProbeResult[] = [];

  for (const spec of PROBES) {
    if (spec.requires && !captured[spec.requires]) {
      const skipped: ProbeResult = {
        spec,
        state: "skipped",
        status: "SKIPPED",
        durationMs: 0,
        envelope: "unknown",
        missing: [],
        message: `No ${spec.requires} available from an earlier response`,
        shape: undefined,
      };
      results.push(skipped);
      onResult?.(skipped);
      continue;
    }

    let path = spec.path;
    for (const [key, value] of Object.entries(captured)) {
      if (value) path = path.replace(`:${key}`, encodeURIComponent(value));
    }

    const params = { ...(spec.params ?? {}) };
    if (spec.id === "bcRecords" && captured["docId"]) params["refId"] = captured["docId"];

    const startedAt = performance.now();
    try {
      const res = await api.get(path, { params });
      const durationMs = Math.round(performance.now() - startedAt);
      const raw = res.data as unknown;
      const wrapped =
        raw !== null && typeof raw === "object" && "success" in (raw as object) && "data" in (raw as object);
      const data = wrapped ? (raw as { data: unknown }).data : raw;

      if (spec.capture) captured[spec.capture] = firstId(data);

      const list = extractList(data);
      const contractTarget = spec.contract
        ? spec.contract.includes("items")
          ? data
          : (data as unknown)
        : undefined;
      const missing = spec.contract ? missingPaths(contractTarget, spec.contract) : [];

      const result: ProbeResult = {
        spec,
        state: missing.length ? "warn" : "ok",
        status: res.status,
        durationMs,
        envelope: wrapped ? "wrapped" : "bare",
        count: list.length || undefined,
        missing,
        message: wrapped ? toText((raw as { message?: unknown }).message) : undefined,
        shape: describeShape(data),
      };
      results.push(result);
      onResult?.(result);
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const e = error as {
        response?: { status?: number; data?: { message?: unknown; error?: unknown } };
        message?: unknown;
      };
      const status = e?.response?.status;
      const tolerated = status !== undefined && (spec.tolerate ?? []).includes(status);
      const result: ProbeResult = {
        spec,
        state: tolerated ? "warn" : "fail",
        status: status ?? "NETWORK",
        durationMs,
        envelope: "unknown",
        missing: [],
        message:
          toText(e?.response?.data?.message) ||
          toText(e?.response?.data?.error) ||
          toText(e?.message),
        shape: describeShape(e?.response?.data),
      };
      results.push(result);
      onResult?.(result);
    }
  }

  return { baseUrl: API_BASE_URL, results };
}
