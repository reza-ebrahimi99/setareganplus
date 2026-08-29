/**
 * Guidance ERP — public-route gate for Phase 0.
 * Mirrors SXP hub require: flag off ⇒ notFound (no public exposure).
 */

import { notFound } from "next/navigation";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";

/**
 * Resolves the public organization and ensures the root `guidance` flag is on.
 * Performs only the org + flag lookups required for gating — no GuidancePlan reads.
 */
export async function assertGuidancePublicEnabledOrNotFound(): Promise<{
  organizationId: string;
}> {
  const organization = await getPublicOrganizationBySlug();
  const enabled = await isGuidanceEnabled(organization.id);
  if (!enabled) {
    notFound();
  }
  return { organizationId: organization.id };
}
