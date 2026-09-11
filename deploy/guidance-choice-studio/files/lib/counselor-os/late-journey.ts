/**
 * Counselor OS — Steps 11–18 operational snapshot for a single case.
 */

import { CounselorAppointmentStatus } from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
  CHOICE_LIST_STATUS,
  SANJESH_STATUS,
} from "@/lib/guidance/journey-v2/constants";
import {
  loadAssignedCounselorForStudent,
  loadPurposeAppointmentView,
} from "@/lib/guidance/journey-v2/appointments";
import {
  loadChoiceListView,
  loadFeedbackMappedToFinal,
  reviewStats,
} from "@/lib/guidance/journey-v2/choices";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import {
  labelAppointmentStatus,
  labelArrangementState,
  labelChoiceListStatus,
  labelSanjeshStatus,
} from "@/lib/guidance/journey-v2/labels";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { loadSanjeshCase } from "@/lib/guidance/journey-v2/sanjesh";

export type LateStepOp = {
  id: number;
  title: string;
  statusLabel: string;
  detail: string;
  cta: { href: string; label: string } | null;
  needsCounselor: boolean;
};

export type CounselorLateJourneyModel = {
  studentId: string;
  currentStep: number;
  firstSession: {
    whenLabel: string | null;
    statusLabel: string;
  };
  secondSession: {
    whenLabel: string | null;
    statusLabel: string;
  };
  konkurReady: boolean;
  arrangementLabel: string;
  reviewLabel: string;
  finalLabel: string;
  sanjeshLabel: string;
  steps: LateStepOp[];
  konkur: Awaited<ReturnType<typeof loadKonkurCaseView>> | null;
  initialList: Awaited<ReturnType<typeof loadChoiceListView>>;
  finalMapped: Awaited<ReturnType<typeof loadFeedbackMappedToFinal>>;
  sanjesh: Awaited<ReturnType<typeof loadSanjeshCase>> | null;
};

export async function loadCounselorLateJourney(
  ctx: CounselorContext,
  studentId: string,
): Promise<CounselorLateJourneyModel> {
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

  const empty: CounselorLateJourneyModel = {
    studentId,
    currentStep: plan?.currentStep ?? 0,
    firstSession: { whenLabel: null, statusLabel: "رزرو نشده" },
    secondSession: { whenLabel: null, statusLabel: "رزرو نشده" },
    konkurReady: false,
    arrangementLabel: labelArrangementState("WAITING"),
    reviewLabel: "شروع نشده",
    finalLabel: labelArrangementState("FINAL_IN_PROGRESS"),
    sanjeshLabel: labelSanjeshStatus(SANJESH_STATUS.NOT_SUBMITTED),
    steps: [],
    konkur: null,
    initialList: null,
    finalMapped: { list: null, fromInitial: null },
    sanjesh: null,
  };
  if (!plan) return empty;

  const [counselor, first, second, konkur, initialList, finalMapped, sanjesh] =
    await Promise.all([
      loadAssignedCounselorForStudent({
        organizationId: ctx.organizationId,
        studentId,
      }),
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
      loadFeedbackMappedToFinal({
        organizationId: ctx.organizationId,
        planId: plan.id,
      }),
      loadSanjeshCase({ organizationId: ctx.organizationId, planId: plan.id }),
    ]);

  const choicesHref = `/admin/counselor/students/${studentId}/choices`;
  const caseHref = `/admin/counselor/students/${studentId}`;

  const review = initialList ? await reviewStats(initialList) : null;
  const arrangementLabel =
    !initialList || initialList.items.length === 0
      ? labelArrangementState("WAITING")
      : initialList.status === CHOICE_LIST_STATUS.READY
        ? labelArrangementState("INITIAL_READY")
        : labelArrangementState("IN_PROGRESS");

  const steps: LateStepOp[] = [
    {
      id: 11,
      title: "جلسه اول",
      statusLabel: first?.statusLabel ?? "رزرو نشده",
      detail: first?.whenLabel ?? (counselor ? "در انتظار رزرو دانش‌آموز" : "تخصیص مشاور ناقص است"),
      cta: null,
      needsCounselor: !first && plan.currentStep === 11,
    },
    {
      id: 12,
      title: "نتایج کنکور",
      statusLabel: konkur.studentData ? "ثبت شده" : "ثبت نشده",
      detail: konkur.document?.filename ?? "کارنامه بارگذاری نشده",
      cta: { href: `${caseHref}#konkur`, label: "مشاهده / اصلاح" },
      needsCounselor: plan.currentStep === 12,
    },
    {
      id: 13,
      title: "چیدمان اولیه",
      statusLabel: arrangementLabel,
      detail: initialList
        ? `${initialList.items.filter((i) => i.isActive).length} انتخاب فعال`
        : "هنوز شروع نشده",
      cta: { href: `${choicesHref}?phase=initial`, label: "استودیوی چیدمان" },
      needsCounselor: plan.currentStep === 13,
    },
    {
      id: 14,
      title: "بازخورد دانش‌آموز",
      statusLabel: review
        ? `${review.reviewed} از ${review.total} بررسی شده`
        : "در انتظار",
      detail: review ? `${review.requestedRemoval} درخواست حذف` : "—",
      cta: { href: `${choicesHref}?phase=review`, label: "مشاهده بازخورد دانش‌آموز" },
      needsCounselor: plan.currentStep === 14,
    },
    {
      id: 15,
      title: "جلسه دوم",
      statusLabel: second?.statusLabel ?? "رزرو نشده",
      detail: second?.whenLabel ?? "در انتظار رزرو",
      cta: null,
      needsCounselor: plan.currentStep === 15,
    },
    {
      id: 16,
      title: "اصلاحات نهایی",
      statusLabel: labelChoiceListStatus(finalMapped.list?.status ?? null),
      detail: "اعمال بازخورد و یادداشت جلسه دوم",
      cta: { href: `${choicesHref}?phase=final`, label: "استودیوی اصلاح نهایی" },
      needsCounselor: plan.currentStep === 16,
    },
    {
      id: 17,
      title: "تأیید آگاهانه",
      statusLabel: plan.finalApprovedAtIso ? "تأیید شده" : "در انتظار دانش‌آموز",
      detail: plan.finalApprovedAtIso
        ? formatJalaliDateTimeShort(new Date(plan.finalApprovedAtIso))
        : "پس از آماده شدن نسخه نهایی",
      cta:
        finalMapped.list?.status === CHOICE_LIST_STATUS.DRAFT
          ? { href: `${choicesHref}?phase=final`, label: "آماده تأیید دانش‌آموز" }
          : null,
      needsCounselor: false,
    },
    {
      id: 18,
      title: "ثبت سنجش",
      statusLabel: sanjesh.statusLabel,
      detail: sanjesh.reference ?? sanjesh.receipt?.filename ?? "—",
      cta:
        finalMapped.list?.status === CHOICE_LIST_STATUS.CONFIRMED
          ? { href: `${choicesHref}?phase=sanjesh`, label: "حالت ثبت سنجش" }
          : sanjesh.status === SANJESH_STATUS.PENDING_REVIEW ||
              sanjesh.status === SANJESH_STATUS.DECLARED
            ? { href: `${caseHref}#sanjesh`, label: "بررسی رسید سنجش" }
            : null,
      needsCounselor:
        sanjesh.status === SANJESH_STATUS.PENDING_REVIEW ||
        sanjesh.status === SANJESH_STATUS.DECLARED,
    },
  ];

  return {
    studentId,
    currentStep: plan.currentStep,
    firstSession: {
      whenLabel: first?.whenLabel ?? null,
      statusLabel: first?.statusLabel ?? "رزرو نشده",
    },
    secondSession: {
      whenLabel: second?.whenLabel ?? null,
      statusLabel: second?.statusLabel ?? "رزرو نشده",
    },
    konkurReady: Boolean(konkur.studentData),
    arrangementLabel,
    reviewLabel: review ? `${review.reviewed}/${review.total}` : "—",
    finalLabel: labelChoiceListStatus(finalMapped.list?.status ?? null),
    sanjeshLabel: sanjesh.statusLabel,
    steps,
    konkur,
    initialList,
    finalMapped,
    sanjesh,
  };
}

export async function countLateQueues(params: {
  organizationId: string;
  studentIds: string[];
}) {
  if (params.studentIds.length === 0) {
    return {
      awaitingArrangement: 0,
      awaitingFinalRevision: 0,
      sanjeshPending: 0,
      secondSessionPending: 0,
    };
  }

  const plans = await (await import("@/lib/prisma")).prisma.guidancePlan.findMany({
    where: {
      organizationId: params.organizationId,
      studentId: { in: params.studentIds },
      deletedAt: null,
      journeyVersion: 2,
    },
    select: { studentId: true, currentStep: true, v2SanjeshStatus: true },
  });

  return {
    awaitingArrangement: plans.filter((p) => p.currentStep === 13).length,
    awaitingFinalRevision: plans.filter((p) => p.currentStep === 16).length,
    sanjeshPending: plans.filter(
      (p) =>
        p.currentStep === 18 &&
        (p.v2SanjeshStatus === SANJESH_STATUS.PENDING_REVIEW ||
          p.v2SanjeshStatus === SANJESH_STATUS.DECLARED),
    ).length,
    secondSessionPending: plans.filter((p) => p.currentStep === 15).length,
  };
}

export { CounselorAppointmentStatus, labelAppointmentStatus };
