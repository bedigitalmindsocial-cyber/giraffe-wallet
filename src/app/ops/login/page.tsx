import { redirect } from "next/navigation";
import { staffLogin, getStaffSession, isMockAuthMode } from "@/lib/auth/staff-auth";

export default async function OpsLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getStaffSession()) redirect(sp.next || "/ops");

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const next = String(formData.get("next") || "/ops");
    const user = await staffLogin(email, password);
    if (!user) redirect(`/ops/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    redirect(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <div>
            <div className="display text-lg leading-none">Giraffe Wallet</div>
            <div className="eyebrow mt-1">Operations</div>
          </div>
        </div>
        <h1 className="display text-2xl mb-1">Staff sign in</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">Email and password.</p>
        <form action={action} className="space-y-3">
          <input type="hidden" name="next" value={sp.next || "/ops"} />
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" name="email" autoFocus required defaultValue={isMockAuthMode() ? "admin@giraffe.partners" : ""} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" name="password" required defaultValue={isMockAuthMode() ? "wallet" : ""} />
            {sp.error ? <p className="error">Wrong email or password.</p> : null}
          </div>
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
        {isMockAuthMode() ? (
          <p className="text-xs text-[var(--color-muted)] mt-4 leading-relaxed">
            Mock auth (no Supabase env). Try <span className="mono">admin@giraffe.partners</span>, <span className="mono">manager@giraffe.partners</span>, or <span className="mono">executor@giraffe.partners</span> with password <span className="mono">wallet</span>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
