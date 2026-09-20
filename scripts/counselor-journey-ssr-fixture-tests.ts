/**
 * SSR-safe fixture probes (no HTTP session). Ensures key loaders do not throw on real DB rows.
 * Run: NODE_ENV=test tsx --env-file=.env scripts/counselor-journey-ssr-fixture-tests.ts
 */
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { loadCounselorReviewWorkQueue } from "../lib/counselor-os/review-work-queue";
import { loadStepReviewBoard } from "../lib/guidance/journey-v2/step-review/service";
import { loadHollandAttemptsForPlan } from "../lib/guidance/journey-v2/holland-attempts";
import { loadStepRevisionHistory } from "../lib/guidance/journey-v2/step-review/revision-history";

async function main() {
  const plan = await prisma.guidancePlan.findFirst({
    where: { deletedAt: null, journeyVersion: 2 },
    select: { id: true, organizationId: true, studentId: true },
  });
  if (!plan) {
    console.log("skip: no v2 plan for fixture SSR probes");
    return;
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: plan.organizationId, deletedAt: null },
    select: { userId: true, role: true },
  });
  assert.ok(membership);

  const board = await loadStepReviewBoard({
    organizationId: plan.organizationId,
    studentId: plan.studentId,
  });
  assert.ok(board);

  const attempts = await loadHollandAttemptsForPlan({
    organizationId: plan.organizationId,
    planId: plan.id,
  });
  assert.ok(Array.isArray(attempts));

  const history = await loadStepRevisionHistory({
    organizationId: plan.organizationId,
    planId: plan.id,
    stepNumber: 3,
  });
  assert.ok(Array.isArray(history));

  const wq = await loadCounselorReviewWorkQueue({
    organizationId: plan.organizationId,
    userId: membership.userId,
    displayName: "fixture",
    canReview: true,
    isPlatformAdmin: true,
    role: membership.role,
    roleLabel: "fixture",
    isSupervisor: true,
    viewingAsCounselor: false,
  });
  assert.ok(wq.counts);

  console.log("counselor journey SSR fixture probes passed");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
