/**
 * Guidance — single canonical entry point.
 *
 * One public URL (entekhab.setareganplus.ir), one login, one dashboard,
 * one journey. Every legacy guidance entry route redirects here so the
 * destinations can never diverge again.
 *
 * Routing only. No auth, journey, or payment behaviour lives here.
 */

/** Canonical authenticated landing screen — always the dashboard, never a step. */
export const GUIDANCE_CANONICAL_DASHBOARD =
  "/portal/student/services/guidance" as const;

/** Production name for the same dashboard URL. Packed V2 late modules import this. */
export const GUIDANCE_CANONICAL_HOME = GUIDANCE_CANONICAL_DASHBOARD;

/** Journey resolver. Sends the student to their real V2 currentStep. */
export const GUIDANCE_CANONICAL_JOURNEY_ENTRY =
  "/portal/student/services/guidance/steps" as const;

/** Unauthenticated entry. Portal login returns to the dashboard, not a step. */
export const GUIDANCE_CANONICAL_LOGIN =
  `/portal/login?next=${encodeURIComponent(GUIDANCE_CANONICAL_DASHBOARD)}` as const;

/** The only public host we advertise for the guidance product. */
export const GUIDANCE_PUBLIC_HOST = "entekhab.setareganplus.ir" as const;

/** Absolute public origin, used when redirecting off the main domain. */
export const GUIDANCE_PUBLIC_ORIGIN =
  `https://${GUIDANCE_PUBLIC_HOST}` as const;

/**
 * True when the request arrived on the canonical guidance host.
 * Tolerates a port suffix and case differences; ignores other subdomains.
 */
export function isGuidanceCanonicalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const normalized = host.trim().toLowerCase().split(":")[0];
  return normalized === GUIDANCE_PUBLIC_HOST;
}
