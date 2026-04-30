import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession, staffActor } from "@/lib/auth/staff-auth";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { addDays, todayIso } from "@/lib/utils";

export default async function NewEngagement({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const session = await getStaffSession();
  if (!session) redirect("/ops/login");
  if (session.role !== "super_admin") redirect("/ops");
  const store = getStore();
  const [clients, packages, managers] = await Promise.all([
    store.listClients(),
    store.getPackages(),
    store.listStaff().then((arr) => arr.filter((u) => u.role === "manager" || u.role === "super_admin")),
  ]);

  async function action(formData: FormData) {
    "use server";
    const session = await getStaffSession();
    if (!session) redirect("/ops/login");
    const store = getStore();
    const eng = await store.createEngagement({
      clientId: String(formData.get("clientId")),
      packageId: String(formData.get("packageId")),
      startDate: String(formData.get("startDate") || todayIso()),
      endDate: String(formData.get("endDate") || addDays(todayIso(), 90)),
      brandManagerId: String(formData.get("brandManagerId")) || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
    }, staffActor(session));
    redirect(`/ops/engagements/${eng.id}`);
  }

  return (
    <AppShell surface="ops" user={{ name: session.name, role: session.role }} nav={<Link href="/ops" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Dashboard</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Operations</div>
        <h1 className="display text-3xl">New engagement</h1>
        <p className="text-[var(--color-muted)] mt-1">A 4-digit passcode and a unique slug will be generated. Nine system Core tasks will be pre-created across 3 months.</p>
      </div>
      <form action={action} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="label">Client</label>
          <select className="select" name="clientId" required defaultValue={sp.client ?? ""}>
            <option value="" disabled>Pick a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="help">Need a new client? <Link href="/ops/clients/new" className="text-[var(--color-purple)] hover:underline">Create one</Link>.</p>
        </div>
        <div>
          <label className="label">Package</label>
          <select className="select" name="packageId" required>
            {packages.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.totalCredits} credits ({p.coreCredits} core + {p.flexCredits} flex) · ₹{p.quarterlyFeeInr.toLocaleString("en-IN")}/quarter</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start date</label>
            <input className="input mono" type="date" name="startDate" defaultValue={todayIso()} required />
          </div>
          <div>
            <label className="label">End date</label>
            <input className="input mono" type="date" name="endDate" defaultValue={addDays(todayIso(), 90)} required />
          </div>
        </div>
        <div>
          <label className="label">Brand manager</label>
          <select className="select" name="brandManagerId">
            <option value="">Unassigned</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name || m.email} ({m.role.replace("_", " ")})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Internal notes</label>
          <textarea className="textarea" name="notes" rows={3} />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" type="submit">Create engagement</button>
          <a className="btn btn-ghost" href="/ops">Cancel</a>
        </div>
      </form>
    </AppShell>
  );
}
