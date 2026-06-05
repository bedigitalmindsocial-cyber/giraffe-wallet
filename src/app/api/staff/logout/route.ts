import { NextResponse } from "next/server";
import { staffLogout } from "@/lib/auth/staff-auth";

export async function POST(request: Request) {
  await staffLogout();
  return NextResponse.redirect(new URL("/ops/login", request.url));
}
