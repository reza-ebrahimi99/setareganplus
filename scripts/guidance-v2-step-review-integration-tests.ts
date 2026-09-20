/**
 * DB integration — revision flow without journey rewind.
 * Run: NODE_ENV=test tsx --env-file=.env scripts/guidance-v2-step-review-integration-tests.ts
 */
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  markStepReviewed,
  requestStepRevision,
  studentResubmitStep,
} from "../lib/guidance/journey-v2/step-review/service";
import { loadCounselorReviewWorkQueue } from "../lib/counselor-os/review-work-queue";
import { requestHollandRetake } from "../lib/guidance/journey-v2/step-review/holland";
import { recordCounselorStepEdit } from "../lib/guidance/journey-v2/step-review/service";
import { GuidanceStepReviewStatus } from "../generated/prisma/enums";

async function assertReviewStatus(planId: string, orgId: string, step: number, status: GuidanceStepReviewStatus) {
  const row = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: orgId,
        planId,
        stepNumber: step,
      },
    },
    select: { status: true },
  });
  assert.equal(row?.status, status);
}


async function main() {
  const plan = await prisma.guidancePlan.findFirst({
    where: { deletedAt: null, journeyVersion: 2 },
    select: {
      id: true,
      organizationId: true,
      studentId: true,
      currentStep: true,
      completedSteps: true,
      userId: true,
    },
  });
  if (!plan) {
    console.log("skip: no v2 plan");
    return;
  }

  const counselor = await prisma.organizationMembership.findFirst({
    where: { organizationId: plan.organizationId, deletedAt: null },
    select: { userId: true },
  });
  if (!counselor) throw new Error("no counselor membership");

  const beforeCompleted = JSON.stringify(plan.completedSteps);
  const targetStep = Math.min(plan.currentStep, 3) as 1 | 2 | 3;

  const req = await requestStepRevision({
    organizationId: plan.organizationId,
    studentId: plan.studentId,
    stepNumber: targetStep,
    counselorUserId: counselor.userId,
    reason: "integration test",
    studentMessage: "لطفاً اصلاح کنید",
    notifyStudent: false,
  });
  assert.equal(req.ok, true);

  const afterReq = await prisma.guidancePlan.findUnique({
    where: { id: plan.id },
    select: { completedSteps: true, currentStep: true, v2OpenRevisionSteps: true },
  });
  assert.equal(JSON.stringify(afterReq?.completedSteps), beforeCompleted);
  assert.ok(Array.isArray(afterReq?.v2OpenRevisionSteps));

  await studentResubmitStep({
    organizationId: plan.organizationId,
    planId: plan.id,
    studentUserId: plan.userId,
    stepNumber: targetStep,
  });

  const reviewed = await markStepReviewed({
    organizationId: plan.organizationId,
    studentId: plan.studentId,
    stepNumber: targetStep,
    counselorUserId: counselor.userId,
  });
  assert.equal(reviewed.ok, true);

  const afterResubmit = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: plan.organizationId,
        planId: plan.id,
        stepNumber: targetStep,
      },
    },
    select: { status: true },
  });
  assert.equal(afterResubmit?.status, GuidanceStepReviewStatus.REVIEWED);

  const edit = await recordCounselorStepEdit({
    organizationId: plan.organizationId,
    studentId: plan.studentId,
    stepNumber: 2,
    counselorUserId: counselor.userId,
    reason: "integration counselor edit",
    beforeSnapshot: { primary: "x" },
    afterSnapshot: { primary: "y" },
    notifyStudent: false,
  });
  assert.equal(edit.ok, true);

  const holland = await requestHollandRetake({
    organizationId: plan.organizationId,
    studentId: plan.studentId,
    counselorUserId: counselor.userId,
    reason: "integration holland retake",
  });
  assert.equal(holland.ok, true);
  const attempts = await prisma.guidanceHollandAttempt.count({
    where: { organizationId: plan.organizationId, planId: plan.id },
  });
  assert.ok(attempts >= 1);

  const wq = await loadCounselorReviewWorkQueue({
    organizationId: plan.organizationId,
    userId: counselor.userId,
    displayName: "test",
    canReview: true,
    isPlatformAdmin: true,
    role: "ORG_ADMIN" as never,
    roleLabel: "admin",
    isSupervisor: true,
    viewingAsCounselor: false,
  });
  assert.ok(typeof wq.counts.resubmitted === "number");
  assert.ok(wq.labels.holland_retake);

  console.log("guidance v2 step review integration tests passed");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
