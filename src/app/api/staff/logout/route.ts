import { NextResponse } from "next/server";
import { staffLogout } from "@/lib/auth/staff-auth";

export async function POST() {
  await staffLogout();
  return NextResponse.redirect(new URL("/ops/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"));
}
