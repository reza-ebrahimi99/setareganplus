/**
 * Aggregated model for counselor steps 11–18 operational workspace.
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { loadCounselorLateJourney, type CounselorLateJourneyModel } from "@/lib/counselor-os/late-journey";
import {
  loadChoiceStudioBundle,
  type ChoiceStudioBundle,
  type ChoiceStudioPhase,
} from "@/lib/counselor-os/choice-studio-bundle";
import { buildSteps1118Rail, type Steps1118RailItem } from "@/lib/counselor-os/steps-11-18-rail";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
} from "@/lib/guidance/journey-v2/constants";
import { loadPurposeAppointmentView } from "@/lib/guidance/journey-v2/appointments";
import { loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import { buildLateJourneyTimeline } from "@/lib/guidance/journey-v2/late-status";
import { computeNextActionCard, type NextActionCard } from "@/lib/guidance/journey-v2/next-action";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import {
  buildLateJourneySignals,
  type LateJourneyFacts,
} from "@/lib/guidance/journey-v2/signals";
import { CounselorAppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { listStudentSessionHistory } from "@/lib/counselor-os/sessions";

export type CounselorNextActionView =
  | { kind: "card"; card: NextActionCard }
  | { kind: "incomplete"; message: string };

export type Steps1118WorkspaceModel = {
  studentId: string;
  studentName: string;
  planPublicId: string | null;
  currentStep: number;
  rail: Steps1118RailItem[];
  late: CounselorLateJourneyModel;
  nextAction: CounselorNextActionView;
  firstSessionRecordId: string | null;
  secondSessionRecordId: string | null;
  choiceStudios: Partial<Record<ChoiceStudioPhase, ChoiceStudioBundle>>;
};

function sessionCompleted(status: string | undefined): boolean {
  return status === CounselorAppointmentStatus.COMPLETED;
}

async function buildFacts(
  ctx: CounselorContext,
  studentId: string,
  plan: NonNullable<Awaited<ReturnType<typeof loadGuidanceV2Plan>>>,
): Promise<LateJourneyFacts> {
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
      where: { id: plan.id, v2NeedsReviewAt: { not: null } },
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
  return facts;
}

export async function loadCounselorNextActionView(
  ctx: CounselorContext,
  studentId: string,
): Promise<CounselorNextActionView> {
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
  if (!plan) {
    return {
      kind: "incomplete",
      message: "برای تعیین اقدام بعدی، مسیر انتخاب رشته V2 برای این پرونده ساخته نشده است.",
    };
  }
  if (plan.currentStep < 11) {
    return {
      kind: "incomplete",
      message: `پرونده در مرحله ${plan.currentStep} است. workspace عملیاتی ۱۱–۱۸ پس از ورود به مسیر دیررس فعال می‌شود؛ تا آن زمان از تب «مسیر ۱۸مرحله‌ای» پیگیری کنید.`,
    };
  }

  const facts = await buildFacts(ctx, studentId, plan);
  const signals = buildLateJourneySignals(facts);
  const caseHref = `/admin/counselor/students/${studentId}`;
  const card = computeNextActionCard({
    plan,
    signals,
    links: {
      audience: "counselor",
      studentId,
      counselorCaseHref: `${caseHref}#cos-steps1118`,
      choicesHref: `${caseHref}/choices`,
    },
  });
  return { kind: "card", card };
}

function pickSessionRecordIds(
  sessions: Awaited<ReturnType<typeof listStudentSessionHistory>>,
): { first: string | null; second: string | null } {
  const chronological = [...sessions].reverse();
  return {
    first: chronological[0]?.id ?? null,
    second: chronological[1]?.id ?? null,
  };
}

export async function loadSteps1118WorkspaceModel(
  ctx: CounselorContext,
  studentId: string,
): Promise<Steps1118WorkspaceModel> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const [bundle, late, nextAction, sessions, plan] = await Promise.all([
    loadCounselorCaseBundle(ctx, studentId),
    loadCounselorLateJourney(ctx, studentId),
    loadCounselorNextActionView(ctx, studentId),
    listStudentSessionHistory(ctx, studentId),
    loadGuidanceV2Plan({ organizationId: ctx.organizationId, studentId }),
  ]);

  const sessionIds = pickSessionRecordIds(sessions);

  let rail: Steps1118RailItem[] = [11, 12, 13, 14, 15, 16, 17, 18].map((step) => ({
    step,
    title:
      step === 11
        ? "جلسه اول"
        : step === 12
          ? "نتایج کنکور"
          : step === 13
            ? "چیدمان اولیه"
            : step === 14
              ? "بازبینی دانش‌آموز"
              : step === 15
                ? "جلسه دوم"
                : step === 16
                  ? "فهرست نهایی"
                  : step === 17
                    ? "تأیید آگاهانه"
                    : "ثبت سنجش",
    visualState: step > (plan?.currentStep ?? 0) ? "locked" : step === plan?.currentStep ? "in_progress" : "completed",
    statusLabel: "—",
    ownerLabel: "—",
  })) as Steps1118RailItem[];

  if (plan && plan.currentStep >= 10) {
    const facts = await buildFacts(ctx, studentId, plan);
    const signals = buildLateJourneySignals(facts);
    const timeline = buildLateJourneyTimeline(signals);
    const card =
      nextAction.kind === "card"
        ? nextAction.card
        : computeNextActionCard({
            plan,
            signals,
            links: {
              audience: "counselor",
              studentId,
              counselorCaseHref: `/admin/counselor/students/${studentId}#cos-steps1118`,
              choicesHref: `/admin/counselor/students/${studentId}/choices`,
            },
          });
    rail = buildSteps1118Rail({
      timeline,
      currentStep: plan.currentStep,
      progressChips: card.progress11to18,
    });
  }

  const choiceStudios: Partial<Record<ChoiceStudioPhase, ChoiceStudioBundle>> = {};
  if (plan) {
    const phases: ChoiceStudioPhase[] = ["initial", "review", "final", "sanjesh"];
    const loaded = await Promise.all(
      phases.map(async (phase) => {
        const bundle = await loadChoiceStudioBundle(ctx, studentId, phase);
        return [phase, bundle] as const;
      }),
    );
    for (const [phase, b] of loaded) {
      if (b) choiceStudios[phase] = b;
    }
  }

  return {
    studentId,
    studentName: bundle.caseModel.studentName,
    planPublicId: plan?.publicId ?? null,
    currentStep: plan?.currentStep ?? late.currentStep,
    rail,
    late,
    nextAction,
    firstSessionRecordId: sessionIds.first,
    secondSessionRecordId: sessionIds.second,
    choiceStudios,
  };
}
