// Defensive formatting helpers — never render null/undefined.

export const safe = (v: string | null | undefined, fallback = "—"): string =>
  v && v.trim().length > 0 ? v : fallback;

export const truncate = (text: string | null | undefined, n = 200): string => {
  if (!text) return "";
  return text.length > n ? `${text.slice(0, n).trim()}…` : text;
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string => {
  if (!startIso || !endIso) return "";
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (isNaN(a) || isNaN(b)) return "";
  const ms = Math.max(0, b - a);
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
};
