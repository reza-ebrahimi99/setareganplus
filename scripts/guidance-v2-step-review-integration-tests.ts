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

  console.log("guidance v2 step review integration tests passed");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
