/**
 * Batch loader for counselor student Excel export — no per-student dossier N+1.
 */

import {
  BookingStatus,
  CounselorAppointmentStatus,
  GuidanceDocumentType,
  PaymentStatus,
} from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { parseStoredHolland } from "@/lib/counselor-os/holland";
import { packagePresentation } from "@/lib/counselor-os/labels";
import {
  listCounselorStudentsFiltered,
  type CounselorStudentListFilters,
  COUNSELOR_STUDENTS_EXPORT_MAX,
} from "@/lib/counselor-os/students";
import {
  batchLoadHollandAttemptPayloads,
  batchLoadPlanStepPayloads,
} from "@/lib/counselor-os/students-export/step-data-batch";
import {
  exportJourneyStepStatusLabel,
  resolveExportJourneyStepStatus,
  summarizeCounselorReviewStatus,
} from "@/lib/counselor-os/students-export/step-status";
import {
  formatBooleanFa,
  formatTehranJalaliDateTime,
  hollandTypeLabel,
  journeyProgressFromPlan,
  labelExamGroupFa,
  labelGenderFa,
  labelPackageFa,
  labelReviewStatusFa,
  rialsToTomanNumber,
} from "@/lib/counselor-os/students-export/format";
import { APPOINTMENT_PURPOSE, CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { labelAppointmentStatus, labelArrangementState, labelSanjeshStatus } from "@/lib/guidance/journey-v2/labels";
import { parseNeedsReviewFlags, parseOpenRevisionSteps } from "@/lib/guidance/journey-v2/step-review/plan-json";
import { normalizeV2ReviewStatus } from "@/lib/guidance/journey-v2/step-review/status";
import { documentVerifyLabel } from "@/lib/guidance/documents/verification-gate";
import { prisma } from "@/lib/prisma";

export type CounselorStudentsExportScope = "filtered" | "all";

export type CounselorStudentsExportMainRow = Record<string, string | number | null>;
export type CounselorStudentsExportHollandRow = Record<string, string | number | null>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function isHollandIntent(row: {
  idempotencyKey: string;
  description: string | null;
  payableType: string;
}): boolean {
  const blob = `${row.idempotencyKey} ${row.description ?? ""} ${row.payableType}`.toLowerCase();
  return blob.includes("holland") || blob.includes("رغبت");
}

function pickPackageIntent(
  intents: Array<{
    status: PaymentStatus;
    payableType: string;
    idempotencyKey: string;
    amountRials: number;
    discountRials: number;
    finalAmountRials: number;
    paidAt: Date | null;
    metadata: unknown;
  }>,
) {
  return intents.find(
    (row) =>
      row.status === PaymentStatus.PAID &&
      (row.payableType === "GUIDANCE_PACKAGE" ||
        row.idempotencyKey.includes("guidance-v2-package") ||
        row.idempotencyKey.includes("guidance-package")),
  );
}

function discountCodeFromIntent(metadata: unknown): string {
  const rec = asRecord(metadata);
  if (!rec) return "";
  return text(rec.discountCode ?? rec.couponCode ?? rec.code);
}

function parseHollandScoresFromPayload(raw: unknown): {
  code: string;
  topTypes: Array<{ type: string; score: number }>;
  riasec: Record<string, number>;
} | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const inner = rec.data != null ? rec : { data: rec };
  const view = parseStoredHolland(inner.data ?? inner);
  if (!view.completed && !view.code && view.scores.length === 0) return null;
  const riasec: Record<string, number> = {};
  for (const s of view.scores) {
    riasec[s.type] = s.normalized;
  }
  const topTypes = [...view.scores]
    .sort((a, b) => b.normalized - a.normalized)
    .slice(0, 3)
    .map((s) => ({ type: s.type, score: s.normalized }));
  return {
    code: view.code,
    topTypes,
    riasec,
  };
}

export async function loadCounselorStudentsExportBundle(params: {
  ctx: CounselorContext;
  scope: CounselorStudentsExportScope;
  filters: CounselorStudentListFilters;
}): Promise<{
  mainRows: CounselorStudentsExportMainRow[];
  stepRows: Array<Array<string | number | null>>;
  hollandRows: CounselorStudentsExportHollandRow[];
}> {
  const listFilters: CounselorStudentListFilters & { maxCandidates?: number } =
    params.scope === "all"
      ? { maxCandidates: COUNSELOR_STUDENTS_EXPORT_MAX }
      : { ...params.filters, maxCandidates: 400 };

  const { items: listItems } = await listCounselorStudentsFiltered(params.ctx, listFilters);
  const studentIds = listItems.map((s) => s.studentId);
  if (studentIds.length === 0) {
    return { mainRows: [], stepRows: [], hollandRows: [] };
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId: params.ctx.organizationId,
      id: { in: studentIds },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      parentName: true,
      kanoonStudentId: true,
      createdAt: true,
      updatedAt: true,
      grade: { select: { name: true } },
      major: { select: { name: true } },
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: {
          user: { select: { id: true, mobile: true, lastLoginAt: true } },
        },
      },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          publicId: true,
          userId: true,
          currentStep: true,
          completedSteps: true,
          completionPercentage: true,
          examGroup: true,
          guidancePackageCode: true,
          guidancePackageAddons: true,
          packagePaidAt: true,
          highSchoolAverage: true,
          quota: true,
          v2OpenRevisionSteps: true,
          v2StepNeedsReviewFlags: true,
          v2SanjeshReference: true,
          v2SanjeshDeclaredAt: true,
          v2SanjeshStatus: true,
          updatedAt: true,
        },
      },
    },
  });

  const studentById = new Map(students.map((s) => [s.id, s]));
  const orderedStudents = studentIds
    .map((id) => studentById.get(id))
    .filter(Boolean) as typeof students;

  const planIds = orderedStudents
    .map((s) => s.guidancePlans[0]?.id)
    .filter(Boolean) as string[];
  const planPublicIds = orderedStudents
    .map((s) => s.guidancePlans[0]?.publicId)
    .filter(Boolean) as string[];

  const payableIds = [
    ...planIds,
    ...orderedStudents.map((s) => s.portalAccountLinks[0]?.user.id).filter(Boolean),
    ...studentIds,
  ] as string[];

  const [
    guardians,
    assignments,
    reviews,
    hollandAttempts,
    paymentIntents,
    appointments,
    choiceLists,
    documents,
    stepPayloads,
  ] = await Promise.all([
    prisma.studentGuardianRelation.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        studentId: { in: studentIds },
        deletedAt: null,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        studentId: true,
        guardian: { select: { fullName: true, mobile: true } },
      },
    }),
    prisma.counselorStudentAssignment.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        studentId: { in: studentIds },
        status: "ACTIVE",
      },
      select: {
        studentId: true,
        counselor: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.guidanceStepReview.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        planId: { in: planIds },
      },
      select: {
        planId: true,
        stepNumber: true,
        status: true,
        studentMessage: true,
        revisionRequestedAt: true,
        updatedAt: true,
      },
    }),
    prisma.guidanceHollandAttempt.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        planId: { in: planIds },
      },
      orderBy: [{ planId: "asc" }, { attemptNumber: "asc" }],
    }),
    prisma.paymentIntent.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        payableId: { in: payableIds },
      },
      select: {
        payableId: true,
        payableType: true,
        status: true,
        amountRials: true,
        discountRials: true,
        finalAmountRials: true,
        paidAt: true,
        idempotencyKey: true,
        description: true,
        metadata: true,
      },
      take: Math.min(payableIds.length * 8, 8000),
    }),
    prisma.counselorAppointment.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        studentId: { in: studentIds },
        purpose: {
          in: [APPOINTMENT_PURPOSE.FIRST_SESSION, APPOINTMENT_PURPOSE.SECOND_SESSION],
        },
        status: {
          in: [
            CounselorAppointmentStatus.BOOKED,
            CounselorAppointmentStatus.CONFIRMED,
            CounselorAppointmentStatus.COMPLETED,
          ],
        },
      },
      include: {
        bookingReservation: { include: { slot: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guidanceChoiceList.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        planId: { in: planIds },
      },
      select: {
        planId: true,
        kind: true,
        status: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.guidanceDocument.findMany({
      where: {
        organizationId: params.ctx.organizationId,
        planId: { in: planIds },
        isLatest: true,
        deletedAt: null,
      },
      select: {
        planId: true,
        documentType: true,
        verificationStatus: true,
      },
    }),
    batchLoadPlanStepPayloads({
      organizationId: params.ctx.organizationId,
      planPublicIds,
    }),
  ]);

  const guardianByStudent = new Map<string, { name: string; mobile: string }>();
  for (const g of guardians) {
    if (!guardianByStudent.has(g.studentId)) {
      guardianByStudent.set(g.studentId, {
        name: g.guardian.fullName,
        mobile: g.guardian.mobile,
      });
    }
  }

  const counselorByStudent = new Map<string, string>();
  for (const a of assignments) {
    const name = `${a.counselor.firstName} ${a.counselor.lastName}`.trim();
    counselorByStudent.set(a.studentId, name);
  }

  const reviewsByPlan = new Map<string, typeof reviews>();
  for (const r of reviews) {
    const list = reviewsByPlan.get(r.planId) ?? [];
    list.push(r);
    reviewsByPlan.set(r.planId, list);
  }

  const intentsByPayable = new Map<string, typeof paymentIntents>();
  for (const intent of paymentIntents) {
    const list = intentsByPayable.get(intent.payableId) ?? [];
    list.push(intent);
    intentsByPayable.set(intent.payableId, list);
  }

  type ApptRow = (typeof appointments)[number];
  const apptByStudentPurpose = new Map<string, ApptRow>();
  for (const appt of appointments) {
    const res = appt.bookingReservation;
    if (!res || res.status === BookingStatus.CANCELLED) continue;
    const key = `${appt.studentId}::${appt.purpose ?? APPOINTMENT_PURPOSE.FIRST_SESSION}`;
    if (!apptByStudentPurpose.has(key)) {
      apptByStudentPurpose.set(key, appt);
    }
  }

  const choiceByPlan = new Map<
    string,
    { draftInitial: number; publishedInitial: number; draftFinal: number; publishedFinal: number }
  >();
  for (const list of choiceLists) {
    const agg = choiceByPlan.get(list.planId) ?? {
      draftInitial: 0,
      publishedInitial: 0,
      draftFinal: 0,
      publishedFinal: 0,
    };
    const count = list._count.items;
    if (list.kind === CHOICE_LIST_KIND.INITIAL) {
      if (list.status === "DRAFT") agg.draftInitial += count;
      else if (list.status === "READY" || list.status === "CONFIRMED") agg.publishedInitial += count;
    } else if (list.kind === CHOICE_LIST_KIND.FINAL) {
      if (list.status === "DRAFT") agg.draftFinal += count;
      else if (list.status === "READY" || list.status === "CONFIRMED") agg.publishedFinal += count;
    }
    choiceByPlan.set(list.planId, agg);
  }

  const docsByPlan = new Map<string, typeof documents>();
  for (const d of documents) {
    const list = docsByPlan.get(d.planId) ?? [];
    list.push(d);
    docsByPlan.set(d.planId, list);
  }

  const hollandByPlan = new Map<string, typeof hollandAttempts>();
  for (const h of hollandAttempts) {
    const list = hollandByPlan.get(h.planId) ?? [];
    list.push(h);
    hollandByPlan.set(h.planId, list);
  }

  const attemptAssetIds = hollandAttempts.map((h) => h.mediaAssetId);
  const attemptPayloads = await batchLoadHollandAttemptPayloads(attemptAssetIds);

  const mainRows: CounselorStudentsExportMainRow[] = [];
  const stepRows: Array<Array<string | number | null>> = [];
  const hollandRows: CounselorStudentsExportHollandRow[] = [];

  const now = new Date();

  orderedStudents.forEach((student, index) => {
    const listMeta = listItems.find((i) => i.studentId === student.id);
    const plan = student.guidancePlans[0] ?? null;
    const user = student.portalAccountLinks[0]?.user;
    const guardian = guardianByStudent.get(student.id);
    const payloads = plan ? stepPayloads.get(plan.publicId) : null;
    const step1 = asRecord(payloads?.step1?.data);
    const onboarding = asRecord(payloads?.onboarding?.data);
    const onboardingProfile = asRecord(onboarding?.profile);

    const progress = journeyProgressFromPlan(plan);
    const planReviews = plan ? reviewsByPlan.get(plan.id) ?? [] : [];
    const reviewSummary = summarizeCounselorReviewStatus(planReviews);
    const revisionReview = planReviews.find(
      (r) => normalizeV2ReviewStatus(r.status) === "REVISION_REQUESTED",
    );

    const relatedIntents = [
      ...(plan ? intentsByPayable.get(plan.id) ?? [] : []),
      ...(user ? intentsByPayable.get(user.id) ?? [] : []),
      ...(intentsByPayable.get(student.id) ?? []),
    ];
    const hollandPaid = relatedIntents.some(
      (row) => row.status === PaymentStatus.PAID && isHollandIntent(row),
    );
    const packageIntent = pickPackageIntent(relatedIntents);
    const packagePaid = Boolean(plan?.packagePaidAt) || Boolean(packageIntent);
    const presentation = packagePresentation({
      code: plan?.guidancePackageCode ?? null,
      paid: packagePaid,
      activated: Boolean(plan?.packagePaidAt),
    });

    const hollandPayload = payloads?.holland?.data;
    const hollandSummary = parseHollandScoresFromPayload(hollandPayload);
    const planAttempts = plan ? hollandByPlan.get(plan.id) ?? [] : [];
    const basisAttempt = planAttempts.find((a) => a.isActiveBasis && a.completedAt) ??
      planAttempts.filter((a) => a.completedAt).slice(-1)[0];

    const docs = plan ? docsByPlan.get(plan.id) ?? [] : [];
    const gradesDoc = docs.find((d) => d.documentType === GuidanceDocumentType.FINAL_GRADES);

    const firstAppt = apptByStudentPurpose.get(
      `${student.id}::${APPOINTMENT_PURPOSE.FIRST_SESSION}`,
    );
    const secondAppt = apptByStudentPurpose.get(
      `${student.id}::${APPOINTMENT_PURPOSE.SECOND_SESSION}`,
    );

    const choices = plan ? choiceByPlan.get(plan.id) : null;
    const addons = Array.isArray(plan?.guidancePackageAddons)
      ? (plan!.guidancePackageAddons as unknown[]).map(String)
      : [];
    const farhangianAddon = addons.some((c) => c.includes("FARHANGIAN"));

    const lastActivity = [
      user?.lastLoginAt,
      plan?.updatedAt,
      student.updatedAt,
    ]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

    const konkurRaw = asRecord(payloads?.konkur?.data);
    const rankOrTaraz = text(
      konkurRaw?.totalScore ?? konkurRaw?.rank ?? konkurRaw?.taraz ?? "",
    );

    const avgWritten =
      step1?.highSchoolAverage != null
        ? Number(step1.highSchoolAverage)
        : plan?.highSchoolAverage ?? null;

    const studentStatus = listMeta?.needsFollowUp
      ? "نیازمند پیگیری"
      : progress.completionPercentage >= 100
        ? "تکمیل‌شده"
        : !plan
          ? "ثبت‌شده"
          : "فعال";

    const arrangementLabel =
      choices && (choices.publishedFinal > 0 || choices.publishedInitial > 0)
        ? labelArrangementState(
            choices.publishedFinal > 0 ? "FINAL_READY" : "INITIAL_READY",
          )
        : "";

    mainRows.push({
      row: index + 1,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      planPublicId: plan?.publicId ?? "",
      studentMobile: user?.mobile ?? "",
      guardianMobile: guardian?.mobile ?? "",
      guardianName: guardian?.name ?? student.parentName ?? "",
      gender: labelGenderFa(text(step1?.gender)),
      birthDateJalali: text(step1?.birthDateJalali),
      province: text(step1?.nativeProvince ?? onboardingProfile?.province),
      city: text(onboardingProfile?.city),
      district: text(step1?.regionQuota),
      school: text(onboardingProfile?.schoolName),
      grade: student.grade.name,
      track: plan ? labelExamGroupFa(plan.examGroup) : student.major?.name ?? "",
      quotaType: text(step1?.specialQuota ?? plan?.quota),
      konkurRegion: text(step1?.regionQuota),
      overallAverage: avgWritten,
      writtenFinalAverage: avgWritten,
      rankOrTaraz,
      counselorName: counselorByStudent.get(student.id) ?? "",
      studentStatus,
      currentStepTitle: progress.currentStepTitle,
      currentStepNumber: progress.currentStep,
      lastCompletedStepTitle: progress.lastCompletedTitle,
      completedStepCount: progress.completedCount,
      completionPercentage: progress.completionPercentage,
      needsFollowUp: formatBooleanFa(listMeta?.needsFollowUp ?? false),
      counselorReviewStatus: reviewSummary.label,
      revisionStep: revisionReview?.stepNumber ?? null,
      revisionMessage: text(revisionReview?.studentMessage),
      hollandDone: formatBooleanFa(Boolean(hollandSummary?.code || basisAttempt?.completedAt)),
      hollandLastAt: basisAttempt?.completedAt
        ? formatTehranJalaliDateTime(basisAttempt.completedAt)
        : payloads?.holland?.updatedAtIso
          ? formatTehranJalaliDateTime(new Date(payloads.holland.updatedAtIso))
          : "",
      hollandAttemptCount: planAttempts.length,
      hollandDominantType: hollandSummary?.topTypes[0]
        ? hollandTypeLabel(hollandSummary.topTypes[0].type)
        : "",
      hollandBasisCode: hollandSummary?.code ?? "",
      documentStatus: gradesDoc ? documentVerifyLabel(gradesDoc.verificationStatus) : "",
      transcriptUploaded: formatBooleanFa(Boolean(gradesDoc)),
      packageName: labelPackageFa(plan?.guidancePackageCode ?? null),
      farhangianAddon: formatBooleanFa(farhangianAddon),
      financeStatus: presentation.label,
      baseAmountToman: rialsToTomanNumber(packageIntent?.amountRials ?? null),
      discountAmountToman: rialsToTomanNumber(packageIntent?.discountRials ?? null),
      paidAmountToman: rialsToTomanNumber(
        packageIntent?.finalAmountRials ?? packageIntent?.amountRials ?? null,
      ),
      discountCode: discountCodeFromIntent(packageIntent?.metadata),
      paidAt: packageIntent?.paidAt
        ? formatTehranJalaliDateTime(packageIntent.paidAt)
        : plan?.packagePaidAt
          ? formatTehranJalaliDateTime(plan.packagePaidAt)
          : "",
      firstSessionBooked: formatBooleanFa(Boolean(firstAppt)),
      firstSessionStatus: firstAppt
        ? labelAppointmentStatus(firstAppt.status)
        : "",
      firstSessionAt: firstAppt?.bookingReservation?.slot?.startsAt
        ? formatTehranJalaliDateTime(firstAppt.bookingReservation.slot.startsAt)
        : "",
      secondSessionBooked: formatBooleanFa(Boolean(secondAppt)),
      secondSessionStatus: secondAppt
        ? labelAppointmentStatus(secondAppt.status)
        : "",
      secondSessionAt: secondAppt?.bookingReservation?.slot?.startsAt
        ? formatTehranJalaliDateTime(secondAppt.bookingReservation.slot.startsAt)
        : "",
      draftChoiceCount: choices?.draftInitial ?? null,
      publishedChoiceCount: choices?.publishedInitial ?? null,
      arrangementStatus: arrangementLabel,
      sanjeshTracking: plan?.v2SanjeshReference ?? "",
      sanjeshTrackingAt: plan?.v2SanjeshDeclaredAt
        ? formatTehranJalaliDateTime(plan.v2SanjeshDeclaredAt)
        : "",
      sanjeshStatusLabel: labelSanjeshStatus(plan?.v2SanjeshStatus),
      planCreatedAt: formatTehranJalaliDateTime(student.createdAt),
      lastActivityAt: lastActivity ? formatTehranJalaliDateTime(lastActivity) : "",
      daysSinceActivity: lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / 86400000)
        : null,
      studentId: student.id,
      hollandPaid: formatBooleanFa(hollandPaid),
    });

    const openRevision = plan ? parseOpenRevisionSteps(plan.v2OpenRevisionSteps) : [];
    const needsFlags = plan ? parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags) : {};
    const stepCompletionAt: Record<number, string> = {};
    if (payloads?.step1?.updatedAtIso) stepCompletionAt[1] = formatTehranJalaliDateTime(new Date(payloads.step1.updatedAtIso));
    if (payloads?.step2?.updatedAtIso) stepCompletionAt[2] = formatTehranJalaliDateTime(new Date(payloads.step2.updatedAtIso));
    if (payloads?.holland?.updatedAtIso) {
      stepCompletionAt[4] = formatTehranJalaliDateTime(new Date(payloads.holland.updatedAtIso));
      stepCompletionAt[5] = stepCompletionAt[4];
    }

    const stepRow: Array<string | number | null> = [
      index + 1,
      student.fullName,
      user?.mobile ?? "",
      plan?.publicId ?? "",
      counselorByStudent.get(student.id) ?? "",
      progress.currentStepTitle,
      progress.completionPercentage,
    ];

    for (let step = 1; step <= 18; step += 1) {
      const review = planReviews.find((r) => r.stepNumber === step);
      const status = plan
        ? resolveExportJourneyStepStatus({
            stepNumber: step,
            currentStep: plan.currentStep,
            completedSteps: plan.completedSteps,
            reviewStatusRaw: review?.status,
            openRevisionSteps: openRevision,
            needsReviewFlags: needsFlags,
          })
        : "not_started";
      stepRow.push(
        exportJourneyStepStatusLabel(status),
        stepCompletionAt[step] ?? "",
        review ? labelReviewStatusFa(normalizeV2ReviewStatus(review.status)) : "",
      );
    }
    stepRows.push(stepRow);

    for (const attempt of planAttempts) {
      const payload = attemptPayloads.get(attempt.mediaAssetId);
      const scores = parseHollandScoresFromPayload(payload);
      hollandRows.push({
        row: hollandRows.length + 1,
        fullName: student.fullName,
        mobile: user?.mobile ?? "",
        planPublicId: plan?.publicId ?? "",
        attemptNumber: attempt.attemptNumber,
        attemptStatus: attempt.completedAt ? "تکمیل‌شده" : "در جریان",
        isBasis: formatBooleanFa(attempt.isActiveBasis),
        startedAt: formatTehranJalaliDateTime(attempt.createdAt),
        completedAt: attempt.completedAt
          ? formatTehranJalaliDateTime(attempt.completedAt)
          : "",
        hollandCode: scores?.code ?? "",
        type1: scores?.topTypes[0] ? hollandTypeLabel(scores.topTypes[0].type) : "",
        score1: scores?.topTypes[0]?.score ?? null,
        type2: scores?.topTypes[1] ? hollandTypeLabel(scores.topTypes[1].type) : "",
        score2: scores?.topTypes[1]?.score ?? null,
        type3: scores?.topTypes[2] ? hollandTypeLabel(scores.topTypes[2].type) : "",
        score3: scores?.topTypes[2]?.score ?? null,
        R: scores?.riasec.R ?? null,
        I: scores?.riasec.I ?? null,
        A: scores?.riasec.A ?? null,
        S: scores?.riasec.S ?? null,
        E: scores?.riasec.E ?? null,
        C: scores?.riasec.C ?? null,
        retakeRequestedBy: attempt.requestedByUserId ? "سیستم/کاربر" : "",
        retakeReason: attempt.requestReason ?? "",
        counselorReview: labelReviewStatusFa(
          normalizeV2ReviewStatus(
            planReviews.find((r) => r.stepNumber === 4 || r.stepNumber === 5)?.status ?? "",
          ),
        ),
      });
    }
  });

  return { mainRows, stepRows, hollandRows };
}

export const MAIN_SHEET_HEADERS = [
  "ردیف",
  "نام",
  "نام خانوادگی",
  "نام و نام خانوادگی",
  "کد/شناسه عمومی پرونده",
  "شماره موبایل دانش‌آموز",
  "شماره موبایل ولی",
  "نام ولی",
  "جنسیت",
  "تاریخ تولد",
  "استان",
  "شهر",
  "منطقه/ناحیه",
  "مدرسه",
  "پایه",
  "رشته تحصیلی",
  "نوع سهمیه",
  "منطقه کنکور",
  "معدل کل",
  "معدل کتبی نهایی",
  "رتبه/تراز",
  "نام مشاور پرونده",
  "وضعیت دانش‌آموز",
  "مرحله فعلی",
  "شماره مرحله فعلی",
  "آخرین مرحله تکمیل‌شده",
  "تعداد مراحل تکمیل‌شده",
  "درصد پیشرفت",
  "نیازمند پیگیری",
  "وضعیت بررسی مشاور",
  "مرحله نیازمند اصلاح",
  "توضیح قابل مشاهده آخرین درخواست اصلاح",
  "رغبت‌سنجی انجام شده؟",
  "تاریخ آخرین رغبت‌سنجی",
  "تعداد دفعات رغبت‌سنجی",
  "تیپ غالب هالند",
  "کد هالند نتیجه مبنا",
  "وضعیت مدرک/کارنامه",
  "فایل کارنامه ثبت شده؟",
  "بسته انتخاب‌شده",
  "افزونه فرهنگیان",
  "وضعیت مالی",
  "مبلغ پایه (تومان)",
  "مبلغ تخفیف (تومان)",
  "مبلغ نهایی پرداخت‌شده (تومان)",
  "کد تخفیف استفاده‌شده",
  "تاریخ پرداخت",
  "جلسه اول رزرو شده؟",
  "وضعیت جلسه اول",
  "تاریخ جلسه اول",
  "جلسه دوم رزرو شده؟",
  "وضعیت جلسه دوم",
  "تاریخ جلسه دوم",
  "تعداد انتخاب‌های پیش‌نویس",
  "تعداد انتخاب‌های نسخه منتشرشده",
  "وضعیت چیدمان",
  "کد رهگیری سنجش",
  "تاریخ ثبت کد رهگیری",
  "وضعیت ثبت سنجش",
  "تاریخ ایجاد پرونده",
  "آخرین فعالیت",
  "تعداد روز از آخرین فعالیت",
] as const;

export function mainRowToCells(row: CounselorStudentsExportMainRow): Array<string | number | null> {
  return [
    row.row,
    row.firstName,
    row.lastName,
    row.fullName,
    row.planPublicId,
    row.studentMobile,
    row.guardianMobile,
    row.guardianName,
    row.gender,
    row.birthDateJalali,
    row.province,
    row.city,
    row.district,
    row.school,
    row.grade,
    row.track,
    row.quotaType,
    row.konkurRegion,
    row.overallAverage,
    row.writtenFinalAverage,
    row.rankOrTaraz,
    row.counselorName,
    row.studentStatus,
    row.currentStepTitle,
    row.currentStepNumber,
    row.lastCompletedStepTitle,
    row.completedStepCount,
    row.completionPercentage,
    row.needsFollowUp,
    row.counselorReviewStatus,
    row.revisionStep,
    row.revisionMessage,
    row.hollandDone,
    row.hollandLastAt,
    row.hollandAttemptCount,
    row.hollandDominantType,
    row.hollandBasisCode,
    row.documentStatus,
    row.transcriptUploaded,
    row.packageName,
    row.farhangianAddon,
    row.financeStatus,
    row.baseAmountToman,
    row.discountAmountToman,
    row.paidAmountToman,
    row.discountCode,
    row.paidAt,
    row.firstSessionBooked,
    row.firstSessionStatus,
    row.firstSessionAt,
    row.secondSessionBooked,
    row.secondSessionStatus,
    row.secondSessionAt,
    row.draftChoiceCount,
    row.publishedChoiceCount,
    row.arrangementStatus,
    row.sanjeshTracking,
    row.sanjeshTrackingAt,
    row.sanjeshStatusLabel,
    row.planCreatedAt,
    row.lastActivityAt,
    row.daysSinceActivity,
  ];
}
