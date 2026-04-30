import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { KPICard } from "@/components/ui/KPICard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LinkButton } from "@/components/ui/Button";
import { formatCredits, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function dayChip(daysRemaining: number): "success" | "warning" | "danger" {
  if (daysRemaining > 30) return "success";
  if (daysRemaining > 14) return "warning";
  return "danger";
}

export default async function OpsDashboard({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  const store = getStore();
  const summaries = await store.listEngagements({ search: sp.q, status: sp.status as any }, session.userId);

  const active = summaries.filter((s) => s.engagement.status === "active");
  const totalFlex = active.reduce((sum, s) => sum + s.balance.flexCreditsRemaining, 0);
  const ending14 = active.filter((s) => s.daysRemaining <= 14).length;

  // Overdue tasks (in_progress for >7 days)
  const sevenAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const overdue = (
    await Promise.all(active.map(async (s) => (await store.listTasks(s.engagement.id, { status: ["in_progress"] })).filter((t) => (t.startedAt ?? "") < sevenAgo)))
  ).flat().length;

  const navLinks = (
    <nav className="flex gap-4 text-sm">
      <Link href="/ops" className="text-[var(--color-purple)] font-medium">Dashboard</Link>
      <Link href="/ops/clients" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">Clients</Link>
      {session.role === "super_admin" ? <Link href="/ops/reports/efficiency" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">Efficiency</Link> : null}
      {session.role === "super_admin" ? <Link href="/ops/reports/utilization" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">Utilization</Link> : null}
    </nav>
  );

  return (
    <AppShell surface="ops" user={{ name: session.name, email: session.email, role: session.role }} nav={navLinks}>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-1">Master view</div>
          <h1 className="display text-4xl">Engagements</h1>
          <p className="text-[var(--color-muted)] mt-1">{active.length} active · {summaries.length} total</p>
        </div>
        {session.role === "super_admin" ? (
          <div className="flex gap-2">
            <LinkButton variant="ghost" href="/ops/clients/new">New client</LinkButton>
            <LinkButton href="/ops/engagements/new">New engagement</LinkButton>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <KPICard label="Active engagements" value={active.length} sub={summaries.length === 0 ? "Nothing yet" : `${summaries.filter(s => s.engagement.status === "expired").length} expired`} />
        <KPICard label="Flex credits in flight" value={formatCredits(totalFlex)} sub="Across all active engagements" />
        <KPICard label="Ending in 14 days" value={ending14} sub={ending14 ? "Talk renewal" : "All clear"} accent={ending14 ? "warning" : undefined} />
        <KPICard label="Overdue tasks" value={overdue} sub="In progress > 7 days" accent={overdue ? "danger" : undefined} />
      </div>

      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search client or slug</label>
          <input className="input" type="text" name="q" defaultValue={sp.q} placeholder="Saraswati, saraswati-a3k7..." />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Status</label>
          <select className="select" name="status" defaultValue={sp.status ?? ""}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button className="btn btn-ghost" type="submit">Apply</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((s) => (
          <Card key={s.engagement.id}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="eyebrow mb-1">{s.package.name}</div>
                <h3 className="display text-2xl">{s.client.name}</h3>
                <div className="text-xs text-[var(--color-muted)] mt-1">{s.brandManager?.name ?? "No manager"} · <span className="mono">{s.engagement.slug}</span></div>
              </div>
              <div className="text-right">
                <Chip variant={s.engagement.status === "active" ? dayChip(s.daysRemaining) : s.engagement.status === "paused" ? "warning" : "danger"}>
                  {s.engagement.status === "active" ? `${s.daysRemaining} days left` : s.engagement.status}
                </Chip>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[var(--color-muted)]">Flex</span>
                  <span className="mono">{formatCredits(s.balance.flexCreditsUsed)} / {formatCredits(s.balance.flexCreditsTotal)}</span>
                </div>
                <ProgressBar used={s.balance.flexCreditsUsed} total={s.balance.flexCreditsTotal} />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[var(--color-muted)]">Core</span>
                  <span className="mono">{formatCredits(s.balance.coreCreditsUsed)} / {formatCredits(s.balance.coreCreditsTotal)}</span>
                </div>
                <ProgressBar used={s.balance.coreCreditsUsed} total={s.balance.coreCreditsTotal} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>{s.openTaskCount} open task{s.openTaskCount === 1 ? "" : "s"} · last activity {relativeTime(s.lastActivityAt)}</span>
              <Link href={`/ops/engagements/${s.engagement.id}`} className="text-[var(--color-purple)] font-medium hover:underline">Open →</Link>
            </div>
          </Card>
        ))}
        {summaries.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted)]">No engagements match. {session.role === "super_admin" ? <Link href="/ops/engagements/new" className="text-[var(--color-purple)] hover:underline">Create one</Link> : null}</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
