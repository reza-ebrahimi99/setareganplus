/**
 * Counselor dashboard buckets — fed from GuidanceStepReview + plan flags (V2).
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import {
  guidanceV2StudentWhere,
  resolveAccessibleStudentFilter,
  studentIdFilter,
} from "@/lib/counselor-os/auth";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import { normalizeV2ReviewStatus } from "@/lib/guidance/journey-v2/step-review/status";
import { parseNeedsReviewFlags } from "@/lib/guidance/journey-v2/step-review/plan-json";
import { GuidanceStepReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export type {
  ReviewWorkBucketId,
  ReviewWorkQueueItem,
  ReviewWorkQueueModel,
} from "@/lib/counselor-os/review-work-queue-types";
export { REVIEW_BUCKET_LABELS } from "@/lib/counselor-os/review-work-queue-types";
import type {
  ReviewWorkBucketId,
  ReviewWorkQueueItem,
  ReviewWorkQueueModel,
} from "@/lib/counselor-os/review-work-queue-types";
import { REVIEW_BUCKET_LABELS } from "@/lib/counselor-os/review-work-queue-types";

function href(studentId: string, step: number): string {
  const base = `/admin/counselor/students/${studentId}`;
  return `${base}?tab=journey&step=${step}`;
}

function emptyBuckets(): Record<ReviewWorkBucketId, ReviewWorkQueueItem[]> {
  return {
    resubmitted: [],
    revision_pending: [],
    unreviewed: [],
    holland_retake: [],
    downstream_needs_review: [],
  };
}

export async function loadCounselorReviewWorkQueue(
  ctx: CounselorContext,
): Promise<ReviewWorkQueueModel> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const access = studentIdFilter(filter);

  const students = await prisma.student.findMany({
    where: { ...guidanceV2StudentWhere(ctx.organizationId), ...access },
    select: {
      id: true,
      fullName: true,
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        take: 1,
        select: {
          id: true,
          currentStep: true,
          completedSteps: true,
          v2HollandRetakePending: true,
          v2StepNeedsReviewFlags: true,
        },
      },
    },
    take: 800,
  });

  const planByStudent = new Map(
    students
      .filter((s) => s.guidancePlans[0])
      .map((s) => [s.id, { studentId: s.id, plan: s.guidancePlans[0]!, name: s.fullName }]),
  );
  const planIds = [...planByStudent.values()].map((v) => v.plan.id);
  if (planIds.length === 0) {
    const buckets = emptyBuckets();
    return {
      buckets,
      counts: Object.fromEntries(
        (Object.keys(buckets) as ReviewWorkBucketId[]).map((k) => [k, 0]),
      ) as Record<ReviewWorkBucketId, number>,
      labels: REVIEW_BUCKET_LABELS,
    };
  }

  const reviews = await prisma.guidanceStepReview.findMany({
    where: {
      organizationId: ctx.organizationId,
      planId: { in: planIds },
    },
    select: {
      planId: true,
      stepNumber: true,
      status: true,
      updatedAt: true,
      revisionRequestedAt: true,
      resubmittedAt: true,
    },
  });

  const studentByPlan = new Map<string, { studentId: string; name: string; plan: (typeof students)[0]["guidancePlans"][0] }>();
  for (const [studentId, v] of planByStudent) {
    studentByPlan.set(v.plan.id, { studentId: v.studentId, name: v.name, plan: v.plan });
  }

  const buckets = emptyBuckets();

  for (const r of reviews) {
    const meta = studentByPlan.get(r.planId);
    if (!meta) continue;
    const status = normalizeV2ReviewStatus(r.status);
    const since = r.resubmittedAt ?? r.revisionRequestedAt ?? r.updatedAt;
    const item: ReviewWorkQueueItem = {
      bucket: "unreviewed",
      studentId: meta.studentId,
      studentName: meta.name,
      stepNumber: r.stepNumber,
      stepTitle: counselorV2StepTitle(r.stepNumber),
      statusLabel: status,
      lastActionLabel: status,
      waitingSinceLabel: formatJalaliDateTimeShort(since),
      href: href(meta.studentId, r.stepNumber),
    };

    if (status === "RESUBMITTED") {
      item.bucket = "resubmitted";
      buckets.resubmitted.push(item);
    } else if (status === "REVISION_REQUESTED") {
      item.bucket = "revision_pending";
      buckets.revision_pending.push(item);
    } else if (status === "UNREVIEWED") {
      const completed = Array.isArray(meta.plan.completedSteps)
        ? (meta.plan.completedSteps as number[]).includes(r.stepNumber)
        : false;
      if (completed || r.stepNumber < meta.plan.currentStep) {
        buckets.unreviewed.push(item);
      }
    }
  }

  for (const [, meta] of planByStudent) {
    if (meta.plan.v2HollandRetakePending) {
      buckets.holland_retake.push({
        bucket: "holland_retake",
        studentId: meta.studentId,
        studentName: meta.name,
        stepNumber: 4,
        stepTitle: counselorV2StepTitle(4),
        statusLabel: "در انتظار آزمون مجدد",
        lastActionLabel: "Holland retake",
        waitingSinceLabel: "—",
        href: href(meta.studentId, 4),
      });
    }
    const flags = parseNeedsReviewFlags(meta.plan.v2StepNeedsReviewFlags);
    for (const [stepKey] of Object.entries(flags)) {
      const stepNum = Number(stepKey);
      if (!Number.isInteger(stepNum)) continue;
      buckets.downstream_needs_review.push({
        bucket: "downstream_needs_review",
        studentId: meta.studentId,
        studentName: meta.name,
        stepNumber: stepNum,
        stepTitle: counselorV2StepTitle(stepNum),
        statusLabel: "نیازمند بازبینی",
        lastActionLabel: "اثر upstream",
        waitingSinceLabel: "—",
        href: href(meta.studentId, stepNum),
      });
    }
  }

  const counts = Object.fromEntries(
    (Object.keys(buckets) as ReviewWorkBucketId[]).map((k) => [k, buckets[k].length]),
  ) as Record<ReviewWorkBucketId, number>;

  return { buckets, counts, labels: REVIEW_BUCKET_LABELS };
}
