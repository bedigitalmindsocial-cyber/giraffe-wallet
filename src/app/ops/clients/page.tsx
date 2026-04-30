import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ClientsList() {
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  const store = getStore();
  const clients = await store.listClients(session.role === "manager" ? session.userId : undefined);

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Dashboard</Link>}>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1">Operations</div>
          <h1 className="display text-4xl">Clients</h1>
          <p className="text-[var(--color-muted)] mt-1">{clients.length} client{clients.length === 1 ? "" : "s"}</p>
        </div>
        {session.role === "super_admin" ? <LinkButton href="/ops/clients/new">New client</LinkButton> : null}
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Sector</th><th>City</th><th>Contact</th><th></th></tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/ops/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link></td>
                <td className="text-sm text-[var(--color-muted)]">{c.sector || "-"}</td>
                <td className="text-sm text-[var(--color-muted)]">{c.city || "-"}</td>
                <td className="text-sm">{c.contactPerson || "-"}{c.contactEmail ? <span className="text-[var(--color-muted)]"> · {c.contactEmail}</span> : null}</td>
                <td className="text-right"><Link href={`/ops/clients/${c.id}`} className="text-sm text-[var(--color-purple)] hover:underline">Open</Link></td>
              </tr>
            ))}
            {clients.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-[var(--color-muted)]">No clients yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
