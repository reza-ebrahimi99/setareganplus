/**
 * StarOS Student Portal OS — theme + accent + persistence contracts.
 * Only Classic is enabled in product UI today.
 * Other themes are architecture stubs (CSS + storage-ready).
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

/** Themes the product may apply today. Persistence may store others for later. */
export const PORTAL_ENABLED_THEMES = ["classic"] as const satisfies readonly PortalThemeId[];

export type PortalEnabledThemeId = (typeof PORTAL_ENABLED_THEMES)[number];

/** Default applied theme. */
export const PORTAL_ACTIVE_THEME: PortalThemeId = "classic";

/** localStorage key for portal theme preference. */
export const PORTAL_THEME_STORAGE_KEY = "staros.portal.theme";

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

export function isPortalThemeId(value: string): value is PortalThemeId {
  return (PORTAL_THEME_IDS as readonly string[]).includes(value);
}

export function isPortalThemeEnabled(theme: PortalThemeId): boolean {
  return (PORTAL_ENABLED_THEMES as readonly PortalThemeId[]).includes(theme);
}

/**
 * Resolve which theme to *apply*.
 * Persisted disabled themes stay in storage but render as Classic until enabled.
 */
export function resolveAppliedPortalTheme(
  preferred: PortalThemeId | null | undefined,
): PortalThemeId {
  if (preferred && isPortalThemeEnabled(preferred)) {
    return preferred;
  }
  return PORTAL_ACTIVE_THEME;
}
