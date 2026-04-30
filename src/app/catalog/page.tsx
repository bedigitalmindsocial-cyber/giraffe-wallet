import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export const dynamic = "force-dynamic";

export default async function CatalogDashboard() {
  const store = getStore();
  const [roles, services, packages, settings] = await Promise.all([
    store.getRoles(),
    store.getServices(),
    store.getPackages(),
    store.getSettings(),
  ]);
  const overrides = services.filter((s) => s.creditCostOverride).length;
  const archived = services.filter((s) => !s.isActive).length;

  const cards = [
    { href: "/catalog/services", title: "Services", count: services.length, sub: `${overrides} override${overrides === 1 ? "" : "s"}, ${archived} archived` },
    { href: "/catalog/roles", title: "Roles", count: roles.length, sub: roles.map((r) => r.name.split(" ")[0]).join(", ") },
    { href: "/catalog/packages", title: "Packages", count: packages.length, sub: packages.map((p) => p.name).join(", ") },
    { href: "/catalog/settings", title: "Settings", count: 3, sub: `₹${settings.baseHourlyRate}/h × ${settings.markupMultiplier}, ₹${settings.creditValue}/credit` },
  ];

  return (
    <AppShell surface="catalog" user={{ name: "Super admin" }}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1">Pricing brain</div>
          <h1 className="display text-4xl">Catalog</h1>
          <p className="text-[var(--color-muted)] mt-2 max-w-xl">
            Configure services, roles, packages, and the pricing settings. Changes here apply to all future tasks immediately.
          </p>
        </div>
        <Chip variant="purple">Auto cost: hours × multiplier × ₹{settings.baseHourlyRate} × {settings.markupMultiplier} ÷ ₹{settings.creditValue}</Chip>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card p-6 hover:bg-[var(--color-paper-warm)] transition">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="eyebrow mb-1">{c.title}</div>
                <div className="display text-3xl">{c.title}</div>
              </div>
              <div className="mono text-3xl text-[var(--color-purple-dark)]">{c.count}</div>
            </div>
            <div className="mt-4 text-sm text-[var(--color-muted)]">{c.sub}</div>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <div className="eyebrow mb-2">Quick context</div>
        <p className="text-sm leading-relaxed">
          A credit is worth <span className="mono">₹{settings.creditValue}</span>. The base internal rate is{" "}
          <span className="mono">₹{settings.baseHourlyRate}/hour</span> at multiplier 1. Markup is <span className="mono">{settings.markupMultiplier}×</span>.
          Each role has its own multiplier, so a Senior Manager hour costs more credits than an Executive hour. Service costs are auto-calculated from
          the formula above. You can override on a per-service basis with a written reason.
        </p>
      </Card>
    </AppShell>
  );
}
