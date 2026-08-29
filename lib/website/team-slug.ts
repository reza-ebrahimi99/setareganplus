/**
 * ASCII-safe slugs for public team URLs.
 * Persian titles fall back to a generated token when no Latin characters exist.
 */

export function normalizeTeamSlug(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const latinized = trimmed
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (latinized.length >= 2) {
    return latinized;
  }

  return `member-${Date.now().toString(36)}`;
}

export function slugFromFullName(fullName: string): string {
  return normalizeTeamSlug(fullName);
}
