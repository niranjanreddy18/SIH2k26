/**
 * Safe debug helpers for spotting frontend/backend contract mismatches.
 *
 * These NEVER log raw values (which may contain case content, PII, hashes or
 * tokens) — only the *shape*: key names, types, array lengths and, for
 * primitives, a redacted marker.
 */

const MAX_DEPTH = 4;
const MAX_KEYS = 40;
const MAX_ARRAY_SAMPLE = 1;

export type ShapeNode = unknown;

/** Describes the structure of an unknown payload without exposing its values. */
export function describeShape(value: unknown, depth = 0): ShapeNode {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const type = typeof value;

  if (type === "string") return `string(len=${(value as string).length})`;
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "function") return "function";
  if (type === "bigint" || type === "symbol") return type;

  if (Array.isArray(value)) {
    if (value.length === 0) return "array(empty)";
    if (depth >= MAX_DEPTH) return `array(len=${value.length}, …)`;
    return {
      __type: `array(len=${value.length})`,
      sample: value.slice(0, MAX_ARRAY_SAMPLE).map((item) => describeShape(item, depth + 1)),
    };
  }

  if (value instanceof Date) return "Date";

  if (type === "object") {
    if (depth >= MAX_DEPTH) return "object(…)";
    const out: Record<string, ShapeNode> = {};
    const keys = Object.keys(value as Record<string, unknown>);
    for (const key of keys.slice(0, MAX_KEYS)) {
      out[key] = describeShape((value as Record<string, unknown>)[key], depth + 1);
    }
    if (keys.length > MAX_KEYS) out["…"] = `${keys.length - MAX_KEYS} more keys`;
    return out;
  }

  return type;
}

/** Returns the dotted paths from `expected` that are missing/null in `payload`. */
export function missingPaths(payload: unknown, expected: readonly string[]): string[] {
  return expected.filter((path) => {
    let cursor: unknown = payload;
    for (const segment of path.split(".")) {
      if (cursor === null || cursor === undefined || typeof cursor !== "object") return true;
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return cursor === undefined || cursor === null;
  });
}

type ContractReport = {
  label: string;
  status?: number | undefined;
  message?: string | undefined;
  expected?: readonly string[] | undefined;
  payload: unknown;
};

/**
 * Logs a collapsed console group describing a contract mismatch: HTTP status,
 * backend message, missing expected paths and the redacted payload shape.
 */
export function logContractMismatch({
  label,
  status,
  message,
  expected,
  payload,
}: ContractReport): void {
  if (typeof console === "undefined") return;

  const missing = expected ? missingPaths(payload, expected) : [];

  /* eslint-disable no-console */
  console.groupCollapsed(`[SLIDMS contract] ${label}${status ? ` · HTTP ${status}` : ""}`);
  if (message) console.warn("backend message:", message);
  if (expected) {
    console.warn(
      missing.length
        ? `missing/empty expected fields (${missing.length}):`
        : "all expected fields present",
      missing,
    );
  }
  console.warn("received shape (values redacted):", describeShape(payload));
  console.groupEnd();
  /* eslint-enable no-console */
}

/** Pulls status / message / body out of an axios-style error safely. */
export function inspectApiError(error: unknown): {
  status?: number | undefined;
  message?: string | undefined;
  body: unknown;
} {
  const e = error as {
    response?: { status?: number; data?: { message?: string; error?: string } };
    message?: string;
  };
  return {
    status: e?.response?.status,
    message: e?.response?.data?.message || e?.response?.data?.error || e?.message,
    body: e?.response?.data,
  };
}

/** Field paths the case workspace relies on. */
export const CASE_DETAIL_CONTRACT = [
  "id",
  "title",
  "firNumber",
  "status",
  "classification",
  "createdAt",
  "createdBy.name",
  "counts.documents",
  "counts.evidence",
] as const;

export const CASE_DOCUMENT_CONTRACT = [
  "id",
  "name",
  "type",
  "classification",
  "currentVersion.versionNo",
  "currentVersion.status",
  "currentVersion.hash",
] as const;
