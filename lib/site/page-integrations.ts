/**
 * Transitional env slug fallbacks for site placements.
 * Database SitePlacement takes priority when present.
 */

import type { SitePlacementKeyValue } from "@/lib/site/placement-registry";

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

/** @deprecated Prefer loadResolvedSitePlacement — kept for transitional env fallback. */
export function getPreRegistrationFormSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_PRE_REGISTRATION_FORM_SLUG",
    "PRE_REGISTRATION_FORM_SLUG",
  );
}

/** @deprecated Prefer loadResolvedSitePlacement */
export function getConsultationFormSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_CONSULTATION_FORM_SLUG",
    "CONSULTATION_FORM_SLUG",
  );
}

/** @deprecated Prefer loadResolvedSitePlacement */
export function getConsultationBookingServiceSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_CONSULTATION_BOOKING_SERVICE_SLUG",
    "CONSULTATION_BOOKING_SERVICE_SLUG",
  );
}

export function getEnvFallbackSlug(
  placementKey: SitePlacementKeyValue,
): string | null {
  switch (placementKey) {
    case "PRE_REGISTRATION_FORM":
      return getPreRegistrationFormSlug();
    case "CONSULTATION_FORM":
      return getConsultationFormSlug();
    case "CONSULTATION_BOOKING":
      return getConsultationBookingServiceSlug();
    default:
      return null;
  }
}
