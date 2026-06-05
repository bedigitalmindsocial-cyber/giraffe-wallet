import { redirect } from "next/navigation";
import { catalogLogin, isCatalogAdmin } from "@/lib/auth/catalog-session";

export const dynamic = "force-dynamic";

export default async function CatalogLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await isCatalogAdmin()) redirect(sp.next || "/catalog");

  async function action(formData: FormData) {
    "use server";
    const pwd = String(formData.get("password") || "");
    const ok = await catalogLogin(pwd);
    const next = String(formData.get("next") || "/catalog");
    if (!ok) redirect(`/catalog/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    redirect(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <div>
            <div className="display text-lg leading-none">Giraffe Wallet</div>
            <div className="eyebrow mt-1">Catalog & Calculator</div>
          </div>
        </div>
        <h1 className="display text-2xl mb-1">Admin sign in</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">Single password. Set as <span className="mono">CATALOG_PASSWORD</span> in your env.</p>
        <form action={action} className="space-y-3">
          <input type="hidden" name="next" value={sp.next || "/catalog"} />
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" name="password" autoFocus required />
            {sp.error ? <p className="error">Incorrect password.</p> : null}
          </div>
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
