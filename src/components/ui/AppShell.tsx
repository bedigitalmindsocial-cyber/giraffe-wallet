import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  surface,
  user,
  children,
  nav,
}: {
  surface: "catalog" | "ops" | "client";
  user?: { name?: string; email?: string; role?: string };
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img src="/logo.svg" alt="Giraffe" width={32} height={32} />
            <div className="leading-tight">
              <div className="display text-lg leading-none whitespace-nowrap">Giraffe Wallet</div>
              <div className="eyebrow mt-1 whitespace-nowrap">{surface === "catalog" ? "Catalog" : surface === "ops" ? "Operations" : "Client portal"}</div>
            </div>
          </Link>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {nav}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right text-xs leading-tight">
                  <div className="font-medium whitespace-nowrap">{user.name || user.email}</div>
                  {user.role ? <div className="text-[var(--color-muted)] whitespace-nowrap">{user.role.replace("_", " ")}</div> : null}
                </div>
                <form action={surface === "catalog" ? "/api/catalog/logout" : surface === "ops" ? "/api/staff/logout" : "/api/client/logout"} method="post">
                  <button type="submit" className="btn btn-ghost text-xs px-3 py-1.5">Sign out</button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
      <footer className="border-t border-[var(--color-line)] py-4 text-xs text-[var(--color-muted)] text-center">
        Giraffe Wallet. Built for Giraffe Partners.
      </footer>
    </div>
  );
}
