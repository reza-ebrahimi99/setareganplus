/**
 * Counselor OS — student list + case loader (V2 journey, leads included).
 */

import {
  BookingStatus,
  CounselorFollowUpStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  guidanceV2StudentWhere,
  resolveAccessibleStudentFilter,
  studentIdFilter,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { loadStudentAssignment } from "@/lib/counselor-os/assignments";
import {
  labelExamGroup,
  labelPackage,
  packagePresentation,
} from "@/lib/counselor-os/labels";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import { loadCounselorV2Dossier } from "@/lib/counselor-os/v2-dossier";
import type { CounselorStudentCase } from "@/lib/counselor-os/view-models";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

const STALE_DAYS = 14;
const PAGE_SIZE = 40;

export type CounselorStudentListFilters = {
  q?: string;
  activity?: "never" | "inactive" | "active" | "completed" | "followup";
  step?: string;
  package?: string;
  finance?: "holland" | "guidance" | "unpaid" | "none";
  grade?: string;
  track?: string;
  page?: string;
};

export type CounselorStudentListItem = {
  studentId: string;
  studentName: string;
  mobile: string | null;
  gradeName: string | null;
  trackLabel: string | null;
  planPublicId: string | null;
  currentStep: number | null;
  currentStepTitle: string | null;
  completionPercentage: number;
  hollandPaid: boolean;
  packageTitle: string;
  packageStateLabel: string;
  lastActivityLabel: string | null;
  followUpPending: number;
  needsFollowUp: boolean;
};

export type CounselorStudentListResult = {
  items: CounselorStudentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function isHollandBlob(row: { idempotencyKey: string; description: string | null; payableType: string }) {
  const blob = `${row.idempotencyKey} ${row.description ?? ""} ${row.payableType}`.toLowerCase();
  return blob.includes("holland") || blob.includes("رغبت");
}

function lastActivityAt(input: {
  lastLoginAt: Date | null;
  planUpdatedAt: Date | null;
  studentUpdatedAt: Date;
}): Date {
  const dates = [input.lastLoginAt, input.planUpdatedAt, input.studentUpdatedAt].filter(
    (d): d is Date => Boolean(d),
  );
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

export async function listCounselorStudents(
  ctx: CounselorContext,
  options?: CounselorStudentListFilters,
): Promise<CounselorStudentListResult> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });

  const q = options?.q?.trim();
  const page = Math.max(1, Number(options?.page ?? 1) || 1);
  const access = studentIdFilter(filter);

  const students = await prisma.student.findMany({
    where: {
      ...guidanceV2StudentWhere(ctx.organizationId),
      ...access,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              {
                portalAccountLinks: {
                  some: {
                    deletedAt: null,
                    user: { mobile: { contains: q } },
                  },
                },
              },
            ],
          }
        : {}),
      ...(options?.grade ? { gradeId: options.grade } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      fullName: true,
      updatedAt: true,
      createdAt: true,
      grade: { select: { id: true, name: true } },
      major: { select: { name: true } },
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: { user: { select: { id: true, mobile: true, lastLoginAt: true } } },
      },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          publicId: true,
          currentStep: true,
          completionPercentage: true,
          guidancePackageCode: true,
          packagePaidAt: true,
          examGroup: true,
          updatedAt: true,
        },
      },
    },
  });

  const studentIds = students.map((s) => s.id);
  const planIds = students.map((s) => s.guidancePlans[0]?.id).filter(Boolean) as string[];
  const userIds = students
    .map((s) => s.portalAccountLinks[0]?.user.id)
    .filter(Boolean) as string[];

  const [followUps, intents] = await Promise.all([
    prisma.counselorFollowUp.groupBy({
      by: ["studentId"],
      where: {
        organizationId: ctx.organizationId,
        status: CounselorFollowUpStatus.PENDING,
        studentId: { in: studentIds },
        ...(ctx.isSupervisor ? {} : { counselorUserId: ctx.userId }),
      },
      _count: { _all: true },
    }),
    prisma.paymentIntent.findMany({
      where: {
        organizationId: ctx.organizationId,
        payableId: { in: [...planIds, ...userIds, ...studentIds] },
      },
      select: {
        payableId: true,
        payableType: true,
        status: true,
        idempotencyKey: true,
        description: true,
      },
      take: 800,
    }),
  ]);

  const followUpByStudent = new Map(followUps.map((f) => [f.studentId, f._count._all]));
  const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const items: CounselorStudentListItem[] = students.map((s) => {
    const plan = s.guidancePlans[0];
    const user = s.portalAccountLinks[0]?.user;
    const activity = lastActivityAt({
      lastLoginAt: user?.lastLoginAt ?? null,
      planUpdatedAt: plan?.updatedAt ?? null,
      studentUpdatedAt: s.updatedAt,
    });
    const relatedIntents = intents.filter(
      (row) =>
        row.payableId === plan?.id ||
        row.payableId === user?.id ||
        row.payableId === s.id,
    );
    const hollandPaid = relatedIntents.some(
      (row) => row.status === PaymentStatus.PAID && isHollandBlob(row),
    );
    const packagePaid = Boolean(plan?.packagePaidAt);
    const presentation = packagePresentation({
      code: plan?.guidancePackageCode ?? null,
      paid: packagePaid,
      activated: packagePaid,
    });
    const completion = plan?.completionPercentage ?? 0;
    const neverStarted = !plan || (plan.currentStep <= 1 && completion === 0);
    const completed = completion >= 100 || (plan?.currentStep ?? 0) >= 18;
    const inactive = !completed && activity < staleBefore;
    const followUpPending = followUpByStudent.get(s.id) ?? 0;

    return {
      studentId: s.id,
      studentName: s.fullName,
      mobile: user?.mobile ?? null,
      gradeName: s.grade.name,
      trackLabel: plan ? labelExamGroup(plan.examGroup) : (s.major?.name ?? null),
      planPublicId: plan?.publicId ?? null,
      currentStep: plan?.currentStep ?? null,
      currentStepTitle: plan ? counselorV2StepTitle(plan.currentStep) : "هنوز شروع نشده",
      completionPercentage: completion,
      hollandPaid,
      packageTitle: labelPackage(plan?.guidancePackageCode ?? null),
      packageStateLabel: presentation.label,
      lastActivityLabel: formatJalaliDateTimeShort(activity),
      followUpPending,
      needsFollowUp: followUpPending > 0 || neverStarted || inactive,
      _meta: {
        neverStarted,
        inactive,
        completed,
        active: !inactive && !neverStarted && !completed,
        packageCode: plan?.guidancePackageCode ?? "",
        packagePaid,
        track: plan?.examGroup ?? "",
      },
    } as CounselorStudentListItem & {
      _meta: {
        neverStarted: boolean;
        inactive: boolean;
        completed: boolean;
        active: boolean;
        packageCode: string;
        packagePaid: boolean;
        track: string;
      };
    };
  });

  const filtered = items.filter((raw) => {
    const item = raw as CounselorStudentListItem & {
      _meta: {
        neverStarted: boolean;
        inactive: boolean;
        completed: boolean;
        active: boolean;
        packageCode: string;
        packagePaid: boolean;
        track: string;
      };
    };
    if (options?.activity === "never" && !item._meta.neverStarted) return false;
    if (options?.activity === "inactive" && !item._meta.inactive) return false;
    if (options?.activity === "active" && !item._meta.active) return false;
    if (options?.activity === "completed" && !item._meta.completed) return false;
    if (options?.activity === "followup" && !item.needsFollowUp) return false;
    if (options?.step && String(item.currentStep ?? "") !== options.step) return false;
    if (options?.package && item._meta.packageCode !== options.package) return false;
    if (options?.track && item._meta.track !== options.track) return false;
    if (options?.finance === "holland" && !item.hollandPaid) return false;
    if (options?.finance === "guidance" && !item._meta.packagePaid) return false;
    if (options?.finance === "unpaid" && (item._meta.packagePaid || item.hollandPaid)) return false;
    if (options?.finance === "none" && (item._meta.packagePaid || item.hollandPaid)) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE).map((item) => {
    const { _meta: _ignored, ...rest } = item as CounselorStudentListItem & { _meta?: unknown };
    void _ignored;
    return rest;
  });

  return { items: pageItems, total, page, pageSize: PAGE_SIZE };
}

export type { CounselorStudentCase };

export async function loadCounselorStudentCase(
  ctx: CounselorContext,
  studentId: string,
): Promise<CounselorStudentCase> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });

  const student = await prisma.student.findFirst({
    where: {
      organizationId: ctx.organizationId,
      id: studentId,
      deletedAt: null,
    },
    include: {
      grade: { select: { name: true } },
      major: { select: { name: true } },
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: {
          createdAt: true,
          user: { select: { mobile: true, id: true, lastLoginAt: true, createdAt: true } },
        },
      },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!student) {
    throw new Error("دانش‌آموز یافت نشد.");
  }

  const link = student.portalAccountLinks[0];
  const planRow = student.guidancePlans[0];
  const dossier = await loadCounselorV2Dossier({
    organizationId: ctx.organizationId,
    studentId,
  });

  const [nextAppt, lastSession, pendingFollowUps, assignment] = await Promise.all([
    prisma.counselorAppointment.findFirst({
      where: {
        organizationId: ctx.organizationId,
        studentId,
        status: { in: ["BOOKED", "CONFIRMED"] },
        bookingReservation: {
          slot: { startsAt: { gte: new Date() } },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      },
      include: {
        bookingReservation: { include: { slot: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.counselingSessionRecord.findFirst({
      where: {
        organizationId: ctx.organizationId,
        studentId,
        status: "COMPLETED",
      },
      orderBy: { endedAt: "desc" },
      select: { summary: true, subject: true, endedAt: true },
    }),
    prisma.counselorFollowUp.count({
      where: {
        organizationId: ctx.organizationId,
        studentId,
        status: CounselorFollowUpStatus.PENDING,
        ...(ctx.isSupervisor ? {} : { counselorUserId: ctx.userId }),
      },
    }),
    loadStudentAssignment({
      organizationId: ctx.organizationId,
      studentId,
    }),
  ]);

  const activity = lastActivityAt({
    lastLoginAt: link?.user.lastLoginAt ?? null,
    planUpdatedAt: planRow?.updatedAt ?? null,
    studentUpdatedAt: student.updatedAt,
  });
  const neverStarted = !planRow || dossier.completionPercentage === 0;
  const completed = dossier.completionPercentage >= 100;
  const stale =
    !completed && activity < new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const studentStatusLabel = completed
    ? "تکمیل‌شده"
    : neverStarted
      ? "ثبت‌شده، بدون فعالیت مسیر"
      : stale
        ? "غیرفعال / نیازمند پیگیری"
        : "فعال";

  const lastCompleted = [...dossier.steps]
    .reverse()
    .find((step) => step.status === "completed");

  const alerts: string[] = [];
  if (neverStarted) alerts.push("دانش‌آموز هنوز مسیر ۱۸ مرحله‌ای را شروع نکرده است.");
  if (dossier.finance.packagePaid && dossier.completionPercentage < 20) {
    alerts.push("بسته پرداخت شده ولی مسیر جلو نرفته است.");
  }
  if (pendingFollowUps > 0) alerts.push(`${pendingFollowUps} پیگیری باز`);
  if (dossier.documents.some((d) => d.verification === "در انتظار بررسی")) {
    alerts.push("مدرک در انتظار بررسی مشاور است.");
  }

  return {
    studentId,
    studentName: student.fullName,
    mobile: link?.user.mobile ?? null,
    gradeName: student.grade.name,
    schoolName: dossier.personal["مدرسه"] || null,
    examGroup: planRow?.examGroup ?? null,
    examGroupLabel: dossier.examGroupLabel ?? student.major?.name ?? null,
    province: dossier.personal["استان بومی"] || null,
    registeredLabel: formatJalaliDateTimeShort(student.createdAt),
    firstLoginLabel: null,
    lastActivityLabel: formatJalaliDateTimeShort(activity),
    planPublicId: dossier.planPublicId,
    currentStep: dossier.currentStep,
    currentStepTitle: dossier.currentStepTitle,
    lastCompletedStepTitle: lastCompleted?.title ?? null,
    completionPercentage: dossier.completionPercentage,
    studentStatusLabel,
    packageLabel: dossier.finance.packageTitle,
    packagePaid: dossier.finance.packagePaid,
    journeySteps: dossier.steps,
    preferencesSummary: {
      majors: dossier.majors.slice(0, 8),
      cities: dossier.provinces.slice(0, 8),
      educationTypes: dossier.educationTypes,
      priorityFactors: dossier.priorities.join(" > ") || null,
    },
    nextAppointment: nextAppt
      ? {
          id: nextAppt.id,
          label: formatJalaliDateTimeShort(nextAppt.bookingReservation.slot.startsAt),
          status: nextAppt.status,
        }
      : null,
    lastSessionSummary: lastSession?.summary ?? lastSession?.subject ?? null,
    pendingFollowUps,
    alerts,
    assignedCounselor: assignment,
  };
}

export async function loadCounselorCaseBundle(ctx: CounselorContext, studentId: string) {
  const caseModel = await loadCounselorStudentCase(ctx, studentId);
  const dossier = await loadCounselorV2Dossier({
    organizationId: ctx.organizationId,
    studentId,
  });
  return { caseModel, dossier };
}
