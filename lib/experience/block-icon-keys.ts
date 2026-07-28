/**
 * Constrained internal icon keys for Experience block library UI.
 * Never accept arbitrary user input as an icon key on BlockDefinition.
 */

export const EXPERIENCE_BLOCK_ICON_KEYS = [
  "hero",
  "image",
  "text",
  "features",
  "pricing",
  "countdown",
  "capacity",
  "form",
  "cta",
  "spacer",
] as const;

export type ExperienceBlockIconKey =
  (typeof EXPERIENCE_BLOCK_ICON_KEYS)[number];

export function isExperienceBlockIconKey(
  value: string,
): value is ExperienceBlockIconKey {
  return (EXPERIENCE_BLOCK_ICON_KEYS as readonly string[]).includes(value);
}

/** Persian category labels used by the admin block library. */
export const EXPERIENCE_BLOCK_CATEGORIES = [
  "محتوا",
  "پویا",
  "اقدام",
  "چیدمان",
] as const;

export type ExperienceBlockCategoryFa =
  (typeof EXPERIENCE_BLOCK_CATEGORIES)[number];
