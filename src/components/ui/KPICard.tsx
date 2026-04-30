import type { ReactNode } from "react";

export function KPICard({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: "purple" | "warning" | "danger" }) {
  const tone = accent === "warning" ? "text-[var(--color-warning)]" : accent === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-purple-dark)]";
  return (
    <div className="card p-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className={`mono text-3xl font-medium ${tone}`}>{value}</div>
      {sub ? <div className="mt-2 text-sm text-[var(--color-muted)]">{sub}</div> : null}
    </div>
  );
}
