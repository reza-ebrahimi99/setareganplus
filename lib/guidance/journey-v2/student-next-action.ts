import { computeNextActionCard, type NextActionCard } from "@/lib/guidance/journey-v2/next-action";
import type { GuidanceV2PlanSnapshot } from "@/lib/guidance/journey-v2/plan";
import { buildLateJourneySignals, type LateJourneyFacts } from "@/lib/guidance/journey-v2/signals";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
  CHOICE_LIST_STATUS,
} from "@/lib/guidance/journey-v2/constants";
import {
  loadPurposeAppointmentView,
} from "@/lib/guidance/journey-v2/appointments";
import { loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import { loadSanjeshCase } from "@/lib/guidance/journey-v2/sanjesh";
import { CounselorAppointmentStatus } from "@/generated/prisma/enums";

export async function loadStudentNextAction(params: {
  organizationId: string;
  studentId: string;
  plan: GuidanceV2PlanSnapshot;
}): Promise<NextActionCard | null> {
  if (params.plan.currentStep < 11) return null;

  const [first, second, konkur, initialList, finalList, sanjesh] = await Promise.all([
    loadPurposeAppointmentView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    }),
    loadPurposeAppointmentView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
    }),
    loadKonkurCaseView({
      organizationId: params.organizationId,
      studentId: params.studentId,
      planPublicId: params.plan.publicId,
      planId: params.plan.id,
      planExamGroup: params.plan.examGroup,
    }),
    loadChoiceListView({
      organizationId: params.organizationId,
      planId: params.plan.id,
      kind: CHOICE_LIST_KIND.INITIAL,
    }),
    loadChoiceListView({
      organizationId: params.organizationId,
      planId: params.plan.id,
      kind: CHOICE_LIST_KIND.FINAL,
    }),
    loadSanjeshCase({ organizationId: params.organizationId, planId: params.plan.id }),
  ]);

  const facts: LateJourneyFacts = {
    plan: params.plan,
    firstSessionBooked: Boolean(first),
    firstSessionCompleted: first?.status === CounselorAppointmentStatus.COMPLETED,
    secondSessionBooked: Boolean(second),
    secondSessionCompleted: second?.status === CounselorAppointmentStatus.COMPLETED,
    konkurSubmitted: Boolean(konkur.studentData),
    konkurCounselorApproved:
      params.plan.completedSteps.includes(12) || params.plan.currentStep > 12,
    initialListStatus: initialList?.status ?? null,
    initialItemCount: initialList?.items.filter((i) => i.isActive).length ?? 0,
    reviewSubmitted:
      params.plan.completedSteps.includes(14) ||
      Boolean(params.plan.choicesApprovedAtIso),
    finalListStatus: finalList?.status ?? null,
    needsCounselorReview: false,
  };

  const signals = buildLateJourneySignals(facts);
  return computeNextActionCard({
    plan: params.plan,
    signals,
    links: {
      audience: "student",
      studentId: params.studentId,
      counselorCaseHref: "",
      choicesHref: "",
    },
  });
}
