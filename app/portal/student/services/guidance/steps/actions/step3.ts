"use server";

/**
 * Guidance Journey Engine — Step 3 (Registration & Payment) server action.
 */

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { startGuidancePackageCheckout } from "@/lib/guidance/journey/payment";

export type StartGuidanceCheckoutState =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

export async function startGuidanceCheckoutAction(
  packageCode: string,
): Promise<StartGuidanceCheckoutState> {
  const { plan } = await requireGuidanceJourneyStepAccess(3);

  const result = await startGuidancePackageCheckout({
    organizationId: plan.organizationId,
    planId: plan.id,
    planPublicId: plan.publicId,
    packageCode,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, checkoutUrl: result.checkoutUrl };
}
