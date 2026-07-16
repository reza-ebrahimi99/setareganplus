/**
 * Fixed site placement registry (StarOS v0.5.2B).
 * Not a generic page builder — only documented placement keys.
 */

export const SITE_PLACEMENT_KEYS = [
  "PRE_REGISTRATION_FORM",
  "CONSULTATION_FORM",
  "CONSULTATION_BOOKING",
] as const;

export type SitePlacementKeyValue = (typeof SITE_PLACEMENT_KEYS)[number];

export const SITE_CONTENT_TYPES = ["FORM", "BOOKING", "NONE"] as const;
export type SiteContentTypeValue = (typeof SITE_CONTENT_TYPES)[number];

export const SITE_DISPLAY_MODES = [
  "FULL",
  "EMBEDDED",
  "COMPACT",
  "CARD",
] as const;
export type SiteDisplayModeValue = (typeof SITE_DISPLAY_MODES)[number];

export type SitePlacementRegistryEntry = {
  key: SitePlacementKeyValue;
  label: string;
  targetPath: string;
  targetPageLabel: string;
  allowedContentTypes: ReadonlyArray<"FORM" | "BOOKING">;
  defaultDisplayMode: SiteDisplayModeValue;
  supportsShowPoster: boolean;
  supportsCtaLabel: boolean;
};

export const SITE_PLACEMENT_REGISTRY: Record<
  SitePlacementKeyValue,
  SitePlacementRegistryEntry
> = {
  PRE_REGISTRATION_FORM: {
    key: "PRE_REGISTRATION_FORM",
    label: "فرم صفحه پیش‌ثبت‌نام",
    targetPath: "/pre-registration",
    targetPageLabel: "پیش‌ثبت‌نام",
    allowedContentTypes: ["FORM"],
    defaultDisplayMode: "EMBEDDED",
    supportsShowPoster: true,
    supportsCtaLabel: false,
  },
  CONSULTATION_FORM: {
    key: "CONSULTATION_FORM",
    label: "فرم صفحه مشاوره",
    targetPath: "/consultation",
    targetPageLabel: "مشاوره",
    allowedContentTypes: ["FORM"],
    defaultDisplayMode: "EMBEDDED",
    supportsShowPoster: true,
    supportsCtaLabel: false,
  },
  CONSULTATION_BOOKING: {
    key: "CONSULTATION_BOOKING",
    label: "رزرو صفحه مشاوره",
    targetPath: "/consultation",
    targetPageLabel: "مشاوره",
    allowedContentTypes: ["BOOKING"],
    defaultDisplayMode: "CARD",
    supportsShowPoster: false,
    supportsCtaLabel: true,
  },
};

export const SITE_PLACEMENT_LIST = SITE_PLACEMENT_KEYS.map(
  (key) => SITE_PLACEMENT_REGISTRY[key],
);

export function isSitePlacementKey(
  value: string,
): value is SitePlacementKeyValue {
  return (SITE_PLACEMENT_KEYS as readonly string[]).includes(value);
}

export function isSiteDisplayMode(
  value: string,
): value is SiteDisplayModeValue {
  return (SITE_DISPLAY_MODES as readonly string[]).includes(value);
}

export function displayModesForContent(
  contentType: "FORM" | "BOOKING",
): SiteDisplayModeValue[] {
  if (contentType === "FORM") {
    return ["FULL", "EMBEDDED", "COMPACT"];
  }
  return ["FULL", "CARD", "COMPACT"];
}

export function getSiteDisplayModeLabel(mode: SiteDisplayModeValue): string {
  switch (mode) {
    case "FULL":
      return "کامل";
    case "EMBEDDED":
      return "جاسازی‌شده";
    case "COMPACT":
      return "فشرده";
    case "CARD":
      return "کارت";
    default:
      return mode;
  }
}

export const PLACEMENT_TEXT_LIMITS = {
  heading: 120,
  description: 500,
  ctaLabel: 80,
} as const;

/**
 * Resolution rules (documented):
 * 1. Active (non-deleted) DB placement with isEnabled=true → use DB
 * 2. Active DB placement with isEnabled=false → suppress env (explicit disable)
 * 3. No DB row (or soft-deleted) → env slug fallback
 * 4. Otherwise → none
 */
export type PlacementSource = "database" | "env" | "none" | "disabled";
