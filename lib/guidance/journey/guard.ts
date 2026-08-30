/**
 * Guidance Journey Engine — server-side step-lock enforcement (Phase 1).
 *
 * ABSOLUTE RULE: a student may only ever render the step that matches
 * plan.currentStep. This guard is the single enforcement point every step
 * page must call before rendering anything. No client state, no query
 * param, no step number is ever trusted — only the server-computed
 * `plan.currentStep` decides what is reachable.
 */

import { notFound, redirect } from "next/navigation";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import {
  guidanceJourneyStepPath,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyPlanSnapshot } from "@/lib/guidance/journey/types";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import type { PortalContext } from "@/lib/portal/auth/types";

export type GuidanceJourneyStepAccess = {
  context: PortalContext;
  plan: GuidanceJourneyPlanSnapshot;
};

/**
 * Enforces the step lock for a Journey Engine page.
 * - Redirects to login/account-select when portal auth is missing.
 * - 404s when the Guidance org flag is off.
 * - Redirects to /guidance/pre-register when no plan exists yet.
 * - Redirects to the student's true currentStep when the URL step differs.
 *
 * Every one of these is a `redirect()`/`notFound()` (throws), so callers can
 * simply `await` this and trust the returned step is the only reachable one.
 */
export async function requireGuidanceJourneyStepAccess(
  stepId: GuidanceJourneyStepId,
): Promise<GuidanceJourneyStepAccess> {
  const context = await requireStudentPortalAccess();

  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    notFound();
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });

  if (!plan) {
    redirect("/guidance/pre-register");
  }

  if (stepId !== plan.currentStep) {
    redirect(guidanceJourneyStepPath(plan.currentStep));
  }

  return { context, plan };
}

/** Same guard, but never redirects on mismatch — used by the /steps index route. */
export async function loadGuidanceJourneyEntry(): Promise<GuidanceJourneyStepAccess> {
  const context = await requireStudentPortalAccess();

  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    notFound();
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });

  if (!plan) {
    redirect("/guidance/pre-register");
  }

  return { context, plan };
}
