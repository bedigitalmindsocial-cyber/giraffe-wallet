import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { ServiceForm } from "@/components/catalog/ServiceForm";
import type { Actor, ServiceMethodTag, ServiceLifecycleTag } from "@/types";

const ADMIN: Actor = { type: "super_admin", id: "catalog-admin", name: "Super admin" };

export const dynamic = "force-dynamic";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const [service, roles] = await Promise.all([store.getService(id), store.getRoles()]);
  if (!service) notFound();

  async function action(formData: FormData) {
    "use server";
    const store = getStore();
    const lifecycleTagRaw = String(formData.get("lifecycleTag") || "");
    const lifecycleTag: ServiceLifecycleTag = lifecycleTagRaw === "" ? null : (lifecycleTagRaw as ServiceLifecycleTag);
    const methodTagRaw = String(formData.get("methodTag") || "");
    const methodTag: ServiceMethodTag = methodTagRaw === "" ? "HYBRID" : (methodTagRaw as ServiceMethodTag);
    await store.upsertService({
      id,
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || undefined,
      category: String(formData.get("category") || "").trim(),
      defaultRoleId: String(formData.get("defaultRoleId") || ""),
      creditsPerUnit: parseFloat(String(formData.get("creditsPerUnit") || "0")) || 0,
      pricingModel: (String(formData.get("pricingModel") || "flat")) as import("@/types").ServicePricingModel,
      unitLabel: String(formData.get("unitLabel") || "unit").trim() || "unit",
      includedRevisionsPerUnit: parseFloat(String(formData.get("includedRevisionsPerUnit") || "0.5")) || 0.5,
      lifecycleTag,
      methodTag,
    }, ADMIN);
    const next = String(formData.get("next") || "back");
    redirect(next === "new" ? "/catalog/services/new" : `/catalog/services`);
  }

  async function archive() {
    "use server";
    const store = getStore();
    await store.archiveService(id, ADMIN);
    redirect("/catalog/services");
  }

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog/services" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Services</Link>}>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1">Catalog · Services</div>
          <h1 className="display text-3xl">{service.name}</h1>
        </div>
        <form action={archive}>
          <button className="btn btn-danger" type="submit">Archive</button>
        </form>
      </div>
      <ServiceForm initial={service} roles={roles} action={action} />
    </AppShell>
  );
}
