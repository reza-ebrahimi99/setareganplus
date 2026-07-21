/** Shared limits and section keys for WebsiteMarketingCard — safe for client imports. */

export const MARKETING_CARD_SECTION_KEYS = ["HOMEPAGE_QALAMCHI"] as const;

export type MarketingCardSectionKey =
  (typeof MARKETING_CARD_SECTION_KEYS)[number];

export const HOMEPAGE_QALAMCHI_SECTION_KEY =
  "HOMEPAGE_QALAMCHI" satisfies MarketingCardSectionKey;

export const MARKETING_CARD_TITLE_MAX = 120;
export const MARKETING_CARD_DESCRIPTION_MAX = 500;
export const MARKETING_CARD_BADGE_MAX = 80;
export const MARKETING_CARD_IMAGE_ALT_MAX = 300;

export const MARKETING_CARD_DEFAULT_BADGE = "نمایندگی رسمی";

export function isMarketingCardSectionKey(
  value: string,
): value is MarketingCardSectionKey {
  return (MARKETING_CARD_SECTION_KEYS as readonly string[]).includes(value);
}

export function normalizeMarketingCardText(
  raw: string | null | undefined,
  max: number,
): string | null {
  if (raw == null) return null;
  const value = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return value.length > 0 ? value : null;
}
