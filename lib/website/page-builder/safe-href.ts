/**
 * Safe href validation for Page Builder CTAs and links.
 * Rejects javascript:, data:, vbscript: and other unsafe schemes.
 */

import { SECTION_HREF_MAX } from "./constants";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function isSafeHref(raw: string): boolean {
  const href = raw.trim();
  if (!href || href.length > SECTION_HREF_MAX) return false;

  const lower = href.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  if (
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("?")
  ) {
    return true;
  }

  try {
    const url = new URL(href);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function normalizeSafeHref(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const href = raw.trim().slice(0, SECTION_HREF_MAX);
  if (!href) return null;
  return isSafeHref(href) ? href : null;
}
