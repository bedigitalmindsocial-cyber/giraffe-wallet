import { NextResponse } from "next/server";
import { clientLogout } from "@/lib/auth/client-session";

export async function POST(request: Request) {
  await clientLogout();
  return NextResponse.redirect(new URL("/ops/client/login", request.url));
}
