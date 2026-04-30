export function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  const tone = pct < 70 ? "" : pct < 90 ? "warn" : "danger";
  return (
    <div className="bar" aria-label={`${Math.round(pct)}% used`}>
      <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
