/**
 * V2 step lock — never trusts the URL. journeyVersion must be 2.
 */

import { notFound, redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  guidanceJourneyV2StepPath,
  isGuidanceV2StepId,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import {
  assertPackagePaid,
  loadGuidanceV2Plan,
  type GuidanceV2PlanSnapshot,
} from "@/lib/guidance/journey-v2/plan";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import type { PortalContext } from "@/lib/portal/auth/types";

/**
 * URL open policy. Does not change Steps 1–10 while currentStep is still 1–10.
 * Late-journey exceptions are navigation-only: unpaid return to Step 10, and
 * look-back to an already completed earlier step. Forward / incomplete jumps stay blocked.
 */
export function canOpenGuidanceV2Step(
  stepId: GuidanceV2StepId,
  plan: Pick<
    GuidanceV2PlanSnapshot,
    "currentStep" | "completedSteps" | "packagePaidAtIso"
  >,
): boolean {
  if (stepId === plan.currentStep) return true;

  if (plan.currentStep < 11) return false;

  if (stepId === 10 && !assertPackagePaid(plan)) return true;

  return stepId < plan.currentStep && plan.completedSteps.includes(stepId);
}

export type GuidanceV2StepAccess = {
  context: PortalContext;
  plan: GuidanceV2PlanSnapshot;
};

export async function requireGuidanceV2StepAccess(
  stepId: GuidanceV2StepId,
): Promise<GuidanceV2StepAccess> {
  const context = await requireStudentPortalAccess();

  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceV2Plan({
    organizationId: context.organization.id,
    studentId,
  });

  if (!plan) redirect(GUIDANCE_CANONICAL_HOME);

  if (plan.journeyVersion !== 2) {
    redirect(GUIDANCE_CANONICAL_HOME);
  }

  if (plan.userId !== context.user.id) {
    notFound();
  }

  if (!canOpenGuidanceV2Step(stepId, plan)) {
    redirect(guidanceJourneyV2StepPath(plan.currentStep));
  }

  return { context, plan };
}

export async function loadGuidanceV2Entry(): Promise<GuidanceV2StepAccess> {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceV2Plan({
    organizationId: context.organization.id,
    studentId,
  });
  if (!plan) redirect(GUIDANCE_CANONICAL_HOME);
  if (plan.journeyVersion !== 2) redirect(GUIDANCE_CANONICAL_HOME);
  if (plan.userId !== context.user.id) notFound();

  return { context, plan };
}

/** Production Steps 1–10 name. Accepts a numeric step id from live callers. */
export async function requireGuidanceJourneyV2StepAccess(
  stepId: number,
): Promise<GuidanceV2StepAccess> {
  if (!isGuidanceV2StepId(stepId)) notFound();
  return requireGuidanceV2StepAccess(stepId);
}

export type GuidanceJourneyV2StepAccess = GuidanceV2StepAccess;
