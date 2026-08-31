export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return mins <= 0 ? "just now" : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days}d ago`;
  return formatDate(value);
}

export function countdown(value?: string | null) {
  if (!value) return { label: "No expiry", expired: false, urgent: false };
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return { label: "—", expired: false, urgent: false };
  if (ms <= 0) return { label: "Expired", expired: true, urgent: false };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const label = days > 0 ? `${days}d ${hours}h left` : hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  return { label, expired: false, urgent: days < 2 };
}

export function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function titleCase(value?: string | null) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortHash(hash?: string | null, size = 10) {
  if (!hash) return "—";
  if (hash.length <= size * 2) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-size)}`;
}

export function initials(name?: string) {
  if (!name) return "SL";
  const parts = name.replace(/^(Inspector|SP|SI|ASI|Dr\.)\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "SL";
}

export function greeting(name?: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}
