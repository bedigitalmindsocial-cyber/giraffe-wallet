import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession, staffActor } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";

export default async function NewClient() {
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  if (session.role !== "super_admin") redirect("/ops/clients");

  async function action(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    const store = getStore();
    const c = await store.createClient({
      name: String(formData.get("name") || "").trim(),
      contactPerson: String(formData.get("contactPerson") || "").trim() || undefined,
      contactEmail: String(formData.get("contactEmail") || "").trim() || undefined,
      contactPhone: String(formData.get("contactPhone") || "").trim() || undefined,
      sector: String(formData.get("sector") || "").trim() || undefined,
      city: String(formData.get("city") || "").trim() || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
    }, staffActor(session));
    redirect(`/ops/clients/${c.id}`);
  }

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Clients</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Operations · Clients</div>
        <h1 className="display text-3xl">Add a client</h1>
      </div>
      <form action={action} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="label">Company name</label>
          <input className="input" name="name" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sector</label>
            <input className="input" name="sector" placeholder="Auto Components" />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" name="city" placeholder="Faridabad" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Contact person</label>
            <input className="input" name="contactPerson" />
          </div>
          <div>
            <label className="label">Contact phone (WhatsApp)</label>
            <input className="input" name="contactPhone" placeholder="+91…" />
          </div>
        </div>
        <div>
          <label className="label">Contact email</label>
          <input className="input" type="email" name="contactEmail" />
        </div>
        <div>
          <label className="label">Internal notes</label>
          <textarea className="textarea" name="notes" rows={3} />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" type="submit">Create client</button>
          <a className="btn btn-ghost" href="/ops/clients">Cancel</a>
        </div>
      </form>
    </AppShell>
  );
}
