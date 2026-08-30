"use server";

/**
 * Guidance Journey Engine — Step 4 (First Counseling Session) server action.
 */

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { reserveGuidanceCounselingSlot } from "@/lib/guidance/journey/booking";

export type ReserveGuidanceSlotState =
  | { ok: true; trackingCode: string }
  | { ok: false; error: string };

export async function reserveGuidanceFirstSessionAction(
  slotId: string,
): Promise<ReserveGuidanceSlotState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(4);

  return reserveGuidanceCounselingSlot({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    sessionNumber: 1,
    slotId,
    firstName: context.user.firstName,
    lastName: context.user.lastName,
    mobile: context.user.mobile ?? "",
  });
}
