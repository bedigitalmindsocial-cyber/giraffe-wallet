import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import type { Actor } from "@/types";

const ADMIN: Actor = { type: "super_admin", id: "catalog-admin", name: "Super admin" };

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ preview?: string; b?: string; m?: string; v?: string }> }) {
  const sp = await searchParams;
  const store = getStore();
  const settings = await store.getSettings();

  const previewActive = sp.preview === "1";
  const previewSettings = previewActive
    ? {
        baseHourlyRate: parseFloat(sp.b || "") || settings.baseHourlyRate,
        markupMultiplier: parseFloat(sp.m || "") || settings.markupMultiplier,
        creditValue: parseFloat(sp.v || "") || settings.creditValue,
      }
    : null;
  const preview = previewSettings ? await store.previewSettings(previewSettings) : [];

  async function previewAction(formData: FormData) {
    "use server";
    const b = String(formData.get("baseHourlyRate") || "");
    const m = String(formData.get("markupMultiplier") || "");
    const v = String(formData.get("creditValue") || "");
    redirect(`/catalog/settings?preview=1&b=${b}&m=${m}&v=${v}`);
  }

  async function applyAction(formData: FormData) {
    "use server";
    const store = getStore();
    await store.updateSettings({
      baseHourlyRate: parseFloat(String(formData.get("baseHourlyRate") || "0")) || 0,
      markupMultiplier: parseFloat(String(formData.get("markupMultiplier") || "0")) || 0,
      creditValue: parseFloat(String(formData.get("creditValue") || "0")) || 0,
    }, ADMIN);
    redirect("/catalog/settings");
  }

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Catalog</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Catalog</div>
        <h1 className="display text-4xl">Settings</h1>
        <p className="text-[var(--color-muted)] mt-1">These three numbers drive every credit cost. Already-quoted tasks keep their original locked price.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form action={previewAction} className="card p-6 space-y-4">
          <div className="eyebrow">Adjust</div>
          <div>
            <label className="label">Base hourly rate (₹)</label>
            <input className="input mono" type="number" step="1" min="1" name="baseHourlyRate" defaultValue={previewSettings?.baseHourlyRate ?? settings.baseHourlyRate} required />
            <p className="help">Applied to multiplier 1 (Executive role).</p>
          </div>
          <div>
            <label className="label">Markup multiplier</label>
            <input className="input mono" type="number" step="0.1" min="1" name="markupMultiplier" defaultValue={previewSettings?.markupMultiplier ?? settings.markupMultiplier} required />
            <p className="help">2.5× covers ops, overheads, brand cost, margin.</p>
          </div>
          <div>
            <label className="label">Credit value (₹)</label>
            <input className="input mono" type="number" step="1" min="1" name="creditValue" defaultValue={previewSettings?.creditValue ?? settings.creditValue} required />
            <p className="help">Each credit&apos;s INR equivalent for client-facing math.</p>
          </div>
          <button className="btn btn-primary w-full" type="submit">Preview impact</button>
        </form>

        <div className="card p-6">
          <div className="eyebrow mb-2">Current values</div>
          <ul className="text-sm space-y-2 mono">
            <li>Base rate: ₹{settings.baseHourlyRate}/h</li>
            <li>Markup: {settings.markupMultiplier}×</li>
            <li>Credit value: ₹{settings.creditValue}</li>
            <li>Last updated: {new Date(settings.updatedAt).toLocaleString()}</li>
          </ul>
          <div className="eyebrow mt-6 mb-2">Formula</div>
          <p className="text-sm leading-relaxed">
            <span className="mono">credits = ceil(hours × roleMultiplier × baseRate × markup ÷ creditValue)</span>
          </p>
        </div>
      </div>

      {previewActive ? (
        <form action={applyAction} className="mt-8 card p-6">
          <input type="hidden" name="baseHourlyRate" value={previewSettings!.baseHourlyRate} />
          <input type="hidden" name="markupMultiplier" value={previewSettings!.markupMultiplier} />
          <input type="hidden" name="creditValue" value={previewSettings!.creditValue} />
          <h2 className="display text-2xl mb-3">Preview: {preview.length} services would change</h2>
          {preview.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No services would change. Either nothing differs, or all services are overrides.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Service</th><th className="text-right">Current</th><th className="text-right">After</th><th className="text-right">Δ</th></tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono text-right">{p.oldCost}</td>
                    <td className="mono text-right">{p.newCost}</td>
                    <td className={`mono text-right ${p.newCost > p.oldCost ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>{p.newCost > p.oldCost ? "+" : ""}{p.newCost - p.oldCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="help mt-4">Already-quoted tasks keep their original credit_cost_locked. Only future task quotes use the new prices. Override-active services are excluded.</p>
          <div className="mt-4 flex gap-3">
            <button className="btn btn-primary" type="submit">Apply</button>
            <a className="btn btn-ghost" href="/catalog/settings">Cancel</a>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
