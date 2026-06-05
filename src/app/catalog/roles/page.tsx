import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import type { Actor } from "@/types";

const ADMIN: Actor = { type: "super_admin", id: "catalog-admin", name: "Super admin" };

export const dynamic = "force-dynamic";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const store = getStore();
  const [roles, services, settings] = await Promise.all([store.getRoles(), store.getServices(), store.getSettings()]);

  async function upsert(formData: FormData) {
    "use server";
    const store = getStore();
    await store.upsertRole({
      id: String(formData.get("id") || "") || undefined,
      name: String(formData.get("name") || "").trim(),
      multiplier: parseFloat(String(formData.get("multiplier") || "1")) || 1,
      notes: String(formData.get("notes") || "").trim() || undefined,
    }, ADMIN);
    redirect("/catalog/roles");
  }

  async function remove(formData: FormData) {
    "use server";
    const store = getStore();
    try {
      await store.deleteRole(String(formData.get("id")));
      redirect("/catalog/roles");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete";
      redirect(`/catalog/roles?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Catalog</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Catalog</div>
        <h1 className="display text-4xl">Roles</h1>
        <p className="text-[var(--color-muted)] mt-1">A role&apos;s multiplier scales the base hourly rate. Used in every credit cost calculation.</p>
        {sp.error ? <p className="error mt-3">{sp.error}</p> : null}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Multiplier</th>
              <th>Notes</th>
              <th>References</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const refServices = services.filter((s) => s.defaultRoleId === r.id).length;
              return (
                <tr key={r.id}>
                  <td>
                    <form action={upsert} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={r.id} />
                      <input className="input" name="name" defaultValue={r.name} required />
                  </form>
                  </td>
                  <td>
                    <form action={upsert} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="name" value={r.name} />
                      <input className="input mono w-24" name="multiplier" type="number" step="0.1" min="0.1" defaultValue={r.multiplier} required />
                      <button className="btn btn-ghost text-xs" type="submit">Save</button>
                    </form>
                  </td>
                  <td className="text-sm text-[var(--color-muted)]">{r.notes || "-"}</td>
                  <td className="mono text-sm">{refServices} services</td>
                  <td className="text-right">
                    <form action={remove}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-ghost text-xs" type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={5}>
                <form action={upsert} className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <label className="label">New role name</label>
                    <input className="input" name="name" placeholder="e.g. Director" required />
                  </div>
                  <div>
                    <label className="label">Multiplier</label>
                    <input className="input mono w-24" name="multiplier" type="number" step="0.1" min="0.1" defaultValue={1.5} required />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="label">Notes (optional)</label>
                    <input className="input" name="notes" placeholder="When to use this role" />
                  </div>
                  <button className="btn btn-primary" type="submit">Add role</button>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--color-muted)]">Current settings: ₹{settings.baseHourlyRate}/h base × multiplier × {settings.markupMultiplier} markup, ₹{settings.creditValue} per credit.</p>
    </AppShell>
  );
}
