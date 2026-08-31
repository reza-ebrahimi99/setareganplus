/**
 * Production-safe relative paths. Never emit localhost or an absolute origin
 * for in-app redirects (logout, continue, error recovery).
 */

export function isSafeRelativePath(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.includes("\\")) return false;
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(trimmed)) return false;
  return true;
}

export function resolveRelativePath(
  value: string | null | undefined,
  fallback: string,
): string {
  return isSafeRelativePath(value) ? value.trim() : fallback;
}

export const OFFICE_LOGOUT_NEXT = "/guidance";
export const PORTAL_LOGOUT_NEXT = "/portal/login";
