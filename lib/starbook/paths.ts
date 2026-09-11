/**
 * StarBook public path helper.
 * Public URLs on shop.setareganplus.ir never use /shop and never expose /starbook.
 * Proxy rewrites these pretty paths to the internal /starbook App Router tree.
 */

import { STARBOOK_APP_PREFIX } from "@/lib/starbook/host";

const RESERVED = new Set([
  "browse",
  "cart",
  "wishlist",
  "track",
  "confirmed",
  "collections",
  "bundles",
  "campaigns",
  "grade",
  "subject",
  "exam",
  "major",
  "account",
  "book",
]);

/**
 * Build a public StarBook href (pretty path).
 * Pass "" or "/" for home. Query strings allowed: "/browse?sort=featured".
 * Product pages: "/book/{slug}".
 */
export function starBookHref(path = "/"): string {
  const raw = path.trim() || "/";
  const [pathnamePart, query = ""] = raw.split("?");
  let pathname = pathnamePart || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  // Strip accidental internal prefix
  if (pathname === STARBOOK_APP_PREFIX) {
    pathname = "/";
  } else if (pathname.startsWith(`${STARBOOK_APP_PREFIX}/`)) {
    pathname = pathname.slice(STARBOOK_APP_PREFIX.length) || "/";
  }

  // Legacy product paths (/math-101) → /book/math-101
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && !RESERVED.has(parts[0]!)) {
    pathname = `/book/${parts[0]}`;
  }

  return query ? `${pathname}?${query}` : pathname;
}

/** Map a public pretty path to the internal App Router path. */
export function starBookInternalPath(publicPathname: string): string {
  const pathname = publicPathname.split("?")[0] || "/";
  if (pathname === "/" || pathname === "") return STARBOOK_APP_PREFIX;
  if (
    pathname === STARBOOK_APP_PREFIX ||
    pathname.startsWith(`${STARBOOK_APP_PREFIX}/`)
  ) {
    return pathname;
  }
  return `${STARBOOK_APP_PREFIX}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function isStarBookAppPath(pathname: string): boolean {
  return (
    pathname === STARBOOK_APP_PREFIX ||
    pathname.startsWith(`${STARBOOK_APP_PREFIX}/`)
  );
}

export function isStarBookPrettySegment(segment: string): boolean {
  return RESERVED.has(segment);
}
