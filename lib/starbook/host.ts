/**
 * StarBook subdomain host detection.
 * Public marketplace hostname: shop.setareganplus.ir
 * Booklet shop stays on setareganplus.ir/shop
 *
 * Used by proxy.ts (Next.js 16 Host-based routing).
 */

export const STARBOOK_PUBLIC_HOST = "shop.setareganplus.ir";

const DEFAULT_STARBOOK_HOST = STARBOOK_PUBLIC_HOST;

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

export function isStarBookHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  const configured = process.env.STARBOOK_HOST?.toLowerCase().trim();
  if (configured) {
    return normalized === configured;
  }
  return (
    normalized === DEFAULT_STARBOOK_HOST ||
    normalized === "shop.localhost" ||
    normalized.startsWith("shop.127.0.0.1")
  );
}

export function getStarBookPublicOrigin(): string {
  const fromEnv = process.env.STARBOOK_PUBLIC_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = process.env.STARBOOK_HOST?.trim() || DEFAULT_STARBOOK_HOST;
  return `https://${host}`;
}

/** Internal App Router prefix for StarBook pages. */
export const STARBOOK_APP_PREFIX = "/starbook";
