/**
 * StarOS Student Portal OS — theme + accent contracts.
 * Only Classic is active in product UI today.
 * Other themes are architecture stubs (CSS exists; no switcher).
 */

export const PORTAL_THEME_IDS = [
  "classic",
  "dark",
  "student",
  "guidance",
  "competition",
  "night",
] as const;

export type PortalThemeId = (typeof PORTAL_THEME_IDS)[number];

/** Product-active theme until a theme switcher ships. */
export const PORTAL_ACTIVE_THEME: PortalThemeId = "classic";

export const PORTAL_ACCENT_IDS = [
  "purple",
  "blue",
  "emerald",
  "orange",
  "pink",
  "teal",
  "gold",
] as const;

export type PortalAccentId = (typeof PORTAL_ACCENT_IDS)[number];
