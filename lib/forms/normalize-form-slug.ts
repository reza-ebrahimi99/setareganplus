/**
 * Normalizes and validates public form slug segments.
 * Safe Latin letters, digits, and hyphen-separated words only.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type NormalizeFormSlugResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export function normalizeFormSlug(raw: string): NormalizeFormSlugResult {
  const slug = raw.trim().toLowerCase();

  if (!slug) {
    return { ok: false, error: "نامک (slug) الزامی است." };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error:
        "نامک فقط می‌تواند شامل حروف لاتین کوچک، عدد و خط تیره باشد (مثال: free-class-1405).",
    };
  }

  if (slug.length > 80) {
    return { ok: false, error: "نامک نباید بیشتر از ۸۰ کاراکتر باشد." };
  }

  return { ok: true, slug };
}
