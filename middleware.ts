import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  PORTAL_SESSION_COOKIE,
} from "@/lib/auth/cookie";
import {
  COUNSELOR_OS_ENTRY_PATH,
  isCounselorHost,
} from "@/lib/counselor-os/host";

/**
 * Cookie-presence gates for /admin and /portal.
 * Role enforcement (staff-only for /admin; portal links for /portal)
 * happens in getAdminSession / portal resolvers — opaque session tokens
 * cannot encode role in middleware without a DB round-trip.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  if (isCounselorHost(host)) {
    if (pathname === "/" || pathname === "") {
      const target = request.nextUrl.clone();
      target.pathname = COUNSELOR_OS_ENTRY_PATH;
      return NextResponse.redirect(target);
    }
    if (
      pathname.startsWith("/portal") &&
      !pathname.startsWith("/portal/login") &&
      !pathname.startsWith("/portal/logout")
    ) {
      const target = request.nextUrl.clone();
      target.pathname = COUNSELOR_OS_ENTRY_PATH;
      return NextResponse.redirect(target);
    }
  }

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

  if (pathname.startsWith("/ms")) {
    const portalToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    if (!portalToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/portal/login";
      loginUrl.search = "";
      loginUrl.searchParams.set(
        "next",
        "/portal/student/services/guidance",
      );
      return NextResponse.redirect(loginUrl);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
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

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin", "/admin/:path*", "/portal", "/portal/:path*", "/ms", "/ms/:path*"],
};
