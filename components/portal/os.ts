/**
 * Portal OS presentation primitives.
 * Student Portal only — Parent keeps legacy PortalShell.
 */

export { PortalSurface } from "@/components/portal/PortalSurface";
export { PortalWidget } from "@/components/portal/PortalWidget";
export type {
  PortalWidgetModule,
  PortalWidgetProps,
} from "@/components/portal/PortalWidget";
export { PortalTheme } from "@/components/portal/theme/PortalTheme";
export { PortalThemeProvider, usePortalTheme } from "@/components/portal/theme/PortalThemeProvider";
export { PortalIcon } from "@/components/portal/icons";
export type { PortalIconName } from "@/components/portal/icons";
export { StudentPortalShell } from "@/components/portal/StudentPortalShell";
export {
  PORTAL_ACCENT_IDS,
  PORTAL_ACTIVE_THEME,
  PORTAL_ENABLED_THEMES,
  PORTAL_THEME_IDS,
  PORTAL_THEME_STORAGE_KEY,
  type PortalAccentId,
  type PortalThemeId,
} from "@/components/portal/theme/types";
export {
  buildStudentPortalNavSections,
  type PortalOsNavItem,
  type PortalOsNavSection,
} from "@/components/portal/nav/types";
export { PortalJourneyScreen } from "@/components/portal/journey/PortalJourneyScreen";
export type {
  PortalJourneyModel,
  PortalJourneyStep,
  PortalJourneyState,
} from "@/components/portal/journey/types";
