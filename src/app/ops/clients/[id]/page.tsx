import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { formatCredits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  const store = getStore();
  const client = await store.getClient(id);
  if (!client) notFound();
  const all = await store.listEngagements({}, session.userId);
  const mine = all.filter((s) => s.engagement.clientId === id);

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Clients</Link>}>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="eyebrow mb-1">{client.sector || "Client"} · {client.city || ""}</div>
          <h1 className="display text-4xl">{client.name}</h1>
          <p className="text-[var(--color-muted)] mt-1">{client.contactPerson || "-"}{client.contactEmail ? ` · ${client.contactEmail}` : ""}{client.contactPhone ? ` · ${client.contactPhone}` : ""}</p>
        </div>
        {session.role === "super_admin" ? <LinkButton href={`/ops/engagements/new?client=${client.id}`}>New engagement</LinkButton> : null}
      </div>

      <Card className="mb-6">
        <h2 className="display text-xl mb-3">Engagements</h2>
        <table className="table">
          <thead><tr><th>Slug</th><th>Package</th><th>Dates</th><th>Status</th><th>Flex remaining</th><th></th></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.engagement.id}>
                <td className="mono">{s.engagement.slug}</td>
                <td>{s.package.name}</td>
                <td className="text-sm">{s.engagement.startDate} → {s.engagement.endDate}</td>
                <td><Chip variant={s.engagement.status === "active" ? "success" : s.engagement.status === "paused" ? "warning" : "danger"}>{s.engagement.status}</Chip></td>
                <td className="mono">{formatCredits(s.balance.flexCreditsRemaining)} / {formatCredits(s.balance.flexCreditsTotal)}</td>
                <td className="text-right"><Link className="text-sm text-[var(--color-purple)] hover:underline" href={`/ops/engagements/${s.engagement.id}`}>Open</Link></td>
              </tr>
            ))}
            {mine.length === 0 ? <tr><td colSpan={6} className="text-center text-[var(--color-muted)] py-6">No engagements yet for this client.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      {client.notes ? (
        <Card>
          <div className="eyebrow mb-2">Internal notes</div>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </Card>
      ) : null}
    </AppShell>
  );
}
