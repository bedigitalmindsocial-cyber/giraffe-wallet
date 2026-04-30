// Landing splitter. Three doors: staff, client, admin (catalog).

import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center gap-3">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <div>
            <div className="display text-xl leading-none">Giraffe Wallet</div>
            <div className="eyebrow mt-1">Credit-based retainer management</div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl px-6 py-16 w-full">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">Choose a door</div>
          <h1 className="display text-5xl mb-4">Sign in.</h1>
          <p className="text-[var(--color-muted)] text-lg">
            Three surfaces, one system. Pick the one that fits your role.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Link href="/ops/login" className="card p-6 hover:bg-[var(--color-paper-warm)] transition">
            <div className="eyebrow mb-2">For staff</div>
            <h2 className="display text-2xl mb-2">Operations</h2>
            <p className="text-sm text-[var(--color-muted)]">Master dashboard, engagements, tasks. Email and password.</p>
            <div className="mt-6 mono text-xs text-[var(--color-purple)]">/ops/login →</div>
          </Link>

          <Link href="/ops/client/login" className="card p-6 hover:bg-[var(--color-paper-warm)] transition">
            <div className="eyebrow mb-2">For clients</div>
            <h2 className="display text-2xl mb-2">Client portal</h2>
            <p className="text-sm text-[var(--color-muted)]">Your wallet. Approve work, watch credits, see what is in flight.</p>
            <div className="mt-6 mono text-xs text-[var(--color-purple)]">/ops/client/login →</div>
          </Link>

          <Link href="/catalog/login" className="card p-6 hover:bg-[var(--color-paper-warm)] transition">
            <div className="eyebrow mb-2">For super admin</div>
            <h2 className="display text-2xl mb-2">Catalog</h2>
            <p className="text-sm text-[var(--color-muted)]">Services, roles, packages, settings. The pricing brain.</p>
            <div className="mt-6 mono text-xs text-[var(--color-purple)]">/catalog/login →</div>
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--color-line)] py-4 text-xs text-[var(--color-muted)] text-center">
        Built for Giraffe Partners.
      </footer>
    </div>
  );
}
