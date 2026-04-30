import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { ServiceForm } from "@/components/catalog/ServiceForm";
import type { Actor, ServiceTag } from "@/types";

const ADMIN: Actor = { type: "super_admin", id: "catalog-admin", name: "Super admin" };

export default async function NewService() {
  const store = getStore();
  const [roles, settings] = await Promise.all([store.getRoles(), store.getSettings()]);

  async function action(formData: FormData) {
    "use server";
    const store = getStore();
    const tagRaw = String(formData.get("tag") || "");
    const tag: ServiceTag = (tagRaw === "" ? null : (tagRaw as ServiceTag));
    const overrideOn = formData.get("creditCostOverride") === "on";
    const created = await store.upsertService({
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || undefined,
      category: String(formData.get("category") || "").trim(),
      defaultRoleId: String(formData.get("defaultRoleId") || ""),
      avgHours: parseFloat(String(formData.get("avgHours") || "0")) || 0,
      includedRevisions: parseInt(String(formData.get("includedRevisions") || "2")) || 2,
      tag,
      creditCostOverride: overrideOn,
      creditCost: overrideOn ? parseInt(String(formData.get("creditCost") || "0")) || 0 : undefined,
      creditCostOverrideReason: overrideOn ? String(formData.get("creditCostOverrideReason") || "").trim() : undefined,
    }, ADMIN);
    const next = String(formData.get("next") || "back");
    redirect(next === "new" ? "/catalog/services/new" : `/catalog/services/${created.id}`);
  }

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog/services" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Services</Link>}>
      <div className="mb-6">
        <div className="eyebrow mb-1">Catalog · Services</div>
        <h1 className="display text-3xl">Add a service</h1>
      </div>
      <ServiceForm roles={roles} settings={settings} action={action} />
    </AppShell>
  );
}
