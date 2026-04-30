import { NextResponse } from "next/server";
import { catalogLogout } from "@/lib/auth/catalog-session";

export async function POST() {
  await catalogLogout();
  return NextResponse.redirect(new URL("/catalog/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"));
}
