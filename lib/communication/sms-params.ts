/**
 * Shared SMS.ir parameter helpers (max 25 chars for pattern variables).
 */

export function truncateSmsParam(value: string, maxLength = 25): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
}

/** Display mask for normalized Iranian mobile, e.g. 09123456789 → 09****6789. */
export function maskMobileForDisplay(normalizedMobile: string): string {
  const mobile = normalizedMobile.trim();
  if (mobile.length < 6) return mobile;
  return `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
}
