// Client portal: 4-digit passcode gates a single engagement. Cookie is
// HMAC-signed and stores the engagement id + slug.

import { cookies } from "next/headers";
import { sealJson, openJson } from "./hmac";
import { getStore } from "@/lib/data/store";

const COOKIE = "wallet_client";
const TTL = 7 * 24 * 60 * 60; // 7 days

export interface ClientPayload {
  engagementId: string;
  slug: string;
  loggedInAt: number;
}

export async function clientLogin(slug: string, passcode: string): Promise<ClientPayload | null> {
  const store = getStore();
  const ok = await store.verifyEngagementPasscode(slug, passcode);
  if (!ok) return null;
  const eng = await store.getEngagementBySlug(slug);
  if (!eng) return null;
  const payload: ClientPayload = { engagementId: eng.id, slug, loggedInAt: Date.now() };
  const c = await cookies();
  c.set(COOKIE, sealJson<ClientPayload>(payload, TTL), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
  return payload;
}

export async function getClientSession(): Promise<ClientPayload | null> {
  const c = await cookies();
  return openJson<ClientPayload>(c.get(COOKIE)?.value);
}

export async function clientLogout(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}
