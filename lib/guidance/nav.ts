/**
 * Guidance ERP — public nav filtering by root feature flag.
 * Hides the Guidance entry when the module is off (no link to 404).
 */

import {
  publicNavItems,
  type PublicNavItem,
} from "@/content/public-nav";

export function filterPublicNavForGuidance(
  items: readonly PublicNavItem[],
  guidanceEnabled: boolean,
): PublicNavItem[] {
  if (guidanceEnabled) {
    return [...items];
  }
  return items.filter((item) => item.href !== "/guidance");
}

export function getDefaultPublicNavItems(
  guidanceEnabled: boolean,
): PublicNavItem[] {
  return filterPublicNavForGuidance(publicNavItems, guidanceEnabled);
}
