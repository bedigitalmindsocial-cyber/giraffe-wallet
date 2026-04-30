// Catalog tool: single shared password gate. Cookie is HMAC-signed and lives
// for 12 hours. Verified at the middleware boundary and again in API routes
// for defence in depth.

import { cookies } from "next/headers";
import { sealJson, openJson, safePasswordEquals } from "./hmac";

const COOKIE = "wallet_catalog";
const TTL = 12 * 60 * 60; // 12 hours

interface CatalogPayload {
  ok: true;
  loggedInAt: number;
}

export function expectedPassword(): string {
  return process.env.CATALOG_PASSWORD || "change-me";
}

export async function isCatalogAdmin(): Promise<boolean> {
  const c = await cookies();
  const v = openJson<CatalogPayload>(c.get(COOKIE)?.value);
  return !!v?.ok;
}

export async function catalogLogin(submitted: string): Promise<boolean> {
  if (!safePasswordEquals(submitted, expectedPassword())) return false;
  const c = await cookies();
  c.set(COOKIE, sealJson<CatalogPayload>({ ok: true, loggedInAt: Date.now() }, TTL), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
  return true;
}

export async function catalogLogout(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}
