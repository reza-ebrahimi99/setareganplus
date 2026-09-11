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
import {
  GUIDANCE_CANONICAL_DASHBOARD,
  isGuidanceCanonicalHost,
} from "@/lib/guidance/canonical-entry";
import { PUBLIC_SITE_ORIGIN } from "@/lib/registration/flows/public-url";
import {
  getStarBookPublicOrigin,
  isStarBookHost,
  STARBOOK_APP_PREFIX,
  STARBOOK_PUBLIC_HOST,
} from "@/lib/starbook/host";

/**
 * Next.js 16 Proxy (formerly middleware).
 *
 * Hostname routing — same Next.js process for both domains:
 * - shop.setareganplus.ir  → StarBook (rewrite to /starbook…, URL unchanged)
 * - setareganplus.ir/shop  → booklet store (never rewritten to StarBook)
 */

function requestHost(request: NextRequest): string {
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return raw.toLowerCase().split(":")[0] ?? "";
}

function isStarBookRequestHost(host: string): boolean {
  // Literal production hostname for Host-based StarBook routing (grep-visible).
  if (host === "shop.setareganplus.ir") return true;
  if (host === STARBOOK_PUBLIC_HOST) return true;
  return isStarBookHost(host);
}

function isSharedInfrastructure(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/booklet") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/ms") ||
    pathname.startsWith("/media") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/** Internal rewrite that keeps the connection origin (never external redirect). */
function rewriteTo(request: NextRequest, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = request.nextUrl.search;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-starbook-rewrite", pathname);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = requestHost(request);

  // ── StarBook subdomain: shop.setareganplus.ir ───────────────────────────
  if (isStarBookRequestHost(host)) {
    if (isSharedInfrastructure(pathname)) {
      // Shared infrastructure — fall through to auth gates below when needed.
    } else if (pathname === "/shop" || pathname.startsWith("/shop/")) {
      // Never serve StarBook for /shop. Booklet lives on the apex host only.
      const dest = new URL(
        `${pathname}${request.nextUrl.search}`,
        PUBLIC_SITE_ORIGIN,
      );
      return NextResponse.redirect(dest);
    } else if (
      pathname === STARBOOK_APP_PREFIX ||
      pathname.startsWith(`${STARBOOK_APP_PREFIX}/`)
    ) {
      // Already on the internal StarBook tree — serve it.
      // Do NOT redirect to pretty URLs here: that loops with the rewrite below.
      return NextResponse.next();
    } else {
      // Catch-all: every other public path on this host is StarBook.
      // / → /starbook, /cart → /starbook/cart, /book/x → /starbook/book/x
      const internal =
        pathname === "/" || pathname === ""
          ? STARBOOK_APP_PREFIX
          : `${STARBOOK_APP_PREFIX}${pathname}`;
      return rewriteTo(request, internal);
    }
  } else if (
    pathname === STARBOOK_APP_PREFIX ||
    pathname.startsWith(`${STARBOOK_APP_PREFIX}/`)
  ) {
    // Apex must not serve StarBook; send users to shop.setareganplus.ir.
    const rest = pathname.slice(STARBOOK_APP_PREFIX.length) || "/";
    const dest = new URL(
      `${rest === "" ? "/" : rest}${request.nextUrl.search}`,
      getStarBookPublicOrigin(),
    );
    return NextResponse.redirect(dest);
  }

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

  if (isGuidanceCanonicalHost(host) && (pathname === "/" || pathname === "")) {
    const target = request.nextUrl.clone();
    target.pathname = GUIDANCE_CANONICAL_DASHBOARD;
    target.search = "";
    return NextResponse.redirect(target);
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
  matcher: [
    // Always run on root (Host → StarBook home).
    "/",
    // All other non-static paths.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
