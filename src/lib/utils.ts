// Small UI helpers.

export function formatInr(n: number): string {
  if (!Number.isFinite(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatCredits(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function statusChipClass(status: string): string {
  switch (status) {
    case "active":
    case "approved":
    case "done":
      return "chip-success";
    case "paused":
    case "submitted":
    case "revision":
      return "chip-warning";
    case "expired":
    case "cancelled":
      return "chip-danger";
    case "in_progress":
    case "quoted":
      return "chip-purple";
    default:
      return "";
  }
}
