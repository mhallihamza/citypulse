import type { Severity } from "@/lib/types";

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 4) return "just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ticker(c: number): string {
  return c >= 1000 ? `${Math.round(c / 1000)}k+` : `${c}`;
}

export function pct(v: number, d = 1): string {
  return `${v.toFixed(d)}%`;
}

export function confidenceLabel(v: number): string {
  if (v >= 0.9) return "Very high";
  if (v >= 0.75) return "High";
  if (v >= 0.6) return "Moderate";
  return "Low";
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export function timeAgoShort(ts: number, now = Date.now()): string {
  return timeAgo(ts, now);
}