import { NextResponse } from "next/server";
import { clientLogout } from "@/lib/auth/client-session";

export async function POST() {
  await clientLogout();
  return NextResponse.redirect(new URL("/ops/client/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"));
}
