// Tiny HMAC-signed cookie payload helper. Format: base64url(payload).hex(hmac)
// Uses Node's crypto (available via nodejs_compat in Workers).

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-not-secure";

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function sealJson<T>(value: T, maxAgeSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const json = JSON.stringify({ v: value, exp });
  const payload = b64url(Buffer.from(json, "utf8"));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function openJson<T>(token: string | undefined): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = sign(payload);
  try {
    if (sig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
  } catch {
    return null;
  }
  let parsed: { v: T; exp: number };
  try {
    parsed = JSON.parse(fromB64url(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) > parsed.exp) return null;
  return parsed.v;
}

export function safePasswordEquals(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
