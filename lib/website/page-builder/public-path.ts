/**
 * Public path resolution for WebsitePage slugs.
 * Long-term URLs are root-level; `/p` is a transition mount only.
 * Change path policy here — not in route files, templates, or SEO helpers.
 */

/** Transition mount. Flip promoted slugs to root without refactoring callers. */
const PUBLIC_PAGE_PATH_PREFIX = "/p" as const;

/**
 * Canonical public path for a page slug (e.g. today `/p/admissions`).
 * After promotion, this may return `/admissions` for allowlisted slugs.
 */
export function getPublicPagePath(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error("Page slug is required for public path.");
  }
  return `${PUBLIC_PAGE_PATH_PREFIX}/${trimmed}`;
}

export function getPublicPagePathPrefix(): string {
  return PUBLIC_PAGE_PATH_PREFIX;
}
