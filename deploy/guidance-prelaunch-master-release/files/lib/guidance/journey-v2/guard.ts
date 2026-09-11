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
import {
  canOpenGuidanceV2HistoricalStep,
  type StepAccessSnapshot,
} from "@/lib/guidance/journey-v2/step-access-policy";

function asAccessSnapshot(
  plan: Pick<
    GuidanceV2PlanSnapshot,
    | "currentStep"
    | "completedSteps"
    | "packagePaidAtIso"
    | "guidancePackageCode"
    | "finalApprovedAtIso"
    | "v2InformedRevisionId"
    | "v2SanjeshStatus"
  >,
): StepAccessSnapshot {
  return {
    currentStep: plan.currentStep,
    completedSteps: plan.completedSteps,
    packageCode: plan.guidancePackageCode,
    packagePaidAtIso: plan.packagePaidAtIso,
    finalApprovedAtIso: plan.finalApprovedAtIso,
    informedRevisionId: plan.v2InformedRevisionId,
    sanjeshStatus: plan.v2SanjeshStatus,
  };
}

/**
 * URL open policy. Completed student-owned steps may be reopened.
 * Counselor-owned and legally locked states stay protected.
 * Unpaid / free-plan upgrade may always open Step 10.
 */
export function canOpenGuidanceV2Step(
  stepId: GuidanceV2StepId,
  plan: Pick<
    GuidanceV2PlanSnapshot,
    | "currentStep"
    | "completedSteps"
    | "packagePaidAtIso"
    | "guidancePackageCode"
    | "finalApprovedAtIso"
    | "v2InformedRevisionId"
    | "v2SanjeshStatus"
  >,
): boolean {
  if (stepId === plan.currentStep) return true;
  if (stepId === 10 && !assertPackagePaid(plan)) return true;
  return canOpenGuidanceV2HistoricalStep(stepId, asAccessSnapshot(plan));
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
