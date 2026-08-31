/**
 * Soft portal state for Discovery conversion CTAs.
 * Reuses existing portal session resolver — no new auth.
 */

import { isAssessmentComplete } from "@/lib/guidance/journey/assessment/scoring";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { resolvePortalContext } from "@/lib/portal/auth/resolve-portal-context";

export type DiscoveryVisitor = {
  signedIn: boolean;
  interestDone: boolean;
};

export async function loadDiscoveryVisitor(): Promise<DiscoveryVisitor> {
  const context = await resolvePortalContext();
  if (!context) {
    return { signedIn: false, interestDone: false };
  }
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { signedIn: true, interestDone: false };
  }
  try {
    const plan = await loadGuidanceJourneyPlan({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    });
    if (!plan) return { signedIn: true, interestDone: false };
    const session = await loadGuidanceStep2Session({
      organizationId: context.organization.id,
      planPublicId: plan.publicId,
    });
    return {
      signedIn: true,
      interestDone: Boolean(
        session.result && isAssessmentComplete(session.answers),
      ),
    };
  } catch {
    return { signedIn: true, interestDone: false };
  }
}
