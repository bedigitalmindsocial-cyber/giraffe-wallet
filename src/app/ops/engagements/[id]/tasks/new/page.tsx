import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession, staffActor } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { TaskNewForm } from "@/components/ops/TaskNewForm";

export const dynamic = "force-dynamic";

export default async function NewTask({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  if (session.role === "executor") redirect(`/ops/engagements/${id}`);
  const store = getStore();
  const summary = await store.getEngagementSummary(id);
  if (!summary) notFound();
  if (summary.engagement.status !== "active") {
    return (
      <AppShell surface="ops" user={{ name: session.name, role: session.role }}>
        <div className="card p-6">
          <h1 className="display text-2xl">Engagement is {summary.engagement.status}</h1>
          <p className="text-sm text-[var(--color-muted)] mt-2">Resume the engagement before creating new tasks.</p>
          <Link href={`/ops/engagements/${id}`} className="btn btn-ghost mt-4">Back</Link>
        </div>
      </AppShell>
    );
  }
  const services = (await store.getServices({ activeOnly: true })).filter((s) => s.tag !== "DISCONTINUED");

  async function action(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    const store = getStore();
    try {
      const t = await store.createTask({
        engagementId: id,
        serviceId: String(formData.get("serviceId")),
        title: String(formData.get("title") || "").trim(),
        brief: String(formData.get("brief") || "").trim(),
        bucket: (String(formData.get("bucket")) as "core" | "flex"),
      }, staffActor(session));
      redirect(`/ops/engagements/${id}/tasks/${t.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create task";
      redirect(`/ops/engagements/${id}/tasks/new?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href={`/ops/engagements/${id}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Engagement</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">{summary.client.name} · {summary.engagement.slug}</div>
        <h1 className="display text-3xl">New task</h1>
        <p className="text-[var(--color-muted)] mt-1">Pick a service. Cost is locked at quote time and never changes for this task.</p>
      </div>
      <TaskNewForm services={services} balance={summary.balance} action={action} />
    </AppShell>
  );
}
