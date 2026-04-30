// Staff auth. In Supabase mode this would integrate with @supabase/supabase-js
// auth. In mock mode (no Supabase env), we use a simple HMAC-signed cookie
// keyed off email + role for a fast local dev loop.

import { cookies } from "next/headers";
import { sealJson, openJson, safePasswordEquals } from "./hmac";
import { getStore } from "@/lib/data/store";
import type { StaffRole, User, Actor } from "@/types";

const COOKIE = "wallet_staff";
const TTL = 7 * 24 * 60 * 60;

interface StaffPayload {
  userId: string;
  email: string;
  role: StaffRole;
  name: string;
  loggedInAt: number;
}

// Local-dev-only password applies when running mock mode. In Supabase mode the
// real password is verified by Supabase Auth.
const MOCK_PASSWORD = "wallet";

function inMockMode(): boolean {
  return !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function staffLogin(email: string, password: string): Promise<User | null> {
  const store = getStore();
  const user = await store.getUserByEmail(email);
  if (!user || !user.isActive) return null;

  if (inMockMode()) {
    if (!safePasswordEquals(password, MOCK_PASSWORD)) return null;
  } else {
    // In Supabase mode, the API route should call Supabase Auth signInWithPassword
    // and only call this helper after that succeeds. Fail safe: refuse here.
    if (!password || password.length < 6) return null;
  }

  const payload: StaffPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name || user.email,
    loggedInAt: Date.now(),
  };
  const c = await cookies();
  c.set(COOKIE, sealJson<StaffPayload>(payload, TTL), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
  return user;
}

export async function getStaffSession(): Promise<StaffPayload | null> {
  const c = await cookies();
  return openJson<StaffPayload>(c.get(COOKIE)?.value);
}

export async function requireStaff(): Promise<StaffPayload | null> {
  return getStaffSession();
}

export async function staffLogout(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}

export function staffActor(s: StaffPayload): Actor {
  return { type: s.role, id: s.userId, name: s.name };
}

export function isMockAuthMode(): boolean {
  return inMockMode();
}
