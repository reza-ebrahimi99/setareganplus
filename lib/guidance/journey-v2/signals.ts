/**
 * Build LateJourneySignals from plan + operational facts (no extra I/O).
 */

import type { GuidanceV2PlanSnapshot } from "@/lib/guidance/journey-v2/plan";
import { packageIncludesArrangement } from "@/lib/guidance/journey-v2/entitlements";
import {
  CHOICE_LIST_STATUS,
  SANJESH_STATUS,
} from "@/lib/guidance/journey-v2/constants";
import type { LateJourneySignals } from "@/lib/guidance/journey-v2/late-status";

export type LateJourneyFacts = {
  plan: GuidanceV2PlanSnapshot;
  firstSessionBooked: boolean;
  firstSessionCompleted: boolean;
  secondSessionBooked: boolean;
  secondSessionCompleted: boolean;
  konkurSubmitted: boolean;
  konkurCounselorApproved: boolean;
  initialListStatus: string | null;
  initialItemCount: number;
  reviewSubmitted: boolean;
  finalListStatus: string | null;
  needsCounselorReview: boolean;
};

export function buildLateJourneySignals(facts: LateJourneyFacts): LateJourneySignals {
  const { plan } = facts;
  const initialReady =
    facts.initialListStatus === CHOICE_LIST_STATUS.READY ||
    facts.initialListStatus === CHOICE_LIST_STATUS.CONFIRMED;
  const finalReady =
    facts.finalListStatus === CHOICE_LIST_STATUS.READY ||
    facts.finalListStatus === CHOICE_LIST_STATUS.CONFIRMED;

  const sanjeshStatus = plan.v2SanjeshStatus ?? SANJESH_STATUS.NOT_SUBMITTED;
  const sanjeshDeclared =
    sanjeshStatus === SANJESH_STATUS.DECLARED ||
    sanjeshStatus === SANJESH_STATUS.PENDING_REVIEW ||
    sanjeshStatus === SANJESH_STATUS.VERIFIED;
  const sanjeshVerified = sanjeshStatus === SANJESH_STATUS.VERIFIED;

  return {
    currentStep: plan.currentStep,
    packagePaid: Boolean(plan.packagePaidAtIso),
    hasArrangementEntitlement: packageIncludesArrangement(plan.guidancePackageCode),
    firstSessionBooked: facts.firstSessionBooked,
    secondSessionBooked: facts.secondSessionBooked,
    konkurSubmitted: facts.konkurSubmitted && facts.konkurCounselorApproved,
    initialReady,
    reviewComplete: facts.reviewSubmitted,
    finalReady,
    informedConfirmed: Boolean(plan.finalApprovedAtIso),
    sanjeshDeclared,
    sanjeshVerified,
    needsCounselorReview: facts.needsCounselorReview,
  };
}

export function lastCompletedStep(
  plan: GuidanceV2PlanSnapshot,
): number | null {
  const steps = plan.completedSteps;
  if (!steps.length) return null;
  return steps[steps.length - 1] ?? null;
}
