import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession, staffActor } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { MethodTagChip } from "@/components/catalog/MethodTagChip";
import { StatusTimeline } from "@/components/ui/StatusTimeline";
import { SubmitHoursForm } from "@/components/ops/SubmitHoursForm";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TaskDetail({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  const store = getStore();
  const [task, summary, services, roles, staff, audit] = await Promise.all([
    store.getTask(taskId),
    store.getEngagementSummary(id),
    store.getServices(),
    store.getRoles(),
    store.listStaff(),
    store.listAudit({ entityType: "task", entityId: taskId, limit: 100 }),
  ]);
  if (!task || !summary) notFound();
  const svc = services.find((s) => s.id === task.serviceId);
  const executors = staff.filter((u) => u.role === "executor" || u.role === "manager" || u.role === "super_admin");

  async function approveOnBehalf(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().approveTask(taskId, staffActor(session), false, String(formData.get("reason") || ""));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function assign(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().assignTask(taskId, String(formData.get("userId")), staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function start() {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().startTask(taskId, staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function submitHours(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    const count = parseInt(String(formData.get("rowsCount") || "0"));
    const rows: { roleId: string; hours: number; loggedBy: string }[] = [];
    for (let i = 0; i < count; i++) {
      const roleId = String(formData.get(`roleId-${i}`) || "");
      const hours = parseFloat(String(formData.get(`hours-${i}`) || "0"));
      if (roleId && hours > 0) rows.push({ roleId, hours, loggedBy: session.userId });
    }
    await getStore().submitTask(taskId, rows, staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function requestRevision(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().requestRevision(taskId, String(formData.get("note") || ""), staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function complete() {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().completeTask(taskId, staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }
  async function cancel(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    await getStore().cancelTask(taskId, String(formData.get("reason") || "(no reason)"), staffActor(session));
    redirect(`/ops/engagements/${id}/tasks/${taskId}`);
  }

  const escalated = task.hoursLog.some((h) => {
    const role = roles.find((r) => r.id === h.roleId);
    const exec = roles.find((r) => r.id === task.executorRoleId);
    return role && exec && role.multiplier > exec.multiplier;
  });

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href={`/ops/engagements/${id}?tab=tasks`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Tasks</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">{summary.client.name} · {svc?.name}</div>
        <h1 className="display text-3xl">{task.title}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Chip variant={task.bucket === "core" ? "purple" : "default"}>{task.bucket}</Chip>
          <Chip variant={task.status === "done" ? "success" : task.status === "cancelled" ? "danger" : "purple"}>{task.status.replace("_", " ")}</Chip>
          <span className="mono text-sm">{task.creditCostLocked} credits</span>
          {svc?.methodTag ? <MethodTagChip methodTag={svc.methodTag} /> : null}
          {escalated ? <Chip variant="warning">↑ escalated</Chip> : null}
          {task.isSystemGenerated ? <Chip>system</Chip> : null}
        </div>
      </div>

      <div className="mb-6"><StatusTimeline status={task.status} /></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="eyebrow mb-2">Brief</div>
            <p className="text-sm whitespace-pre-wrap">{task.brief || "No brief provided."}</p>
          </Card>

          {/* Status-specific actions */}
          {task.status === "quoted" && session.role !== "executor" ? (
            <Card>
              <div className="eyebrow mb-2">Approval</div>
              <p className="text-sm text-[var(--color-muted)] mb-3">
                Send the client this approval link or confirm on their behalf with a reason recorded for audit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="btn btn-ghost" href={`/ops/client/login?slug=${summary.engagement.slug}&pre=1`}>Open client portal preview</Link>
                <details>
                  <summary className="btn btn-primary cursor-pointer">Confirm on behalf of client</summary>
                  <form action={approveOnBehalf} className="mt-3 card p-3 space-y-2 min-w-[300px]">
                    <input className="input" name="reason" required placeholder="e.g. Confirmed on WhatsApp at 3pm" />
                    <button className="btn btn-primary" type="submit">Confirm</button>
                  </form>
                </details>
              </div>
            </Card>
          ) : null}

          {task.status === "approved" && session.role !== "executor" ? (
            <Card>
              <div className="eyebrow mb-2">Assign</div>
              <form action={assign} className="flex gap-2 items-end mb-3">
                <select className="select flex-1" name="userId" defaultValue={task.assignedTo ?? ""} required>
                  <option value="" disabled>Pick an assignee</option>
                  {executors.map((u) => <option key={u.id} value={u.id}>{u.name || u.email} ({u.role.replace("_", " ")})</option>)}
                </select>
                <button className="btn btn-ghost" type="submit">Save</button>
              </form>
              {task.assignedTo ? (
                <form action={start}>
                  <button className="btn btn-primary" type="submit">Mark started</button>
                </form>
              ) : <p className="help">Assign first, then mark started.</p>}
            </Card>
          ) : null}

          {(task.status === "in_progress" || task.status === "revision") ? (
            <Card>
              <div className="eyebrow mb-2">{task.status === "revision" ? "Resubmit revision" : "Submit for review"}</div>
              <SubmitHoursForm roles={roles} defaultRoleId={task.executorRoleId} action={submitHours} loggedBy={session.userId} />
            </Card>
          ) : null}

          {task.status === "submitted" && session.role !== "executor" ? (
            <Card>
              <div className="eyebrow mb-2">Review</div>
              <div className="flex flex-wrap gap-3">
                <details>
                  <summary className="btn btn-ghost cursor-pointer">Request revision</summary>
                  <form action={requestRevision} className="mt-3 card p-3 space-y-2 min-w-[300px]">
                    <textarea className="textarea" name="note" rows={3} required placeholder="What needs to change?" />
                    <p className="help">Revision {task.revisionCount + 1} of {task.revisionsIncluded} included. {task.revisionCount + 1 > task.revisionsIncluded ? "Beyond included revisions. Consider creating an Additional Revision task." : ""}</p>
                    <button className="btn btn-ghost" type="submit">Send revision request</button>
                  </form>
                </details>
                <form action={complete}>
                  <button className="btn btn-primary" type="submit">Mark complete</button>
                </form>
              </div>
            </Card>
          ) : null}

          {!["done", "cancelled"].includes(task.status) ? (
            <details>
              <summary className="text-sm text-[var(--color-danger)] cursor-pointer">Cancel task</summary>
              <form action={cancel} className="mt-2 card p-3 space-y-2 max-w-md">
                <input className="input" name="reason" required placeholder="Why is this task cancelled? (refunds {task.creditCostLocked} credits)" />
                <button className="btn btn-danger" type="submit">Cancel and refund</button>
              </form>
            </details>
          ) : null}

          <Card>
            <div className="eyebrow mb-2">Hours log</div>
            {task.hoursLog.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No hours logged yet.</p> : (
              <table className="table">
                <thead><tr><th>Role</th><th className="text-right">Hours</th><th>Logged by</th><th>When</th></tr></thead>
                <tbody>
                  {task.hoursLog.map((h) => {
                    const r = roles.find((x) => x.id === h.roleId);
                    const u = staff.find((x) => x.id === h.loggedBy);
                    return (
                      <tr key={h.id}>
                        <td>{r?.name ?? "-"}</td>
                        <td className="mono text-right">{h.hours}</td>
                        <td className="text-sm">{u?.name ?? h.loggedBy}</td>
                        <td className="text-xs text-[var(--color-muted)]">{relativeTime(h.loggedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="eyebrow mb-2">Numbers</div>
            <ul className="text-sm space-y-1 mono">
              <li>Cost: {task.creditCostLocked} credits</li>
              <li>Estimated: {task.estimatedHours}h</li>
              <li>Actual: {task.actualHours}h</li>
              <li>Revisions: {task.revisionCount} / {task.revisionsIncluded} included</li>
            </ul>
          </Card>
          <Card>
            <div className="eyebrow mb-2">Audit</div>
            <ul className="text-xs space-y-2">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-[var(--color-line)] pb-1 last:border-0">
                  <div className="flex justify-between gap-2"><span>{a.action.replace(/_/g, " ")}</span><span className="text-[var(--color-muted)]">{relativeTime(a.createdAt)}</span></div>
                  <div className="text-[var(--color-muted)]">{a.actorName}</div>
                </li>
              ))}
              {audit.length === 0 ? <li className="text-[var(--color-muted)]">No events yet.</li> : null}
            </ul>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
