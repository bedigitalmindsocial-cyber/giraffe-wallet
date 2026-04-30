// Edge middleware: gate the catalog, staff ops, and client portal surfaces.
// We only check cookie *presence* here. Full HMAC validation happens in the
// Node-runtime page/route handlers (we can't import 'crypto' on the edge).

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_CATALOG = "wallet_catalog";
const COOKIE_STAFF = "wallet_staff";
const COOKIE_CLIENT = "wallet_client";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Catalog surface: everything under /catalog requires the catalog cookie,
  // except /catalog/login and /api/catalog/login.
  if (pathname.startsWith("/catalog") && pathname !== "/catalog/login") {
    if (!req.cookies.get(COOKIE_CATALOG)) {
      const url = req.nextUrl.clone();
      url.pathname = "/catalog/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Staff ops: everything under /ops except /ops/login and /ops/client/*
  // requires the staff cookie. /ops/client has its own gate.
  if (pathname.startsWith("/ops") && pathname !== "/ops/login" && !pathname.startsWith("/ops/client")) {
    if (!req.cookies.get(COOKIE_STAFF)) {
      const url = req.nextUrl.clone();
      url.pathname = "/ops/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Client portal: /ops/client/[slug]/... requires the client cookie.
  if (pathname.startsWith("/ops/client/") && pathname !== "/ops/client/login") {
    if (!req.cookies.get(COOKIE_CLIENT)) {
      const url = req.nextUrl.clone();
      url.pathname = "/ops/client/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/catalog/:path*", "/ops/:path*"],
};
