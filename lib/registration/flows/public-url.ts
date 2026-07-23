/**
 * Canonical public registration flow URLs for QR, sharing, and SEO.
 * Always use production host — never localhost.
 */

export const PUBLIC_SITE_ORIGIN = "https://setareganplus.ir" as const;

export function getPublicRegistrationFlowPath(slug: string): string {
  return `/register/${slug}`;
}

export function getPublicRegistrationFlowUrl(slug: string): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicRegistrationFlowPath(slug)}`;
}

export function getPublicRegistrationWizardPath(slug: string): string {
  return `/register/${slug}/wizard`;
}
