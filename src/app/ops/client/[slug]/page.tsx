import { notFound, redirect } from "next/navigation";
import { getClientSession } from "@/lib/auth/client-session";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { MethodTagChip } from "@/components/catalog/MethodTagChip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCredits, daysBetween } from "@/lib/utils";
import type { Actor } from "@/types";

export const dynamic = "force-dynamic";

export default async function ClientPortal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getClientSession();
  if (!session || session.slug !== slug) redirect(`/ops/client/login?slug=${slug}`);
  const store = getStore();
  const eng = await store.getEngagementBySlug(slug);
  if (!eng) notFound();
  const summary = await store.getEngagementSummary(eng.id);
  if (!summary) notFound();
  const tasks = await store.listTasks(eng.id);
  const services = await store.getServices();

  async function approve(formData: FormData) {
    "use server";
    const taskId = String(formData.get("taskId"));
    const session = await getClientSession();
    if (!session) redirect(`/ops/client/login?slug=${slug}`);
    const actor: Actor = { type: "client", id: session.engagementId, name: "Client" };
    try {
      await getStore().approveTask(taskId, actor, true);
    } catch {
      // swallow; UI will reflect updated state
    }
    redirect(`/ops/client/${slug}`);
  }

  async function requestRevision(formData: FormData) {
    "use server";
    const taskId = String(formData.get("taskId"));
    const note = String(formData.get("note") || "(no note)");
    const session = await getClientSession();
    if (!session) redirect(`/ops/client/login?slug=${slug}`);
    const actor: Actor = { type: "client", id: session.engagementId, name: "Client" };
    try {
      await getStore().requestRevision(taskId, note, actor);
    } catch {}
    redirect(`/ops/client/${slug}`);
  }

  const totalDays = Math.max(1, daysBetween(eng.startDate, eng.endDate));
  const expiryWarn = summary.daysRemaining <= 14 && summary.engagement.status === "active";
  const expiryRed = summary.daysRemaining <= 7;

  const pending = tasks.filter((t) => t.status === "quoted" && !t.approvedByManagerOnBehalf);
  const inProgress = tasks.filter((t) => ["approved", "in_progress"].includes(t.status));
  const submitted = tasks.filter((t) => ["submitted", "revision"].includes(t.status));
  const done = tasks.filter((t) => t.status === "done");

  return (
    <AppShell surface="client" user={{ name: summary.client.name }}>
      <div className="mb-6">
        <h1 className="display text-3xl">Welcome, {summary.client.name}.</h1>
        <p className="text-[var(--color-muted)] mt-1">{summary.package.name} engagement · {summary.brandManager?.name ? `with ${summary.brandManager?.name}` : ""}</p>
      </div>

      {expiryWarn ? (
        <div className={`mb-6 p-4 rounded text-sm ${expiryRed ? "bg-[#F8E0DD] text-[var(--color-danger)]" : "bg-[#FBF1DC] text-[var(--color-warning)]"}`}>
          Your engagement ends on {summary.engagement.endDate}. Talk to your brand manager about renewal.
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <Card>
          <div className="eyebrow mb-2">Flex credits</div>
          <div className="mono text-4xl text-[var(--color-purple-dark)]">{formatCredits(summary.balance.flexCreditsRemaining)} <span className="text-base text-[var(--color-muted)]">/ {formatCredits(summary.balance.flexCreditsTotal)}</span></div>
          <div className="mt-3"><ProgressBar used={summary.balance.flexCreditsUsed} total={summary.balance.flexCreditsTotal} /></div>
          <p className="help mt-2">Spend on whatever you need: campaigns, decks, articles, ads.</p>
        </Card>
        <Card>
          <div className="eyebrow mb-2">Core credits</div>
          <div className="mono text-4xl text-[var(--color-purple-dark)]">{formatCredits(summary.balance.coreCreditsRemaining)} <span className="text-base text-[var(--color-muted)]">/ {formatCredits(summary.balance.coreCreditsTotal)}</span></div>
          <div className="mt-3"><ProgressBar used={summary.balance.coreCreditsUsed} total={summary.balance.coreCreditsTotal} /></div>
          <p className="help mt-2">Locked for the always-on pillars: strategy, content, web upkeep.</p>
        </Card>
        <Card>
          <div className="eyebrow mb-2">Days remaining</div>
          <div className="mono text-4xl text-[var(--color-purple-dark)]">{summary.daysRemaining} <span className="text-base text-[var(--color-muted)]">/ {totalDays}</span></div>
          <div className="mt-3"><ProgressBar used={totalDays - summary.daysRemaining} total={totalDays} /></div>
          <p className="help mt-2">Engagement runs {eng.startDate} → {eng.endDate}.</p>
        </Card>
      </div>

      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="display text-2xl mb-3">Pending your approval</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((t) => {
              const svc = services.find((s) => s.id === t.serviceId);
              return (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="display text-xl">{t.title}</h3>
                      <div className="text-xs text-[var(--color-muted)] mt-1">{svc?.name ?? ""}</div>
                      {svc?.methodTag ? <div className="mt-2"><MethodTagChip methodTag={svc.methodTag} compact /></div> : null}
                    </div>
                    <Chip variant="purple">{t.creditCostLocked} credits</Chip>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{t.brief}</p>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <form action={approve}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <button className="btn btn-primary" type="submit">Approve</button>
                    </form>
                    <details>
                      <summary className="btn btn-ghost cursor-pointer text-sm">Request changes</summary>
                      <form action={requestRevision} className="mt-2 space-y-2">
                        <input type="hidden" name="taskId" value={t.id} />
                        <textarea className="textarea" name="note" rows={3} required placeholder="What would you like changed?" />
                        <button className="btn btn-ghost" type="submit">Send to manager</button>
                      </form>
                    </details>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="display text-2xl mb-3">In progress</h2>
        {inProgress.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Nothing in flight right now.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {inProgress.map((t) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display text-lg">{t.title}</h3>
                  <Chip variant="purple">{t.status.replace("_", " ")}</Chip>
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">{services.find((s) => s.id === t.serviceId)?.name} · {t.creditCostLocked} credits</div>
                {services.find((s) => s.id === t.serviceId)?.methodTag ? <div className="mt-2"><MethodTagChip methodTag={services.find((s) => s.id === t.serviceId)?.methodTag ?? null} compact /></div> : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {submitted.length > 0 ? (
        <section className="mb-8">
          <h2 className="display text-2xl mb-3">Submitted for review</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {submitted.map((t) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="display text-lg">{t.title}</h3>
                  <Chip variant="warning">{t.status.replace("_", " ")}</Chip>
                </div>
                <p className="text-sm whitespace-pre-wrap">{t.brief}</p>
                {services.find((s) => s.id === t.serviceId)?.methodTag ? <div className="mt-3"><MethodTagChip methodTag={services.find((s) => s.id === t.serviceId)?.methodTag ?? null} compact /></div> : null}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <form action={approve}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <button className="btn btn-primary" type="submit">Approve</button>
                  </form>
                  <details>
                    <summary className="btn btn-ghost cursor-pointer text-sm">Request revision</summary>
                    <form action={requestRevision} className="mt-2 space-y-2">
                      <input type="hidden" name="taskId" value={t.id} />
                      <textarea className="textarea" name="note" rows={3} required />
                      <button className="btn btn-ghost" type="submit">Send revision</button>
                    </form>
                  </details>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {done.length > 0 ? (
        <details>
          <summary className="display text-2xl mb-3 cursor-pointer">Delivered ({done.length})</summary>
          <div className="grid gap-2 mt-3">
            {done.map((t) => (
              <div key={t.id} className="card p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">{services.find((s) => s.id === t.serviceId)?.name}</div>
                </div>
                <Chip variant="success">{t.creditCostLocked} credits</Chip>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <footer className="mt-10 text-sm text-[var(--color-muted)] border-t border-[var(--color-line)] pt-4">
        Need something new? Talk to your brand manager{summary.brandManager?.whatsappNumber ? <> on <a className="text-[var(--color-purple)]" href={`https://wa.me/${summary.brandManager.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${summary.brandManager?.name ?? ""}, I'd like to request something new for our ${summary.client.name} engagement.`)}`} target="_blank" rel="noreferrer">WhatsApp</a></> : null}.
      </footer>
    </AppShell>
  );
}
