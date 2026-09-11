/**
 * Counselor subdomain host detection.
 */

const DEFAULT_COUNSELOR_HOST = "moshaver.setareganplus.ir";

export function isCounselorHost(host: string | null | undefined): boolean {
  const normalized = (host ?? "").toLowerCase().split(":")[0] ?? "";
  if (!normalized) return false;
  const configured = process.env.COUNSELOR_OS_HOST?.toLowerCase().trim();
  if (configured) {
    return normalized === configured || normalized.endsWith(`.${configured}`);
  }
  return normalized === DEFAULT_COUNSELOR_HOST;
}

export const COUNSELOR_OS_ENTRY_PATH = "/admin/counselor";
