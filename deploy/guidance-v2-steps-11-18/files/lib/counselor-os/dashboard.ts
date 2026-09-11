/**
 * Counselor OS — operational dashboard from real aggregates.
 */

import {
  BookingStatus,
  CounselorFollowUpStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import {
  guidanceV2StudentWhere,
  resolveAccessibleStudentFilter,
  studentIdFilter,
} from "@/lib/counselor-os/auth";
import { describeCapacity } from "@/lib/counselor-os/profiles";
import {
  COUNSELOR_REVENUE_ATTRIBUTION_NOTE,
  loadCounselorPackageRevenue,
  loadCounselorPackageRevenueByCounselor,
} from "@/lib/counselor-os/revenue";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import { formatTomanFromRials } from "@/lib/counselor-os/labels";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

const STALE_DAYS = 14;

export type CounselorDashboardModel = {
  greetingName: string;
  viewingAsCounselor: boolean;
  revenueNote: string;
  capacity: {
    ratioLabel: string;
    remainingLabel: string;
    activeAssigned: number;
    unlimited: boolean;
  } | null;
  revenue: {
    monthLabel: string;
    totalLabel: string;
    successfulPaymentCount: number;
    payingStudentCount: number;
  };
  stats: {
    totalStudents: number;
    needsFollowUp: number;
    noActivity: number;
    todaySessions: number;
    upcomingBookings: number;
    overdueFollowUps: number;
    incompleteCases: number;
    paidStudents: number;
  };
  workQueue: Array<{
    studentId: string;
    studentName: string;
    reason: string;
    href: string;
  }>;
  todaySessions: Array<{
    id: string;
    studentName: string;
    studentId: string;
    whenLabel: string;
    status: string;
  }>;
  todayFollowUps: Array<{
    id: string;
    title: string;
    studentName: string;
    studentId: string;
    dueLabel: string;
    priority: string;
  }>;
  recentActivity: Array<{
    id: string;
    label: string;
    whenLabel: string;
    href: string;
  }>;
};

function firstName(full: string): string {
  const part = full.trim().split(/\s+/)[0];
  return part || full;
}

function isHollandBlob(row: { idempotencyKey: string; description: string | null; payableType: string }) {
  const blob = `${row.idempotencyKey} ${row.description ?? ""} ${row.payableType}`.toLowerCase();
  return blob.includes("holland") || blob.includes("رغبت");
}

export async function loadCounselorDashboard(
  ctx: CounselorContext,
): Promise<CounselorDashboardModel> {
  const jalali = utcToJalaliInTehran(new Date());
  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const access = studentIdFilter(filter);
  const appointmentStudentFilter =
    filter === "all-org" ? {} : { studentId: { in: filter.studentId?.in ?? [] } };
  const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const students = await prisma.student.findMany({
    where: {
      ...guidanceV2StudentWhere(ctx.organizationId),
      ...access,
    },
    select: {
      id: true,
      fullName: true,
      createdAt: true,
      updatedAt: true,
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: { user: { select: { lastLoginAt: true } } },
      },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          currentStep: true,
          completionPercentage: true,
          packagePaidAt: true,
          updatedAt: true,
          v2SanjeshStatus: true,
        },
      },
    },
    take: 800,
  });

  const studentIds = students.map((s) => s.id);
  const planIds = students.map((s) => s.guidancePlans[0]?.id).filter(Boolean) as string[];

  const [
    todayAppts,
    upcomingCount,
    overdueFollowUps,
    todayFollowUps,
    pendingDocs,
    paidIntents,
    recentPlans,
    recentDocs,
  ] = await Promise.all([
    prisma.counselorAppointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: ctx.userId,
        ...appointmentStudentFilter,
        bookingReservation: {
          slot: { startsAt: { gte: startUtc, lt: endUtc } },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      },
      include: {
        student: { select: { fullName: true, id: true } },
        bookingReservation: { include: { slot: true } },
      },
      orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
    }),
    prisma.counselorAppointment.count({
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: ctx.userId,
        status: { in: ["BOOKED", "CONFIRMED"] },
        bookingReservation: {
          slot: { startsAt: { gte: new Date() } },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        ...appointmentStudentFilter,
      },
    }),
    prisma.counselorFollowUp.count({
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: ctx.userId,
        status: CounselorFollowUpStatus.PENDING,
        dueAt: { lt: new Date() },
        ...appointmentStudentFilter,
      },
    }),
    prisma.counselorFollowUp.findMany({
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: ctx.userId,
        status: CounselorFollowUpStatus.PENDING,
        dueAt: { gte: startUtc, lt: endUtc },
        ...appointmentStudentFilter,
      },
      include: { student: { select: { fullName: true, id: true } } },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    prisma.guidanceDocument.count({
      where: {
        organizationId: ctx.organizationId,
        isLatest: true,
        deletedAt: null,
        verificationStatus: "PENDING",
        ...(planIds.length ? { planId: { in: planIds } } : { planId: { in: [] } }),
      },
    }),
    prisma.paymentIntent.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: PaymentStatus.PAID,
        payableId: { in: [...planIds, ...studentIds] },
      },
      select: {
        payableId: true,
        paidAt: true,
        payableType: true,
        idempotencyKey: true,
        description: true,
      },
      take: 400,
    }),
    prisma.guidancePlan.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        journeyVersion: 2,
        ...(filter === "all-org" ? {} : { studentId: { in: filter.studentId?.in ?? [] } }),
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        studentId: true,
        createdAt: true,
        student: { select: { fullName: true } },
      },
    }),
    prisma.guidanceDocument.findMany({
      where: {
        organizationId: ctx.organizationId,
        isLatest: true,
        deletedAt: null,
        ...(planIds.length ? { planId: { in: planIds } } : { id: { in: [] } }),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        plan: { select: { studentId: true, student: { select: { fullName: true } } } },
      },
    }),
  ]);

  let noActivity = 0;
  let incomplete = 0;
  let paidStudents = 0;
  const workQueue: CounselorDashboardModel["workQueue"] = [];

  for (const s of students) {
    const plan = s.guidancePlans[0];
    const lastLogin = s.portalAccountLinks[0]?.user.lastLoginAt ?? null;
    const neverStarted = !plan || (plan.currentStep <= 1 && plan.completionPercentage === 0);
    const completed = (plan?.completionPercentage ?? 0) >= 100;
    const stale = (lastLogin ?? s.updatedAt) < staleBefore;
    if (neverStarted) noActivity += 1;
    if (plan && !completed) incomplete += 1;
    const paid = Boolean(plan?.packagePaidAt) || paidIntents.some((p) => p.payableId === plan?.id || p.payableId === s.id);
    if (paid) paidStudents += 1;

    if (neverStarted) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "ثبت‌شده، بدون پیشرفت مسیر",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (plan?.packagePaidAt && plan.currentStep === 11) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "در انتظار رزرو جلسه اول",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (plan?.currentStep === 12) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "نتیجه کنکور در انتظار تکمیل / بررسی",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (plan?.currentStep === 13) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "در انتظار چیدمان مشاور",
        href: `/admin/counselor/students/${s.id}/choices?phase=initial`,
      });
    } else if (plan?.currentStep === 14) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "در انتظار بررسی دانش‌آموز",
        href: `/admin/counselor/students/${s.id}/choices?phase=review`,
      });
    } else if (plan?.currentStep === 15) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "جلسه دوم در انتظار رزرو",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (plan?.currentStep === 16) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "نیازمند اصلاحات نهایی مشاور",
        href: `/admin/counselor/students/${s.id}/choices?phase=final`,
      });
    } else if (plan?.currentStep === 17) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "در انتظار تأیید آگاهانه دانش‌آموز",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (
      plan?.currentStep === 18 &&
      (plan.v2SanjeshStatus === "PENDING_REVIEW" || plan.v2SanjeshStatus === "DECLARED")
    ) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "بررسی رسید سنجش",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (plan?.packagePaidAt && plan.currentStep <= 10) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: "پرداخت بسته انجام شده — نیازمند اقدام مشاور",
        href: `/admin/counselor/students/${s.id}`,
      });
    } else if (!completed && stale) {
      workQueue.push({
        studentId: s.id,
        studentName: s.fullName,
        reason: `غیرفعال بیش از ${STALE_DAYS} روز`,
        href: `/admin/counselor/students/${s.id}`,
      });
    }
  }

  if (pendingDocs > 0) {
    workQueue.unshift({
      studentId: "",
      studentName: `${pendingDocs} مدرک`,
      reason: "مدارک بارگذاری‌شده در انتظار بررسی",
      href: "/admin/counselor/students?activity=followup",
    });
  }

  const recentActivity: CounselorDashboardModel["recentActivity"] = [
    ...recentPlans.map((p) => ({
      id: `reg-${p.studentId}`,
      label: `ثبت مسیر: ${p.student.fullName}`,
      whenLabel: formatJalaliDateTimeShort(p.createdAt),
      href: `/admin/counselor/students/${p.studentId}`,
    })),
    ...paidIntents
      .filter((p) => p.paidAt)
      .slice(0, 5)
      .map((p) => ({
        id: `pay-${p.payableId}-${p.paidAt?.toISOString() ?? ""}`,
        label: isHollandBlob(p) ? "پرداخت رغبت‌سنجی" : "پرداخت بسته انتخاب رشته",
        whenLabel: p.paidAt ? formatJalaliDateTimeShort(p.paidAt) : "—",
        href: "/admin/counselor/students",
      })),
    ...recentDocs.map((d) => ({
      id: `doc-${d.id}`,
      label: `مدرک جدید: ${d.plan.student.fullName}`,
      whenLabel: formatJalaliDateTimeShort(d.createdAt),
      href: `/admin/counselor/students/${d.plan.studentId}`,
    })),
  ].slice(0, 10);

  const [advisor, ownRevenue, counselorIds] = await Promise.all([
    ctx.viewingAsCounselor
      ? prisma.bookingAdvisor.findFirst({
          where: {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            deletedAt: null,
          },
          select: { capacity: true },
        })
      : Promise.resolve(null),
    loadCounselorPackageRevenue({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
    }),
    ctx.isSupervisor
      ? prisma.organizationMembership.findMany({
          where: {
            organizationId: ctx.organizationId,
            deletedAt: null,
            role: "ADVISOR",
          },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ]);

  const supervisorRevenue = ctx.isSupervisor
    ? await loadCounselorPackageRevenueByCounselor({
        organizationId: ctx.organizationId,
        counselorUserIds: counselorIds.map((row) => row.userId),
      })
    : null;

  let revenue = ownRevenue;
  if (supervisorRevenue) {
    let totalRials = 0;
    let monthRials = 0;
    let successfulPaymentCount = 0;
    let payingStudentCount = 0;
    for (const row of supervisorRevenue.values()) {
      totalRials += row.totalRials;
      monthRials += row.monthRials;
      successfulPaymentCount += row.successfulPaymentCount;
      payingStudentCount += row.payingStudentCount;
    }
    revenue = {
      totalRials,
      monthRials,
      successfulPaymentCount,
      payingStudentCount,
      totalTomanLabel: formatTomanFromRials(totalRials),
      monthTomanLabel: formatTomanFromRials(monthRials),
    };
  }

  const capacity = ctx.viewingAsCounselor
    ? describeCapacity({
        capacity: advisor?.capacity ?? null,
        activeAssigned: students.length,
      })
    : null;

  return {
    greetingName: firstName(ctx.displayName),
    viewingAsCounselor: ctx.viewingAsCounselor,
    revenueNote: COUNSELOR_REVENUE_ATTRIBUTION_NOTE,
    capacity,
    revenue: {
      monthLabel: revenue.monthTomanLabel,
      totalLabel: revenue.totalTomanLabel,
      successfulPaymentCount: revenue.successfulPaymentCount,
      payingStudentCount: revenue.payingStudentCount,
    },
    stats: {
      totalStudents: students.length,
      needsFollowUp: workQueue.filter((w) => w.studentId).length + overdueFollowUps,
      noActivity,
      todaySessions: todayAppts.length,
      upcomingBookings: upcomingCount,
      overdueFollowUps,
      incompleteCases: incomplete,
      paidStudents,
    },
    workQueue: workQueue.slice(0, 12),
    todaySessions: todayAppts.map((a) => ({
      id: a.id,
      studentName: a.student.fullName,
      studentId: a.student.id,
      whenLabel: formatJalaliDateTimeShort(a.bookingReservation.slot.startsAt),
      status: a.status,
    })),
    todayFollowUps: todayFollowUps.map((f) => ({
      id: f.id,
      title: f.title,
      studentName: f.student.fullName,
      studentId: f.student.id,
      dueLabel: formatJalaliDateTimeShort(f.dueAt),
      priority: f.priority,
    })),
    recentActivity,
  };
}

export function counselorStepLabel(step: number | null) {
  return step ? counselorV2StepTitle(step) : "شروع نشده";
}
