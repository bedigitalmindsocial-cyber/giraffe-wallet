import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export const dynamic = "force-dynamic";

export default async function UtilizationReport() {
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  if (session.role !== "super_admin") redirect("/ops");
  const store = getStore();
  const report = await store.utilizationReport({});

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Dashboard</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Reports</div>
        <h1 className="display text-4xl">Utilization</h1>
        <p className="text-[var(--color-muted)] mt-1">Are clients spending what they should at this point in the quarter? Catch underuse early so they don't lose credits.</p>
      </div>

      <Card className="mb-6">
        <h2 className="display text-2xl mb-3">All active engagements</h2>
        <table className="table">
          <thead><tr><th>Client</th><th className="text-right">Days</th><th className="text-right">Flex used</th><th className="text-right">Expected</th><th>Status</th></tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.engagementId}>
                <td><Link className="hover:underline" href={`/ops/engagements/${r.engagementId}`}>{r.clientName}</Link></td>
                <td className="mono text-right">{r.daysElapsed} / {r.daysTotal}</td>
                <td className="mono text-right">{r.flexUsedPct}%</td>
                <td className="mono text-right">{r.expectedPct}%</td>
                <td>
                  <Chip variant={r.flag === "ontrack" ? "success" : r.flag === "underutilized" ? "warning" : "danger"}>{r.flag}</Chip>
                </td>
              </tr>
            ))}
            {report.rows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-[var(--color-muted)]">No active engagements.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="display text-xl mb-3">Underutilized</h3>
          <p className="text-sm text-[var(--color-muted)] mb-3">Less than 40% spent past the halfway mark.</p>
          {report.underutilized.length === 0 ? <p className="text-sm text-[var(--color-muted)]">All clear.</p> : (
            <ul className="space-y-1 text-sm">
              {report.underutilized.map((r) => <li key={r.engagementId}><Link className="hover:underline" href={`/ops/engagements/${r.engagementId}`}>{r.clientName}</Link> · <span className="mono">{r.flexUsedPct}% used / {r.expectedPct}% expected</span></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="display text-xl mb-3">Overutilized</h3>
          <p className="text-sm text-[var(--color-muted)] mb-3">More than 20pp ahead of the expected curve.</p>
          {report.overutilized.length === 0 ? <p className="text-sm text-[var(--color-muted)]">All clear.</p> : (
            <ul className="space-y-1 text-sm">
              {report.overutilized.map((r) => <li key={r.engagementId}><Link className="hover:underline" href={`/ops/engagements/${r.engagementId}`}>{r.clientName}</Link> · <span className="mono">{r.flexUsedPct}% used / {r.expectedPct}% expected</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
