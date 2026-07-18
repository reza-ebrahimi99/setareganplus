import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  PORTAL_SESSION_COOKIE,
} from "@/lib/auth/cookie";

/**
 * Cookie-presence gates for /admin and /portal.
 * Full session verification happens in route loaders / actions.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (
      pathname === "/admin/login" ||
      pathname.startsWith("/admin/login/")
    ) {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!adminToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    if (
      pathname === "/portal/login" ||
      pathname.startsWith("/portal/login/")
    ) {
      return NextResponse.next();
    }

    if (pathname === "/portal/logout") {
      return NextResponse.next();
    }

    const portalToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    if (!portalToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/portal/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*"],
};
