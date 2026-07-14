/**
 * Canonical public form URLs for QR codes, sharing, and SEO.
 * Always use production host — never localhost.
 */

export const PUBLIC_SITE_ORIGIN = "https://setareganplus.ir" as const;

export function getPublicFormPath(slug: string): string {
  return `/forms/${slug}`;
}

export function getPublicFormUrl(slug: string): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicFormPath(slug)}`;
}

export function getPublicFormCanonical(slug: string): string {
  return getPublicFormUrl(slug);
}
