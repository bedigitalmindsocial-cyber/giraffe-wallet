import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession, staffActor } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { MethodTagChip } from "@/components/catalog/MethodTagChip";
import { LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CopyPasscode } from "@/components/ops/CopyPasscode";
import { formatCredits, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "wallet" | "tasks" | "audit" | "members" | "reports";

export default async function EngagementWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (sp.tab as Tab) || "wallet";
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  const store = getStore();
  const summary = await store.getEngagementSummary(id);
  if (!summary) notFound();
  const tasks = await store.listTasks(id);
  const services = await store.getServices();
  const audit = await store.listAudit({ entityType: "task", limit: 30 });
  const engAudit = await store.listAudit({ entityType: "engagement", entityId: id, limit: 30 });
  const allAudit = [...audit.filter((a) => tasks.some((t) => t.id === a.entityId)), ...engAudit].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const staff = await store.listStaff();
  const packages = await store.getPackages();

  async function pause(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().pauseEngagement(id, String(formData.get("reason") || ""), staffActor(session));
    redirect(`/ops/engagements/${id}`);
  }
  async function resume() {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().resumeEngagement(id, staffActor(session));
    redirect(`/ops/engagements/${id}`);
  }
  async function upgrade(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().upgradeEngagement(id, String(formData.get("packageId")), staffActor(session));
    redirect(`/ops/engagements/${id}`);
  }
  async function reassign(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().reassignBrandManager(id, String(formData.get("userId")), staffActor(session));
    redirect(`/ops/engagements/${id}`);
  }

  const tabBtn = (label: string, key: Tab) => (
    <Link
      href={`/ops/engagements/${id}?tab=${key}`}
      className={`px-3 py-1.5 text-sm rounded-md ${tab === key ? "bg-[var(--color-purple-soft)] text-[var(--color-purple-dark)] font-medium" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
    >
      {label}
    </Link>
  );

  const daysWarn = summary.engagement.status === "active" && summary.daysRemaining <= 14;

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Dashboard</Link>}>
      <div className="mb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="eyebrow mb-1">{summary.package.name} · <Link href={`/ops/clients/${summary.client.id}`} className="hover:underline">{summary.client.name}</Link></div>
            <h1 className="display text-3xl">{summary.client.name}</h1>
            <div className="mono text-sm text-[var(--color-muted)] mt-1">{summary.engagement.slug}</div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">
              {summary.engagement.startDate} → {summary.engagement.endDate} · brand manager: {summary.brandManager?.name ?? "-"}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Chip variant={summary.engagement.status === "active" ? "success" : summary.engagement.status === "paused" ? "warning" : "danger"}>{summary.engagement.status}</Chip>
              <CopyPasscode passcode={summary.engagement.passcode} slug={summary.engagement.slug} />
            </div>
          </div>
          {session.role === "super_admin" && summary.engagement.status === "active" ? (
            <details className="card p-3">
              <summary className="cursor-pointer text-sm font-medium">Actions</summary>
              <div className="mt-3 space-y-3 min-w-[260px]">
                <form action={pause} className="space-y-2">
                  <input className="input text-sm" name="reason" placeholder="Pause reason" required />
                  <button type="submit" className="btn btn-ghost w-full text-xs">Pause</button>
                </form>
                <form action={upgrade} className="space-y-2">
                  <select className="select text-sm" name="packageId" required defaultValue="">
                    <option value="" disabled>Upgrade to…</option>
                    {packages.filter((p) => p.totalCredits > summary.package.totalCredits).map((p) => <option key={p.id} value={p.id}>{p.name} (+{p.totalCredits - summary.package.totalCredits} credits)</option>)}
                  </select>
                  <button type="submit" className="btn btn-ghost w-full text-xs">Upgrade tier</button>
                </form>
                <form action={reassign} className="space-y-2">
                  <select className="select text-sm" name="userId" required defaultValue="">
                    <option value="" disabled>Reassign to…</option>
                    {staff.filter((u) => u.role === "manager" || u.role === "super_admin").map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                  <button type="submit" className="btn btn-ghost w-full text-xs">Reassign manager</button>
                </form>
              </div>
            </details>
          ) : null}
          {session.role === "super_admin" && summary.engagement.status === "paused" ? (
            <form action={resume}><button className="btn btn-primary text-xs" type="submit">Resume</button></form>
          ) : null}
        </div>

        {daysWarn ? (
          <div className={`mt-4 p-3 rounded ${summary.daysRemaining <= 7 ? "bg-[#F8E0DD] text-[var(--color-danger)]" : "bg-[#FBF1DC] text-[var(--color-warning)]"} text-sm`}>
            Engagement ends in {summary.daysRemaining} day{summary.daysRemaining === 1 ? "" : "s"} ({summary.engagement.endDate}). Talk renewal.
          </div>
        ) : null}

        <div className="mt-6 flex gap-1 border-b border-[var(--color-line)]">
          {tabBtn("Wallet", "wallet")}
          {tabBtn(`Tasks · ${tasks.length}`, "tasks")}
          {tabBtn("Audit", "audit")}
          {tabBtn("Reports", "reports")}
        </div>
      </div>

      {tab === "wallet" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="eyebrow mb-2">Flex bucket</div>
            <div className="mono text-4xl text-[var(--color-purple-dark)]">{formatCredits(summary.balance.flexCreditsRemaining)}</div>
            <div className="text-sm text-[var(--color-muted)] mt-1">of {formatCredits(summary.balance.flexCreditsTotal)} remaining</div>
            <div className="mt-3"><ProgressBar used={summary.balance.flexCreditsUsed} total={summary.balance.flexCreditsTotal} /></div>
            <div className="mt-3 text-xs text-[var(--color-muted)]">{summary.daysRemaining} of {Math.max(1, Math.round((new Date(summary.engagement.endDate).getTime() - new Date(summary.engagement.startDate).getTime()) / 86_400_000))} days remaining</div>
          </Card>
          <Card>
            <div className="eyebrow mb-2">Core bucket</div>
            <div className="mono text-4xl text-[var(--color-purple-dark)]">{formatCredits(summary.balance.coreCreditsRemaining)}</div>
            <div className="text-sm text-[var(--color-muted)] mt-1">of {formatCredits(summary.balance.coreCreditsTotal)} remaining</div>
            <div className="mt-3"><ProgressBar used={summary.balance.coreCreditsUsed} total={summary.balance.coreCreditsTotal} /></div>
            <div className="mt-3 text-xs text-[var(--color-muted)]">Locked allocation for the 3 always-included pillars.</div>
          </Card>
          <Card className="lg:col-span-2">
            <div className="eyebrow mb-3">Recent activity</div>
            <ul className="space-y-2 text-sm">
              {allAudit.slice(0, 10).map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-line)] pb-2 last:border-0">
                  <span><span className="mono text-xs text-[var(--color-muted)]">{a.actorName}</span> · {a.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-[var(--color-muted)]">{relativeTime(a.createdAt)}</span>
                </li>
              ))}
              {allAudit.length === 0 ? <li className="text-[var(--color-muted)]">Nothing yet.</li> : null}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div>
          <div className="flex items-end justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              {(["quoted", "approved", "in_progress", "submitted", "revision", "done", "cancelled"] as const).map((s) => (
                <Chip key={s} variant={s === "done" ? "success" : s === "cancelled" ? "danger" : "purple"}>
                  {s.replace("_", " ")} · {tasks.filter((t) => t.status === s).length}
                </Chip>
              ))}
            </div>
            {summary.engagement.status === "active" ? (
              <LinkButton href={`/ops/engagements/${id}/tasks/new`}>New task</LinkButton>
            ) : null}
          </div>
          <Card padded={false}>
            <table className="table">
              <thead><tr><th>Title</th><th>Service</th><th>Bucket</th><th className="text-right">Cost</th><th>Status</th><th>Assignee</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tasks.map((t) => {
                  const svc = services.find((s) => s.id === t.serviceId);
                  const assignee = staff.find((u) => u.id === t.assignedTo);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/ops/engagements/${id}/tasks/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                        {t.isSystemGenerated ? <Chip className="ml-2">system</Chip> : null}
                      </td>
                      <td className="text-sm text-[var(--color-muted)]">
                        {svc?.name ?? "-"}
                        {svc?.methodTag ? <div className="mt-1"><MethodTagChip methodTag={svc.methodTag} compact /></div> : null}
                      </td>
                      <td><Chip variant={t.bucket === "core" ? "purple" : "default"}>{t.bucket}</Chip></td>
                      <td className="mono text-right">{t.creditCostLocked}</td>
                      <td><Chip variant={t.status === "done" ? "success" : t.status === "cancelled" ? "danger" : t.status === "submitted" || t.status === "revision" ? "warning" : "purple"}>{t.status.replace("_", " ")}</Chip></td>
                      <td className="text-sm">{assignee?.name ?? "-"}</td>
                      <td className="text-xs text-[var(--color-muted)]">{relativeTime(t.completedAt ?? t.submittedAt ?? t.startedAt ?? t.approvedAt ?? t.createdAt)}</td>
                      <td className="text-right"><Link className="text-sm text-[var(--color-purple)] hover:underline" href={`/ops/engagements/${id}/tasks/${t.id}`}>Open</Link></td>
                    </tr>
                  );
                })}
                {tasks.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-[var(--color-muted)]">No tasks yet.</td></tr> : null}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <div className="eyebrow mb-3">Audit log</div>
          <ul className="space-y-2 text-sm">
            {allAudit.map((a) => (
              <li key={a.id} className="border-b border-[var(--color-line)] pb-2 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span><span className="mono text-xs text-[var(--color-muted)]">{a.actorName}</span> · {a.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-[var(--color-muted)]">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                {a.payload ? <pre className="text-xs text-[var(--color-muted)] mt-1 whitespace-pre-wrap">{JSON.stringify(a.payload, null, 2)}</pre> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === "reports" ? (
        <Card>
          <div className="eyebrow mb-2">This engagement</div>
          {(() => {
            const done = tasks.filter((t) => t.status === "done");
            const totEst = done.reduce((s, t) => s + t.estimatedHours, 0);
            const totAct = done.reduce((s, t) => s + t.actualHours, 0);
            const variance = totEst > 0 ? ((totAct - totEst) / totEst) * 100 : 0;
            const onTime = done.filter((t) => t.actualHours <= t.estimatedHours).length;
            const onTimePct = done.length ? (onTime / done.length) * 100 : 0;
            const revs = tasks.reduce((s, t) => s + t.revisionCount, 0);
            return (
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <li><div className="eyebrow">Done</div><div className="mono text-2xl">{done.length}</div></li>
                <li><div className="eyebrow">Variance</div><div className={`mono text-2xl ${variance > 25 ? "text-[var(--color-danger)]" : ""}`}>{variance.toFixed(1)}%</div></li>
                <li><div className="eyebrow">On-time</div><div className="mono text-2xl">{onTimePct.toFixed(0)}%</div></li>
                <li><div className="eyebrow">Revisions</div><div className="mono text-2xl">{revs}</div></li>
              </ul>
            );
          })()}
        </Card>
      ) : null}
    </AppShell>
  );
}
