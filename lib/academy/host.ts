/**
 * Star Academy subdomain host detection (academy.setareganplus.ir).
 * Used by proxy.ts for hostname-based routing.
 */

export const ACADEMY_PUBLIC_HOST = "academy.setareganplus.ir";

const DEFAULT_ACADEMY_HOST = ACADEMY_PUBLIC_HOST;

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

export function isAcademyHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  const configured = process.env.ACADEMY_HOST?.toLowerCase().trim();
  if (configured) {
    return normalized === configured;
  }
  return (
    normalized === DEFAULT_ACADEMY_HOST ||
    normalized === "academy.localhost" ||
    normalized.startsWith("academy.127.0.0.1")
  );
}

export function getAcademyPublicOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ACADEMY_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = process.env.ACADEMY_HOST?.trim() || DEFAULT_ACADEMY_HOST;
  return `https://${host}`;
}

/** Internal App Router prefix for Academy pages. */
export const ACADEMY_APP_PREFIX = "/academy";
