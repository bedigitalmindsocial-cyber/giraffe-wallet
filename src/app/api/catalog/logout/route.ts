import { NextResponse } from "next/server";
import { catalogLogout } from "@/lib/auth/catalog-session";

export async function POST(request: Request) {
  await catalogLogout();
  return NextResponse.redirect(new URL("/catalog/login", request.url));
}
