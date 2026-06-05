// Staff auth. In mock mode, we use a shared dev password. In Supabase mode,
// staff credentials are verified with Supabase Auth before the app user row is
// loaded from public.users.

import { createClient } from "@supabase/supabase-js";
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

async function verifySupabasePassword(email: string, password: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return data.user.id;
}

export async function staffLogin(email: string, password: string): Promise<User | null> {
  const store = getStore();
  let user: User | null = null;

  if (inMockMode()) {
    user = await store.getUserByEmail(email);
    if (!user || !user.isActive) return null;
    if (!safePasswordEquals(password, MOCK_PASSWORD)) return null;
  } else {
    const userId = await verifySupabasePassword(email, password);
    if (!userId) return null;
    user = await store.getUserById(userId);
    if (!user || !user.isActive || user.email.toLowerCase() !== email.toLowerCase()) return null;
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
