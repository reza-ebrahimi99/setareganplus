/**
 * Counselor work queue — buckets, priority, filters (steps 11–18 aware).
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import {
  guidanceV2StudentWhere,
  resolveAccessibleStudentFilter,
  studentIdFilter,
} from "@/lib/counselor-os/auth";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import {
  bucketForWorkItem,
  scoreWorkQueuePriority,
  WORK_QUEUE_BUCKET_LABELS,
  type WorkQueueBucketId,
} from "@/lib/counselor-os/work-queue-priority";
import { prisma } from "@/lib/prisma";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { BookingStatus, CounselorAppointmentStatus } from "@/generated/prisma/enums";

const STALE_DAYS = 14;

export type WorkQueueItem = {
  studentId: string;
  studentName: string;
  mobile: string | null;
  examGroupLabel: string | null;
  quota: string | null;
  currentStep: number;
  currentStepTitle: string;
  actionLabel: string;
  href: string;
  bucket: WorkQueueBucketId;
  priorityScore: number;
  waitingDays: number;
  counselorName: string | null;
  blockerHint: string | null;
  sessionToday: boolean;
};

export type WorkQueueModel = {
  buckets: Record<WorkQueueBucketId, WorkQueueItem[]>;
  counts: Record<WorkQueueBucketId, number>;
  all: WorkQueueItem[];
  bucketLabels: typeof WORK_QUEUE_BUCKET_LABELS;
};

function stepActionLabel(step: number): string {
  switch (step) {
    case 11:
      return "رزرو یا پیگیری جلسه اول";
    case 12:
      return "بررسی و تأیید نتایج کنکور";
    case 13:
      return "چیدمان اولیه";
    case 14:
      return "منتظر بازخورد دانش‌آموز";
    case 15:
      return "رزرو یا پیگیری جلسه دوم";
    case 16:
      return "اصلاح و فهرست نهایی";
    case 17:
      return "منتظر تأیید آگاهانه";
    case 18:
      return "ثبت / بررسی سنجش";
    default:
      return "پیگیری پرونده";
  }
}

function hrefForStep(studentId: string, step: number): string {
  const base = `/admin/counselor/students/${studentId}`;
  if (step === 13) return `${base}/choices?phase=initial`;
  if (step === 14) return `${base}/choices?phase=review`;
  if (step === 16 || step === 17) return `${base}/choices?phase=final`;
  if (step === 18) return `${base}/choices?phase=sanjesh`;
  if (step === 12) return `${base}#konkur`;
  return base;
}

function emptyBuckets(): Record<WorkQueueBucketId, WorkQueueItem[]> {
  return {
    urgent: [],
    today: [],
    overdue: [],
    waiting_me: [],
    waiting_student: [],
    sessions_today: [],
    incomplete_arrangement: [],
    returned_reviews: [],
    ready_finalize: [],
    ready_sanjesh: [],
    recently_done: [],
  };
}

export async function loadCounselorWorkQueue(
  ctx: CounselorContext,
): Promise<WorkQueueModel> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const access = studentIdFilter(filter);
  const jalali = utcToJalaliInTehran(new Date());
  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);
  const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const students = await prisma.student.findMany({
    where: {
      ...guidanceV2StudentWhere(ctx.organizationId),
      ...access,
    },
    select: {
      id: true,
      fullName: true,
      updatedAt: true,
      portalAccountLinks: {
        where: { deletedAt: null, isActive: true },
        take: 1,
        select: {
          user: { select: { lastLoginAt: true, mobile: true } },
        },
      },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          currentStep: true,
          completionPercentage: true,
          packagePaidAt: true,
          v2SanjeshStatus: true,
          v2NeedsReviewAt: true,
          examGroup: true,
          quota: true,
        },
      },
      counselorStudentAssignments: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          counselor: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 800,
  });

  const studentIds = students.map((s) => s.id);
  const todayAppointments =
    studentIds.length === 0
      ? []
      : await prisma.counselorAppointment.findMany({
          where: {
            organizationId: ctx.organizationId,
            studentId: { in: studentIds },
            status: {
              in: [
                CounselorAppointmentStatus.BOOKED,
                CounselorAppointmentStatus.CONFIRMED,
              ],
            },
            bookingReservation: {
              slot: { startsAt: { gte: startUtc, lt: endUtc } },
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            },
          },
          select: { studentId: true },
        });

  const sessionTodaySet = new Set(todayAppointments.map((a) => a.studentId));

  const items: WorkQueueItem[] = [];

  for (const s of students) {
    const plan = s.guidancePlans[0];
    if (!plan) continue;
    const step = plan.currentStep;
    if (step < 10 && !plan.packagePaidAt) continue;

    const portalUser = s.portalAccountLinks[0]?.user;
    const lastActivity = portalUser?.lastLoginAt ?? s.updatedAt;
    const mobile = portalUser?.mobile ?? null;
    const waitingDays = Math.floor(
      (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000),
    );
    const staleDays = lastActivity < staleBefore ? STALE_DAYS : waitingDays;
    const needsReview = Boolean(plan.v2NeedsReviewAt);
    const waitingCounselorStep = [12, 13, 16, 18].includes(step);
    const sessionToday = sessionTodaySet.has(s.id);

    const priorityInput = {
      currentStep: step,
      completionPercentage: plan.completionPercentage,
      packagePaid: Boolean(plan.packagePaidAt),
      v2SanjeshStatus: plan.v2SanjeshStatus,
      needsReview,
      staleDays,
      sessionToday,
      sessionOverdue: staleDays >= 14 && step >= 11 && plan.completionPercentage < 100,
      waitingCounselorStep,
    };

    const bucket = bucketForWorkItem(priorityInput);
    const counselor = s.counselorStudentAssignments[0]?.counselor;
    const counselorName = counselor
      ? `${counselor.firstName} ${counselor.lastName}`.trim()
      : null;

    items.push({
      studentId: s.id,
      studentName: s.fullName,
      mobile,
      examGroupLabel: plan.examGroup,
      quota: plan.quota,
      currentStep: step,
      currentStepTitle: counselorV2StepTitle(step),
      actionLabel: stepActionLabel(step),
      href: hrefForStep(s.id, step),
      bucket,
      priorityScore: scoreWorkQueuePriority(priorityInput),
      waitingDays,
      counselorName,
      blockerHint: needsReview ? "نیازمند بازبینی مشاور" : null,
      sessionToday,
    });
  }

  items.sort((a, b) => a.priorityScore - b.priorityScore);

  const buckets = emptyBuckets();
  for (const item of items) {
    buckets[item.bucket].push(item);
  }

  const counts = Object.fromEntries(
    (Object.keys(buckets) as WorkQueueBucketId[]).map((k) => [
      k,
      buckets[k].length,
    ]),
  ) as Record<WorkQueueBucketId, number>;

  return {
    buckets,
    counts,
    all: items,
    bucketLabels: WORK_QUEUE_BUCKET_LABELS,
  };
}

export function filterWorkQueueItems(
  items: WorkQueueItem[],
  params: {
    q?: string;
    step?: number;
    bucket?: WorkQueueBucketId;
  },
): WorkQueueItem[] {
  let out = items;
  if (params.bucket) {
    out = out.filter((i) => i.bucket === params.bucket);
  }
  if (params.step != null && Number.isFinite(params.step)) {
    out = out.filter((i) => i.currentStep === params.step);
  }
  const q = params.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    out = out.filter(
      (i) =>
        i.studentName.includes(q) ||
        (digits.length >= 4 && (i.mobile ?? "").includes(digits)),
    );
  }
  return out;
}
