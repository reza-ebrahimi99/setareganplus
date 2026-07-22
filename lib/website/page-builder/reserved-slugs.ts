/**
 * Reserved WebsitePage slugs — product policy + future root promotion safety.
 *
 * Rejected on create/rename: system prefixes + existing hard-coded public routes
 * (avoids /p/about vs /about confusion).
 *
 * Planned segments without hard-coded routes (admissions, news, summer-club)
 * are intentionally allowed so CMS pages can exist under the transition mount
 * and later promote to root via getPublicPagePath.
 */

export const WEBSITE_PAGE_SLUG_MIN = 2;
export const WEBSITE_PAGE_SLUG_MAX = 80;

/** System / app prefixes that must never be CMS page slugs. */
const SYSTEM_RESERVED_SLUGS = [
  "admin",
  "portal",
  "staff",
  "api",
  "p",
  "_next",
  "media",
  "forms",
  "book",
  "login",
  "logout",
] as const;

/**
 * Existing hard-coded public first segments.
 * WebsitePage must not claim these slugs while specialized routes own them.
 */
const HARD_CODED_PUBLIC_SLUGS = [
  "about",
  "contact",
  "faq",
  "courses",
  "classes",
  "exams",
  "consultation",
  "pre-registration",
  "gallery",
  "team",
  "achievements",
  "assessments",
  "students",
  "ghalamchi",
] as const;

/**
 * Planned root segments (no hard-coded page today).
 * Allowed as WebsitePage slugs under the transition mount.
 */
export const PROMOTABLE_PAGE_SLUGS = [
  "admissions",
  "news",
  "summer-club",
  "blog",
  "home",
  "index",
] as const;

const RESERVED_SLUG_SET = new Set<string>([
  ...SYSTEM_RESERVED_SLUGS,
  ...HARD_CODED_PUBLIC_SLUGS,
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isReservedWebsitePageSlug(slug: string): boolean {
  return RESERVED_SLUG_SET.has(slug.trim().toLowerCase());
}

export type WebsitePageSlugParseResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Normalize + validate a WebsitePage slug.
 * Does not check DB uniqueness.
 */
export function parseWebsitePageSlug(
  raw: string | null | undefined,
): WebsitePageSlugParseResult {
  const slug = (raw ?? "").trim().toLowerCase();

  if (!slug) {
    return { ok: false, error: "نامک (slug) الزامی است." };
  }

  if (slug.length < WEBSITE_PAGE_SLUG_MIN || slug.length > WEBSITE_PAGE_SLUG_MAX) {
    return {
      ok: false,
      error: `نامک باید بین ${WEBSITE_PAGE_SLUG_MIN} تا ${WEBSITE_PAGE_SLUG_MAX} نویسه باشد.`,
    };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error:
        "نامک فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد (مثل summer-club).",
    };
  }

  if (isReservedWebsitePageSlug(slug)) {
    return {
      ok: false,
      error: "این نامک رزرو شده است و قابل استفاده نیست.",
    };
  }

  return { ok: true, slug };
}
