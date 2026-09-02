/**
 * Counselor OS — student list + case loader.
 */

import {
  BookingStatus,
  CounselorFollowUpStatus,
} from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  resolveAccessibleStudentFilter,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { GUIDANCE_JOURNEY_STEPS } from "@/lib/guidance/journey/steps";
import { guidanceJourneyStepStatus } from "@/lib/guidance/journey/state";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export type CounselorStudentListItem = {
  studentId: string;
  studentName: string;
  mobile: string | null;
  planPublicId: string | null;
  currentStep: number | null;
  currentStepTitle: string | null;
  completionPercentage: number | null;
  nextAppointmentLabel: string | null;
  followUpPending: number;
};

export async function listCounselorStudents(
  ctx: CounselorContext,
  options?: { q?: string },
): Promise<CounselorStudentListItem[]> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
  });

  const q = options?.q?.trim();
  const studentWhere =
    filter === "all-guidance"
      ? { guidancePlans: { some: { deletedAt: null } } }
      : { id: { in: filter.studentId?.in ?? [] } };

  const students = await prisma.student.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...studentWhere,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: "asc" },
    take: 100,
    select: {
      id: true,
      fullName: true,
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: { user: { select: { mobile: true } } },
      },
      guidancePlans: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          publicId: true,
          currentStep: true,
          completionPercentage: true,
          userId: true,
        },
      },
    },
  });

  const studentIds = students.map((s) => s.id);
  const [appointments, followUps] = await Promise.all([
    prisma.counselorAppointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        studentId: { in: studentIds },
        status: { in: ["BOOKED", "CONFIRMED"] },
      },
      include: {
        bookingReservation: {
          include: { slot: { select: { startsAt: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.counselorFollowUp.groupBy({
      by: ["studentId"],
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: ctx.userId,
        status: CounselorFollowUpStatus.PENDING,
        studentId: { in: studentIds },
      },
      _count: { _all: true },
    }),
  ]);

  const apptByStudent = new Map<string, string>();
  for (const a of appointments) {
    if (!apptByStudent.has(a.studentId) && a.bookingReservation.slot.startsAt) {
      apptByStudent.set(
        a.studentId,
        formatJalaliDateTimeShort(a.bookingReservation.slot.startsAt),
      );
    }
  }
  const followUpByStudent = new Map(
    followUps.map((f) => [f.studentId, f._count._all]),
  );

  return students.map((s) => {
    const plan = s.guidancePlans[0];
    const stepDef = plan
      ? GUIDANCE_JOURNEY_STEPS.find((st) => st.id === plan.currentStep)
      : null;
    return {
      studentId: s.id,
      studentName: s.fullName,
      mobile: s.portalAccountLinks[0]?.user.mobile ?? null,
      planPublicId: plan?.publicId ?? null,
      currentStep: plan?.currentStep ?? null,
      currentStepTitle: stepDef?.title ?? null,
      completionPercentage: plan?.completionPercentage ?? null,
      nextAppointmentLabel: apptByStudent.get(s.id) ?? null,
      followUpPending: followUpByStudent.get(s.id) ?? 0,
    };
  });
}

export type CounselorStudentCase = {
  studentId: string;
  studentName: string;
  mobile: string | null;
  gradeName: string | null;
  examGroup: string | null;
  planPublicId: string | null;
  currentStep: number | null;
  currentStepTitle: string | null;
  completionPercentage: number | null;
  packageLabel: string | null;
  packagePaid: boolean;
  journeySteps: Array<{
    id: number;
    title: string;
    status: "completed" | "active" | "locked";
  }>;
  preferencesSummary: {
    majors: string[];
    cities: string[];
    educationTypes: string[];
    priorityFactors: string | null;
  };
  nextAppointment: {
    id: string;
    label: string;
    status: string;
  } | null;
  lastSessionSummary: string | null;
  pendingFollowUps: number;
  alerts: string[];
};

export async function loadCounselorStudentCase(
  ctx: CounselorContext,
  studentId: string,
): Promise<CounselorStudentCase> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const student = await prisma.student.findFirst({
    where: {
      organizationId: ctx.organizationId,
      id: studentId,
      deletedAt: null,
    },
    include: {
      grade: { select: { name: true } },
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: { user: { select: { mobile: true, id: true } } },
      },
      guidancePlans: {
        where: { deletedAt: null },
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
  let plan = null;
  if (planRow && link?.user.id) {
    plan = await loadGuidanceJourneyPlan({
      organizationId: ctx.organizationId,
      userId: link.user.id,
      studentId,
    });
  }

  const journeySteps = plan
    ? GUIDANCE_JOURNEY_STEPS.map((step) => ({
        id: step.id,
        title: step.title,
        status: guidanceJourneyStepStatus(step.id, plan!),
      }))
    : [];

  const [nextAppt, lastSession, pendingFollowUps, step8, step7, step6, step9] =
    await Promise.all([
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
          counselorUserId: ctx.userId,
          status: CounselorFollowUpStatus.PENDING,
        },
      }),
      plan
        ? import("@/lib/guidance/journey/step-store").then((m) =>
            m.loadGuidanceStepData({
              organizationId: ctx.organizationId,
              planPublicId: plan!.publicId,
              category: "guidance-journey-step8",
              kind: "guidance-journey-step8",
              validate: (d) => (d && typeof d === "object" ? d : null),
            }).then((r) => r.data),
          )
        : Promise.resolve(null),
      plan
        ? import("@/lib/guidance/journey/step-store").then((m) =>
            m.loadGuidanceStepData({
              organizationId: ctx.organizationId,
              planPublicId: plan!.publicId,
              category: "guidance-journey-step7",
              kind: "guidance-journey-step7",
              validate: (d) => (d && typeof d === "object" ? d : null),
            }).then((r) => r.data),
          )
        : Promise.resolve(null),
      plan
        ? import("@/lib/guidance/journey/step-store").then((m) =>
            m.loadGuidanceStepData({
              organizationId: ctx.organizationId,
              planPublicId: plan!.publicId,
              category: "guidance-journey-step6",
              kind: "guidance-journey-step6",
              validate: (d) => (d && typeof d === "object" ? d : null),
            }).then((r) => r.data),
          )
        : Promise.resolve(null),
      plan
        ? import("@/lib/guidance/journey/step-store").then((m) =>
            m.loadGuidanceStepData({
              organizationId: ctx.organizationId,
              planPublicId: plan!.publicId,
              category: "guidance-journey-step9",
              kind: "guidance-journey-step9",
              validate: (d) => (d && typeof d === "object" ? d : null),
            }).then((r) => r.data),
          )
        : Promise.resolve(null),
    ]);

  const majors: string[] = [];
  if (step8 && typeof step8 === "object" && step8 !== null) {
    const ranked = (step8 as { rankedMajors?: Array<{ title?: string }> })
      .rankedMajors;
    if (Array.isArray(ranked)) {
      for (const m of ranked.slice(0, 5)) {
        if (m?.title) majors.push(m.title);
      }
    }
  }

  const cities: string[] = [];
  if (step7 && typeof step7 === "object" && step7 !== null) {
    const preferred = (step7 as { preferredCities?: string[] }).preferredCities;
    if (Array.isArray(preferred)) cities.push(...preferred.slice(0, 5));
  }

  const educationTypes: string[] = [];
  if (step6 && typeof step6 === "object" && step6 !== null) {
    const types = (step6 as { preferredInstitutionTypes?: string[] })
      .preferredInstitutionTypes;
    if (Array.isArray(types)) educationTypes.push(...types.slice(0, 5));
  }

  let priorityFactors: string | null = null;
  if (step9 && typeof step9 === "object" && step9 !== null) {
    const weights = (step9 as { weights?: Record<string, number> }).weights;
    if (weights) {
      const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
      priorityFactors = sorted.map(([k]) => k).join(" > ");
    }
  }

  const alerts: string[] = [];
  if (plan && !plan.packagePaidAtIso) {
    alerts.push("بسته مشاوره هنوز فعال نشده است.");
  }
  if (pendingFollowUps > 0) {
    alerts.push(`${pendingFollowUps} پیگیری در انتظار`);
  }

  const stepDef = plan
    ? GUIDANCE_JOURNEY_STEPS.find((s) => s.id === plan.currentStep)
    : null;

  return {
    studentId,
    studentName: student.fullName,
    mobile: link?.user.mobile ?? null,
    gradeName: student.grade.name,
    examGroup: planRow?.examGroup ?? null,
    planPublicId: plan?.publicId ?? null,
    currentStep: plan?.currentStep ?? null,
    currentStepTitle: stepDef?.title ?? null,
    completionPercentage: plan?.completionPercentage ?? null,
    packageLabel: plan?.guidancePackageCode ?? null,
    packagePaid: Boolean(plan?.packagePaidAtIso),
    journeySteps,
    preferencesSummary: {
      majors,
      cities,
      educationTypes,
      priorityFactors,
    },
    nextAppointment: nextAppt
      ? {
          id: nextAppt.id,
          label: formatJalaliDateTimeShort(
            nextAppt.bookingReservation.slot.startsAt,
          ),
          status: nextAppt.status,
        }
      : null,
    lastSessionSummary:
      lastSession?.summary ?? lastSession?.subject ?? null,
    pendingFollowUps,
    alerts,
  };
}
