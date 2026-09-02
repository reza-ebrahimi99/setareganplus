/**
 * Guidance student entry — post-login and portal hub routing.
 * Guidance-enabled students on the selection host land on the guidance dashboard.
 */

import { PortalAccountType } from "@/generated/prisma/enums";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
} from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";
import type { PortalContext } from "@/lib/portal/auth/types";

const DEFAULT_GUIDANCE_HOST = "entekhab.setareganplus.ir";

export function isGuidanceSelectionHost(host: string | null | undefined): boolean {
  const normalized = (host ?? "").toLowerCase().split(":")[0] ?? "";
  if (!normalized) return false;
  const configured = process.env.GUIDANCE_SELECTION_HOST?.toLowerCase().trim();
  if (configured) {
    return normalized === configured || normalized.endsWith(`.${configured}`);
  }
  return normalized === DEFAULT_GUIDANCE_HOST;
}

/** Primary home for a signed-in portal account (student or parent hub). */
export async function resolvePortalHubPath(
  context: PortalContext,
  options?: { host?: string | null },
): Promise<string> {
  if (context.links.length > 1) {
    return "/portal/select-account";
  }

  if (context.activeLink.accountType === PortalAccountType.STUDENT) {
    return resolveGuidanceStudentHomePath(context, options);
  }

  return "/portal/parent";
}

/** Where a guidance-enabled student should land after auth. */
export async function resolveGuidanceStudentHomePath(
  context: PortalContext,
  options?: { host?: string | null },
): Promise<string> {
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return "/portal/student";
  }

  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (!guidanceOn) {
    return "/portal/student";
  }

  const host = options?.host;
  if (host && !isGuidanceSelectionHost(host)) {
    return "/portal/student";
  }

  const needsOnboarding = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needsOnboarding) {
    return GUIDANCE_ONBOARDING_PATH;
  }

  return GUIDANCE_PLATFORM_HOME;
}
