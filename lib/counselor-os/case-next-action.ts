/**
 * Load next-action card for a counselor case (steps 11–18).
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
} from "@/lib/guidance/journey-v2/constants";
import { loadPurposeAppointmentView } from "@/lib/guidance/journey-v2/appointments";
import { loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import { computeNextActionCard, type NextActionCard } from "@/lib/guidance/journey-v2/next-action";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import {
  buildLateJourneySignals,
  type LateJourneyFacts,
} from "@/lib/guidance/journey-v2/signals";
import { CounselorAppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function sessionCompleted(status: string | undefined): boolean {
  return status === CounselorAppointmentStatus.COMPLETED;
}

export async function loadCounselorCaseNextAction(
  ctx: CounselorContext,
  studentId: string,
): Promise<NextActionCard | null> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan || plan.currentStep < 10) return null;

  const [first, second, konkur, initialList, reviewFlag] = await Promise.all([
    loadPurposeAppointmentView({
      organizationId: ctx.organizationId,
      studentId,
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    }),
    loadPurposeAppointmentView({
      organizationId: ctx.organizationId,
      studentId,
      purpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
    }),
    loadKonkurCaseView({
      organizationId: ctx.organizationId,
      studentId,
      planPublicId: plan.publicId,
      planId: plan.id,
      planExamGroup: plan.examGroup,
    }),
    loadChoiceListView({
      organizationId: ctx.organizationId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.INITIAL,
      includeInactive: true,
    }),
    prisma.guidancePlan.findFirst({
      where: {
        id: plan.id,
        v2NeedsReviewAt: { not: null },
      },
      select: { v2NeedsReviewStep: true },
    }),
  ]);

  const reviewSubmitted =
    plan.completedSteps.includes(14) ||
    Boolean(plan.choicesApprovedAtIso) ||
    plan.currentStep > 14;

  const facts: LateJourneyFacts = {
    plan,
    firstSessionBooked: Boolean(first?.startsAtIso),
    firstSessionCompleted: sessionCompleted(first?.status),
    secondSessionBooked: Boolean(second?.startsAtIso),
    secondSessionCompleted: sessionCompleted(second?.status),
    konkurSubmitted: Boolean(konkur.studentData),
    konkurCounselorApproved:
      plan.completedSteps.includes(12) ||
      konkur.document?.verificationStatus === "VERIFIED" ||
      plan.currentStep > 12,
    initialListStatus: initialList?.status ?? null,
    initialItemCount: initialList?.items.filter((i) => i.isActive).length ?? 0,
    reviewSubmitted,
    finalListStatus: null,
    needsCounselorReview: Boolean(reviewFlag),
  };

  const finalList = await loadChoiceListView({
    organizationId: ctx.organizationId,
    planId: plan.id,
    kind: CHOICE_LIST_KIND.FINAL,
    includeInactive: true,
  });
  facts.finalListStatus = finalList?.status ?? null;

  const signals = buildLateJourneySignals(facts);
  const caseHref = `/admin/counselor/students/${studentId}`;
  return computeNextActionCard({
    plan,
    signals,
    links: {
      audience: "counselor",
      studentId,
      counselorCaseHref: caseHref,
      choicesHref: `${caseHref}/choices`,
    },
  });
}
