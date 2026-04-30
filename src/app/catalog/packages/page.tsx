import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import type { Actor } from "@/types";

const ADMIN: Actor = { type: "super_admin", id: "catalog-admin", name: "Super admin" };

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const store = getStore();
  const packages = await store.getPackages();

  async function upsert(formData: FormData) {
    "use server";
    const store = getStore();
    await store.upsertPackage({
      id: String(formData.get("id") || "") || undefined,
      name: String(formData.get("name") || "").trim(),
      quarterlyFeeInr: parseInt(String(formData.get("quarterlyFeeInr") || "0")) || 0,
      totalCredits: parseInt(String(formData.get("totalCredits") || "0")) || 0,
      coreCredits: parseInt(String(formData.get("coreCredits") || "0")) || 0,
      description: String(formData.get("description") || "").trim() || undefined,
      sortOrder: parseInt(String(formData.get("sortOrder") || "0")) || 0,
      isActive: formData.get("isActive") === "on",
    }, ADMIN);
    redirect("/catalog/packages");
  }

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Catalog</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Catalog</div>
        <h1 className="display text-4xl">Packages</h1>
        <p className="text-[var(--color-muted)] mt-1">Quarterly tiers. Each package locks a credit volume and a fixed quarterly fee. Core credits cover the always-included pillars.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((p) => (
          <form key={p.id} action={upsert} className="card p-5 space-y-3">
            <input type="hidden" name="id" value={p.id} />
            <div>
              <label className="label">Name</label>
              <input className="input" name="name" defaultValue={p.name} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Quarterly fee (₹)</label>
                <input className="input mono" type="number" name="quarterlyFeeInr" defaultValue={p.quarterlyFeeInr} required />
              </div>
              <div>
                <label className="label">Sort order</label>
                <input className="input mono" type="number" name="sortOrder" defaultValue={p.sortOrder} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Total credits</label>
                <input className="input mono" type="number" name="totalCredits" defaultValue={p.totalCredits} required />
              </div>
              <div>
                <label className="label">Core credits</label>
                <input className="input mono" type="number" name="coreCredits" defaultValue={p.coreCredits} required />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} name="description" defaultValue={p.description ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={p.isActive} /> Active
            </label>
            <div className="text-xs text-[var(--color-muted)]">Effective rate: <span className="mono">₹{Math.round(p.quarterlyFeeInr / Math.max(1, p.totalCredits))}/credit</span> · Flex pool: <span className="mono">{p.totalCredits - p.coreCredits}</span></div>
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        ))}
        <form action={upsert} className="card p-5 space-y-3 border-dashed" style={{ borderStyle: "dashed" }}>
          <h3 className="display text-xl">Add package</h3>
          <input className="input" name="name" placeholder="Name (e.g. Enterprise)" required />
          <input className="input mono" type="number" name="quarterlyFeeInr" placeholder="Quarterly fee (INR)" required />
          <input className="input mono" type="number" name="totalCredits" placeholder="Total credits" required />
          <input className="input mono" type="number" name="coreCredits" placeholder="Core credits" required />
          <input className="input mono" type="number" name="sortOrder" placeholder="Sort order" defaultValue={4} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
          <button type="submit" className="btn btn-primary w-full">Add</button>
        </form>
      </div>
    </AppShell>
  );
}
