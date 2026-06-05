import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { MethodTagChip } from "@/components/catalog/MethodTagChip";
import { METHOD_TAG_OPTIONS } from "@/lib/method-tags";
import type { ServiceMethodTag, ServiceTag } from "@/types";

export const dynamic = "force-dynamic";

export default async function ServicesList({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; tag?: string; method?: string; active?: string }> }) {
  const sp = await searchParams;
  const store = getStore();
  const serviceTag: ServiceTag | undefined = sp.tag ? (sp.tag as ServiceTag) : undefined;
  const methodTag: ServiceMethodTag | undefined = sp.method ? (sp.method as ServiceMethodTag) : undefined;
  const [services, roles] = await Promise.all([
    store.getServices({
      search: sp.q,
      categories: sp.cat ? [sp.cat] : undefined,
      tags: serviceTag ? [serviceTag] : undefined,
      methodTags: methodTag ? [methodTag] : undefined,
      activeOnly: sp.active === "1",
    }),
    store.getRoles(),
  ]);
  const allServices = await store.getServices();
  const categories = Array.from(new Set(allServices.map((s) => s.category))).sort();

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }} nav={<Link href="/catalog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">← Catalog</Link>}>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="eyebrow mb-1">Catalog</div>
          <h1 className="display text-4xl">Services</h1>
          <p className="text-[var(--color-muted)] mt-1">{services.length} of {allServices.length} shown</p>
        </div>
        <LinkButton href="/catalog/services/new">Add service</LinkButton>
      </div>

      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" type="text" name="q" defaultValue={sp.q} placeholder="Name or description" />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Category</label>
          <select className="select" name="cat" defaultValue={sp.cat ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="label">Tag</label>
          <select className="select" name="tag" defaultValue={sp.tag ?? ""}>
            <option value="">All tags</option>
            <option value="NEW">NEW</option>
            <option value="POPULAR">POPULAR</option>
            <option value="PROMO">PROMO</option>
            <option value="DISCONTINUED">DISCONTINUED</option>
          </select>
        </div>
        <div className="min-w-[220px]">
          <label className="label">Delivery method</label>
          <select className="select" name="method" defaultValue={sp.method ?? ""}>
            <option value="">All methods</option>
            {METHOD_TAG_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mb-1 text-sm">
          <input type="checkbox" name="active" value="1" defaultChecked={sp.active === "1"} /> Active only
        </label>
        <button className="btn btn-ghost" type="submit">Apply</button>
      </form>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Default role</th>
              <th className="text-right">Avg hours</th>
              <th className="text-right">Credit cost</th>
              <th>Method</th>
              <th>Tag</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const role = roles.find((r) => r.id === s.defaultRoleId);
              return (
                <tr key={s.id}>
                  <td>
                    <Link href={`/catalog/services/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                    {s.description ? <div className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-1">{s.description}</div> : null}
                  </td>
                  <td className="text-sm text-[var(--color-muted)]">{s.category}</td>
                  <td className="text-sm">{role?.name ?? "-"}</td>
                  <td className="mono text-right">{s.avgHours}</td>
                  <td className="mono text-right">
                    {s.creditCost}
                    {s.creditCostOverride ? <Chip variant="warning" className="ml-2">↑ override</Chip> : null}
                  </td>
                  <td><MethodTagChip methodTag={s.methodTag} compact /></td>
                  <td>{s.tag ? <Chip variant={s.tag === "DISCONTINUED" ? "danger" : "purple"}>{s.tag}</Chip> : null}</td>
                  <td>{s.isActive ? <Chip variant="success">active</Chip> : <Chip variant="danger">inactive</Chip>}</td>
                  <td className="text-right"><Link className="text-sm text-[var(--color-purple)] hover:underline" href={`/catalog/services/${s.id}`}>Edit</Link></td>
                </tr>
              );
            })}
            {services.length === 0 ? <tr><td colSpan={9} className="text-center text-[var(--color-muted)] py-8">No services match the current filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
