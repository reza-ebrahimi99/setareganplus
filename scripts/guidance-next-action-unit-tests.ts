/**
 * Next-action + work-queue priority unit tests (no DB).
 */

import assert from "node:assert/strict";
import { computeNextActionCard } from "../lib/guidance/journey-v2/next-action";
import { buildLateJourneySignals } from "../lib/guidance/journey-v2/signals";
import type { GuidanceV2PlanSnapshot } from "../lib/guidance/journey-v2/plan";
import {
  bucketForWorkItem,
  scoreWorkQueuePriority,
} from "../lib/counselor-os/work-queue-priority";
import { assertSessionHeldForStepAdvance } from "../lib/guidance/journey-v2/booking-gate";

function plan(partial: Partial<GuidanceV2PlanSnapshot>): GuidanceV2PlanSnapshot {
  return {
    id: "p1",
    publicId: "pub",
    organizationId: "org",
    userId: "u1",
    studentId: "s1",
    examGroup: "MATHEMATICS",
    status: "ACTIVE",
    currentStep: 11,
    completedSteps: [10],
    completionPercentage: 55,
    quota: null,
    guidancePackageCode: "SMART",
    guidancePackageAddons: [],
    packagePaidAtIso: new Date().toISOString(),
    choicesApprovedAtIso: null,
    finalApprovedAtIso: null,
    v2InformedAckVersion: null,
    v2InformedRevisionId: null,
    v2SanjeshStatus: null,
    v2SanjeshDeclaredAtIso: null,
    v2SanjeshReference: null,
    v2SanjeshNote: null,
    v2SanjeshVerifiedAtIso: null,
    v2OpenRevisionSteps: [],
    v2StepNeedsReviewFlags: {},
    v2HollandRetakePending: false,
    journeyVersion: 2,
    ...partial,
  };
}

const links = {
  audience: "counselor" as const,
  studentId: "s1",
  counselorCaseHref: "/admin/counselor/students/s1",
  choicesHref: "/admin/counselor/students/s1/choices",
};

assert.equal(
  scoreWorkQueuePriority({
    currentStep: 13,
    completionPercentage: 50,
    packagePaid: true,
    v2SanjeshStatus: null,
    needsReview: false,
    staleDays: 0,
    sessionToday: false,
    sessionOverdue: false,
    waitingCounselorStep: true,
  }) <
    scoreWorkQueuePriority({
      currentStep: 14,
      completionPercentage: 50,
      packagePaid: true,
      v2SanjeshStatus: null,
      needsReview: false,
      staleDays: 0,
      sessionToday: false,
      sessionOverdue: false,
      waitingCounselorStep: false,
    }),
  true,
  "step 13 counselor work ranks higher than waiting student step 14",
);

assert.equal(
  bucketForWorkItem({
    currentStep: 18,
    completionPercentage: 90,
    packagePaid: true,
    v2SanjeshStatus: "PENDING_REVIEW",
    needsReview: false,
    staleDays: 1,
    sessionToday: false,
    sessionOverdue: false,
    waitingCounselorStep: true,
  }),
  "ready_sanjesh",
);

const signals = buildLateJourneySignals({
  plan: plan({ currentStep: 11 }),
  firstSessionBooked: false,
  firstSessionCompleted: false,
  secondSessionBooked: false,
  secondSessionCompleted: false,
  konkurSubmitted: false,
  konkurCounselorApproved: false,
  initialListStatus: null,
  initialItemCount: 0,
  reviewSubmitted: false,
  finalListStatus: null,
  needsCounselorReview: false,
});

const card = computeNextActionCard({
  plan: plan({ currentStep: 11 }),
  signals,
  links,
});

assert.match(card.actionLabel, /جلسه/);
assert.equal(card.owner, "student");
assert.equal(card.href, "/admin/counselor/students/s1");
assert.equal(card.progress11to18.length, 8);

const snap = {
  appointmentId: "a1",
  purpose: "FIRST_SESSION",
  appointmentStatus: "COMPLETED",
  guidancePlanId: "plan1",
  counselorUserId: "c1",
  reservationId: "r1",
  reservationStatus: "CONFIRMED",
  slotStartsAt: new Date(Date.now() - 3600_000),
  slotAdvisorId: "adv1",
};

assert.equal(
  assertSessionHeldForStepAdvance({
    snapshot: snap,
    expectedPurpose: "FIRST_SESSION",
    expectedPlanId: "plan1",
    expectedCounselorUserId: "c1",
    appointmentCompleted: true,
    sessionRecordCompleted: true,
    sessionSummary: "خلاصه جلسه اول ثبت شد",
  }).ok,
  true,
);

assert.equal(
  assertSessionHeldForStepAdvance({
    snapshot: snap,
    expectedPurpose: "FIRST_SESSION",
    expectedPlanId: "plan1",
    expectedCounselorUserId: "c1",
    appointmentCompleted: false,
    sessionRecordCompleted: false,
    sessionSummary: "",
  }).ok,
  false,
);

console.log("guidance next-action unit tests passed");
