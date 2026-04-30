import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatInr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EfficiencyReport() {
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  if (session.role !== "super_admin") redirect("/ops");
  const store = getStore();
  const report = await store.efficiencyReport({});

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Dashboard</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Reports</div>
        <h1 className="display text-4xl">Efficiency</h1>
        <p className="text-[var(--color-muted)] mt-1">Where is the work taking longer than the catalog says? Which services need a re-pricing?</p>
      </div>

      <Card className="mb-6">
        <h2 className="display text-2xl mb-3">Service variance</h2>
        <table className="table">
          <thead><tr><th>Service</th><th className="text-right">Tasks</th><th className="text-right">Avg estimated</th><th className="text-right">Avg actual</th><th className="text-right">Variance</th><th></th></tr></thead>
          <tbody>
            {report.serviceVariance.map((r) => (
              <tr key={r.serviceId}>
                <td>{r.serviceName}</td>
                <td className="mono text-right">{r.taskCount}</td>
                <td className="mono text-right">{r.avgEstimatedHours}h</td>
                <td className="mono text-right">{r.avgActualHours}h</td>
                <td className={`mono text-right ${Math.abs(r.variancePct) > 25 ? "text-[var(--color-danger)]" : ""}`}>{r.variancePct >= 0 ? "+" : ""}{r.variancePct}%</td>
                <td>{Math.abs(r.variancePct) > 25 ? <Chip variant="danger">edit catalog</Chip> : null}</td>
              </tr>
            ))}
            {report.serviceVariance.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-[var(--color-muted)]">No completed tasks yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card className="mb-6">
        <h2 className="display text-2xl mb-3">Per-executor</h2>
        <table className="table">
          <thead><tr><th>Name</th><th className="text-right">Total hours</th><th className="text-right">Avg variance</th><th className="text-right">On-time</th><th>Top services</th></tr></thead>
          <tbody>
            {report.executors.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td className="mono text-right">{r.totalHours}</td>
                <td className="mono text-right">{r.avgVariancePct}%</td>
                <td className="mono text-right">{r.onTimePct}%</td>
                <td className="text-xs text-[var(--color-muted)]">{r.topServices.map((s) => `${s.serviceName} (${s.hours}h)`).join(" · ")}</td>
              </tr>
            ))}
            {report.executors.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No executor data.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="display text-2xl mb-3">Per-manager</h2>
        <table className="table">
          <thead><tr><th>Name</th><th className="text-right">Credits delivered</th><th className="text-right">Internal cost</th><th className="text-right">Margin</th><th className="text-right">Utilization</th></tr></thead>
          <tbody>
            {report.managers.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td className="mono text-right">{r.creditsDelivered}</td>
                <td className="mono text-right">{formatInr(r.internalCostInr)}</td>
                <td className={`mono text-right ${r.marginInr < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{formatInr(r.marginInr)}</td>
                <td className="mono text-right">{r.utilizationPct}%</td>
              </tr>
            ))}
            {report.managers.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No manager data.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
