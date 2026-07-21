/**
 * Page Builder Phase 1 — shared constants (safe for client imports).
 */

export const EXPERIMENTAL_PAGE_SLUG = "builder-demo" as const;
export const EXPERIMENTAL_PUBLIC_PATH = "/p/builder-demo" as const;
export const EXPERIMENTAL_PAGE_DEFAULT_TITLE = "صفحه آزمایشی صفحه‌ساز" as const;

export const PAGE_BUILDER_SECTION_TYPES = [
  "HERO",
  "IMAGE",
  "RICH_TEXT",
  "CTA",
  "SPACER",
] as const;

export type PageBuilderSectionType =
  (typeof PAGE_BUILDER_SECTION_TYPES)[number];

export function isPageBuilderSectionType(
  value: string,
): value is PageBuilderSectionType {
  return (PAGE_BUILDER_SECTION_TYPES as readonly string[]).includes(value);
}

export const PAGE_TITLE_MAX = 160;
export const PAGE_SEO_TITLE_MAX = 70;
export const PAGE_SEO_DESCRIPTION_MAX = 160;

export const SECTION_HEADLINE_MAX = 200;
export const SECTION_SUBHEADLINE_MAX = 400;
export const SECTION_EYEBROW_MAX = 80;
export const SECTION_BODY_MAX = 8000;
export const SECTION_CAPTION_MAX = 300;
export const SECTION_ALT_MAX = 300;
export const SECTION_BUTTON_LABEL_MAX = 80;
export const SECTION_HREF_MAX = 500;
export const SECTION_TITLE_MAX = 200;
export const SECTION_DESCRIPTION_MAX = 500;

export const PAGE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const SECTION_STATUSES = ["DRAFT", "PUBLISHED", "DISABLED"] as const;
export type SectionStatus = (typeof SECTION_STATUSES)[number];

export function isPageStatus(value: string): value is PageStatus {
  return (PAGE_STATUSES as readonly string[]).includes(value);
}

export function isSectionStatus(value: string): value is SectionStatus {
  return (SECTION_STATUSES as readonly string[]).includes(value);
}

export function normalizePageBuilderText(
  raw: string | null | undefined,
  max: number,
): string | null {
  if (raw == null) return null;
  const value = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return value.length > 0 ? value : null;
}

/** Preserve intentional newlines for RICH_TEXT body. */
export function normalizeMultilineText(
  raw: string | null | undefined,
  max: number,
): string | null {
  if (raw == null) return null;
  const value = raw
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
  return value.length > 0 ? value : null;
}
