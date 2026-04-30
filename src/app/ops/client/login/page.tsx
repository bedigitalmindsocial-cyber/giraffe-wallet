import { redirect } from "next/navigation";
import { clientLogin, getClientSession } from "@/lib/auth/client-session";

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; slug?: string; pre?: string }> }) {
  const sp = await searchParams;
  const existing = await getClientSession();
  if (existing) redirect(sp.next || `/ops/client/${existing.slug}`);

  async function action(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") || "").trim();
    const passcode = String(formData.get("passcode") || "").trim();
    const result = await clientLogin(slug, passcode);
    if (!result) redirect(`/ops/client/login?error=1&slug=${encodeURIComponent(slug)}`);
    redirect(`/ops/client/${slug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <div>
            <div className="display text-lg leading-none">Giraffe Wallet</div>
            <div className="eyebrow mt-1">Client portal</div>
          </div>
        </div>
        <h1 className="display text-2xl mb-1">Welcome.</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">Use the engagement code and 4-digit passcode your brand manager sent you.</p>
        <form action={action} className="space-y-3">
          <div>
            <label className="label">Engagement code</label>
            <input className="input mono" name="slug" required defaultValue={sp.slug} placeholder="e.g. saraswati-industries-a3k7" />
          </div>
          <div>
            <label className="label">4-digit passcode</label>
            <input className="input mono" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} name="passcode" required placeholder="••••" />
            {sp.error ? <p className="error">Code or passcode is wrong.</p> : null}
          </div>
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
        {sp.pre ? <p className="text-xs text-[var(--color-muted)] mt-4">Tip: passcode for the demo engagement is <span className="mono">1234</span>.</p> : null}
      </div>
    </div>
  );
}
