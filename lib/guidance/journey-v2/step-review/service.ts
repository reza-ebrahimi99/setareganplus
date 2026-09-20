/**
 * Guidance V2 — counselor review layer (18 steps). Does not gate student advance.
 */

import {
  AuditAction,
  GuidanceStepReviewEventKind,
  GuidanceStepReviewStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  GUIDANCE_V2_STEP_COUNT,
  isGuidanceV2StepId,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import {
  mergeNeedsReviewFlags,
  previewStepChangeImpact,
} from "@/lib/guidance/journey-v2/step-review/dependencies";
import {
  addOpenRevisionStep,
  parseNeedsReviewFlags,
  parseOpenRevisionSteps,
  removeOpenRevisionStep,
} from "@/lib/guidance/journey-v2/step-review/plan-json";
import {
  normalizeV2ReviewStatus,
  toPrismaReviewStatus,
  type V2ReviewStatus,
} from "@/lib/guidance/journey-v2/step-review/status";
import { notifyStudentPortal } from "@/lib/counselor-os/appointment-notify";
import { V2_REVIEW_STATUS_LABELS } from "@/lib/guidance/journey-v2/step-review/status";

export type ReviewMutationResult = { ok: true } | { ok: false; error: string };

async function loadV2Plan(params: {
  organizationId: string;
  planId?: string;
  studentId?: string;
}) {
  return prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      journeyVersion: 2,
      ...(params.planId ? { id: params.planId } : {}),
      ...(params.studentId ? { studentId: params.studentId } : {}),
    },
    select: {
      id: true,
      publicId: true,
      studentId: true,
      userId: true,
      currentStep: true,
      completedSteps: true,
      v2OpenRevisionSteps: true,
      v2StepNeedsReviewFlags: true,
      v2HollandRetakePending: true,
    },
  });
}

async function upsertReview(params: {
  organizationId: string;
  planId: string;
  stepNumber: number;
}) {
  return prisma.guidanceStepReview.upsert({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepNumber,
      },
    },
    create: {
      organizationId: params.organizationId,
      planId: params.planId,
      stepNumber: params.stepNumber,
      status: GuidanceStepReviewStatus.UNREVIEWED,
    },
    update: {},
  });
}

async function appendRevision(params: {
  organizationId: string;
  reviewId: string;
  actorType: string;
  actorUserId: string | null;
  action: string;
  reason?: string | null;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
}) {
  const last = await prisma.guidanceStepRevision.findFirst({
    where: { reviewId: params.reviewId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;
  await prisma.guidanceStepRevision.create({
    data: {
      organizationId: params.organizationId,
      reviewId: params.reviewId,
      version,
      actorType: params.actorType,
      actorUserId: params.actorUserId,
      action: params.action,
      reason: params.reason ?? null,
      beforeSnapshot: params.beforeSnapshot as object | undefined,
      afterSnapshot: params.afterSnapshot as object | undefined,
    },
  });
}

async function appendReviewEvent(params: {
  organizationId: string;
  reviewId: string;
  actorUserId: string;
  kind: GuidanceStepReviewEventKind;
  status: GuidanceStepReviewStatus;
  studentMessage?: string | null;
  rejectReason?: string | null;
  privateNote?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.guidanceStepReviewEvent.create({
    data: {
      organizationId: params.organizationId,
      reviewId: params.reviewId,
      actorUserId: params.actorUserId,
      kind: params.kind,
      status: params.status,
      studentMessage: params.studentMessage ?? null,
      rejectReason: params.rejectReason ?? null,
      privateNote: params.privateNote ?? null,
      metadata: params.metadata as object | undefined,
    },
  });
}

export async function touchStepReviewOnComplete(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceV2StepId;
}): Promise<void> {
  if (!isGuidanceV2StepId(params.stepNumber)) return;
  await upsertReview({
    organizationId: params.organizationId,
    planId: params.planId,
    stepNumber: params.stepNumber,
  });
}

export async function requestStepRevision(params: {
  organizationId: string;
  studentId: string;
  stepNumber: GuidanceV2StepId;
  counselorUserId: string;
  reason: string;
  studentMessage: string;
  requestedSections?: string[];
  retakeFromBeginning?: boolean;
  notifyStudent?: boolean;
}): Promise<ReviewMutationResult> {
  const reason = params.reason.trim();
  const studentMessage = params.studentMessage.trim();
  if (!reason || !studentMessage) {
    return { ok: false, error: "علت و پیام برای دانش‌آموز الزامی است." };
  }
  if (!isGuidanceV2StepId(params.stepNumber)) {
    return { ok: false, error: "شماره مرحله نامعتبر است." };
  }

  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false, error: "پرونده V2 یافت نشد." };

  const impact = previewStepChangeImpact(params.stepNumber);
  const openSteps = addOpenRevisionStep(
    parseOpenRevisionSteps(plan.v2OpenRevisionSteps),
    params.stepNumber,
  );
  const flags = mergeNeedsReviewFlags(
    parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags),
    impact.affectedSteps,
  );

  const now = new Date();
  const review = await upsertReview({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });

  await prisma.$transaction(async (tx) => {
    await tx.guidancePlan.update({
      where: { id: plan.id },
      data: {
        v2OpenRevisionSteps: openSteps,
        v2StepNeedsReviewFlags: flags,
        v2NeedsReviewAt: now,
        v2NeedsReviewStep: params.stepNumber,
      },
    });
    await tx.guidanceStepReview.update({
      where: { id: review.id },
      data: {
        status: GuidanceStepReviewStatus.REVISION_REQUESTED,
        rejectReason: reason,
        studentMessage,
        counselorUserId: params.counselorUserId,
        revisionRequestedAt: now,
        requestedSections: params.requestedSections ?? [],
        impactMetadata: impact,
        retakeFromBeginning: params.retakeFromBeginning ?? false,
        resolvedAt: null,
        resubmittedAt: null,
      },
    });
  });

  await appendReviewEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.counselorUserId,
    kind: GuidanceStepReviewEventKind.REVISION_REQUESTED,
    status: GuidanceStepReviewStatus.REVISION_REQUESTED,
    rejectReason: reason,
    studentMessage,
    metadata: { impact, requestedSections: params.requestedSections ?? [] },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.counselorUserId,
      action: AuditAction.GUIDANCE_STEP_REVIEWED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        v2: true,
        step: params.stepNumber,
        action: "REVISION_REQUESTED",
        impact,
      },
    },
  });

  if (params.notifyStudent !== false) {
    await notifyStudentPortal({
      organizationId: params.organizationId,
      studentId: plan.studentId,
      title: "نیازمند اصلاح مرحله",
      body: studentMessage,
      entityType: "GuidanceStepReview",
      entityId: review.id,
      dedupeKey: `revision:${review.id}:${now.toISOString().slice(0, 16)}`,
    }).catch(() => undefined);
  }

  return { ok: true };
}

export async function cancelStepRevision(params: {
  organizationId: string;
  studentId: string;
  stepNumber: GuidanceV2StepId;
  counselorUserId: string;
}): Promise<ReviewMutationResult> {
  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const review = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: plan.id,
        stepNumber: params.stepNumber,
      },
    },
  });
  if (!review) return { ok: false, error: "رکورد بررسی یافت نشد." };

  const openSteps = removeOpenRevisionStep(
    parseOpenRevisionSteps(plan.v2OpenRevisionSteps),
    params.stepNumber,
  );

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { v2OpenRevisionSteps: openSteps },
    }),
    prisma.guidanceStepReview.update({
      where: { id: review.id },
      data: {
        status: GuidanceStepReviewStatus.UNREVIEWED,
        revisionRequestedAt: null,
        resolvedAt: new Date(),
      },
    }),
  ]);

  await appendReviewEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.counselorUserId,
    kind: GuidanceStepReviewEventKind.REVISION_CANCELLED,
    status: GuidanceStepReviewStatus.UNREVIEWED,
  });

  return { ok: true };
}

export async function markStepReviewed(params: {
  organizationId: string;
  studentId: string;
  stepNumber: GuidanceV2StepId;
  counselorUserId: string;
  privateNote?: string;
}): Promise<ReviewMutationResult> {
  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const review = await upsertReview({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });
  const now = new Date();

  await prisma.guidanceStepReview.update({
    where: { id: review.id },
    data: {
      status: GuidanceStepReviewStatus.REVIEWED,
      approvedAt: now,
      approvedByUserId: params.counselorUserId,
      resolvedAt: now,
      privateNote: params.privateNote?.trim() || review.privateNote,
    },
  });

  await appendReviewEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.counselorUserId,
    kind: GuidanceStepReviewEventKind.MARKED_REVIEWED,
    status: GuidanceStepReviewStatus.REVIEWED,
    privateNote: params.privateNote?.trim() || null,
  });

  return { ok: true };
}

export async function studentResubmitStep(params: {
  organizationId: string;
  planId: string;
  studentUserId: string;
  stepNumber: number;
}): Promise<void> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      id: params.planId,
      organizationId: params.organizationId,
      journeyVersion: 2,
    },
    select: {
      id: true,
      studentId: true,
      v2OpenRevisionSteps: true,
    },
  });
  if (!plan) return;

  const open = parseOpenRevisionSteps(plan.v2OpenRevisionSteps);
  if (!open.includes(params.stepNumber)) return;

  const review = await upsertReview({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });
  const now = new Date();
  const nextOpen = removeOpenRevisionStep(open, params.stepNumber);

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { v2OpenRevisionSteps: nextOpen },
    }),
    prisma.guidanceStepReview.update({
      where: { id: review.id },
      data: {
        status: GuidanceStepReviewStatus.RESUBMITTED,
        resubmittedAt: now,
      },
    }),
  ]);

  await appendReviewEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.studentUserId,
    kind: GuidanceStepReviewEventKind.RESUBMITTED,
    status: GuidanceStepReviewStatus.RESUBMITTED,
  });
}

export async function recordCounselorStepEdit(params: {
  organizationId: string;
  studentId: string;
  stepNumber: GuidanceV2StepId;
  counselorUserId: string;
  reason: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  notifyStudent?: boolean;
}): Promise<ReviewMutationResult> {
  const reason = params.reason.trim();
  if (!reason) return { ok: false, error: "دلیل ویرایش الزامی است." };

  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const impact = previewStepChangeImpact(params.stepNumber);
  const flags = mergeNeedsReviewFlags(
    parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags),
    impact.affectedSteps,
  );

  const review = await upsertReview({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { v2StepNeedsReviewFlags: flags },
    }),
    prisma.guidanceStepReview.update({
      where: { id: review.id },
      data: {
        status: GuidanceStepReviewStatus.COUNSELOR_EDITED,
        counselorUserId: params.counselorUserId,
      },
    }),
  ]);

  await appendRevision({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorType: "COUNSELOR",
    actorUserId: params.counselorUserId,
    action: "COUNSELOR_EDIT",
    reason,
    beforeSnapshot: params.beforeSnapshot,
    afterSnapshot: params.afterSnapshot,
  });

  await appendReviewEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.counselorUserId,
    kind: GuidanceStepReviewEventKind.COUNSELOR_EDITED,
    status: GuidanceStepReviewStatus.COUNSELOR_EDITED,
    rejectReason: reason,
    metadata: { impact },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.counselorUserId,
      action: AuditAction.GUIDANCE_FIELD_EDITED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        v2: true,
        step: params.stepNumber,
        reason,
      },
    },
  });

  if (params.notifyStudent) {
    await notifyStudentPortal({
      organizationId: params.organizationId,
      studentId: plan.studentId,
      title: "به‌روزرسانی پرونده توسط مشاور",
      body: reason,
      entityType: "GuidanceStepReview",
      entityId: review.id,
      dedupeKey: `counselor-edit:${review.id}:${Date.now()}`,
    }).catch(() => undefined);
  }

  return { ok: true };
}

export type StepReviewRowView = {
  stepNumber: number;
  status: V2ReviewStatus;
  statusLabel: string;
  studentMessage: string | null;
  privateNote: string | null;
  revisionOpen: boolean;
  needsReviewFlag: boolean;
  updatedAtIso: string | null;
  revisionCount: number;
  impactSummary: string | null;
};

export async function loadStepReviewBoard(params: {
  organizationId: string;
  studentId: string;
}): Promise<{
  planId: string;
  publicId: string;
  currentStep: number;
  completedSteps: number[];
  openRevisionSteps: number[];
  steps: StepReviewRowView[];
}> {
  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) {
    throw new Error("پرونده V2 یافت نشد.");
  }

  const completed = Array.isArray(plan.completedSteps)
    ? (plan.completedSteps as number[])
    : [];
  const openRevisionSteps = parseOpenRevisionSteps(plan.v2OpenRevisionSteps);
  const needsFlags = parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags);

  const reviews = await prisma.guidanceStepReview.findMany({
    where: { organizationId: params.organizationId, planId: plan.id },
    select: {
      stepNumber: true,
      status: true,
      studentMessage: true,
      privateNote: true,
      updatedAt: true,
      impactMetadata: true,
      _count: { select: { revisions: true } },
    },
  });

  const byStep = new Map(reviews.map((r) => [r.stepNumber, r]));
  const steps: StepReviewRowView[] = [];

  for (let s = 1; s <= GUIDANCE_V2_STEP_COUNT; s++) {
    const row = byStep.get(s);
    const status = normalizeV2ReviewStatus(row?.status ?? "UNREVIEWED");
    const impact = row?.impactMetadata as { summaryFa?: string } | null;
    steps.push({
      stepNumber: s,
      status,
      statusLabel: V2_REVIEW_STATUS_LABELS[status],
      studentMessage: row?.studentMessage ?? null,
      privateNote: row?.privateNote ?? null,
      revisionOpen: openRevisionSteps.includes(s),
      needsReviewFlag: Boolean(needsFlags[String(s)]),
      updatedAtIso: row?.updatedAt?.toISOString() ?? null,
      revisionCount: row?._count.revisions ?? 0,
      impactSummary: impact?.summaryFa ?? null,
    });
  }

  return {
    planId: plan.id,
    publicId: plan.publicId,
    currentStep: plan.currentStep,
    completedSteps: completed,
    openRevisionSteps,
    steps,
  };
}

export async function loadStudentOpenRevisions(params: {
  organizationId: string;
  studentId: string;
}): Promise<
  Array<{
    stepNumber: number;
    message: string;
    requestedAtIso: string | null;
  }>
> {
  const plan = await loadV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return [];

  const open = parseOpenRevisionSteps(plan.v2OpenRevisionSteps);
  if (open.length === 0) return [];

  const reviews = await prisma.guidanceStepReview.findMany({
    where: {
      organizationId: params.organizationId,
      planId: plan.id,
      stepNumber: { in: open },
    },
    select: {
      stepNumber: true,
      studentMessage: true,
      revisionRequestedAt: true,
    },
  });

  return open.map((stepNumber) => {
    const r = reviews.find((x) => x.stepNumber === stepNumber);
    return {
      stepNumber,
      message: r?.studentMessage ?? "مشاور درخواست اصلاح این مرحله را ثبت کرده است.",
      requestedAtIso: r?.revisionRequestedAt?.toISOString() ?? null,
    };
  });
}

export async function saveV2StepReviewNotes(params: {
  organizationId: string;
  planId: string;
  stepNumber: number;
  actorUserId: string;
  privateNote?: string;
  studentMessage?: string;
}): Promise<ReviewMutationResult> {
  const privateNote = params.privateNote?.trim() || null;
  const studentMessage = params.studentMessage?.trim() || null;
  if (!privateNote && !studentMessage) {
    return { ok: false, error: "متن یادداشت خالی است." };
  }
  const review = await upsertReview({
    organizationId: params.organizationId,
    planId: params.planId,
    stepNumber: params.stepNumber,
  });
  await prisma.guidanceStepReview.update({
    where: { id: review.id },
    data: {
      privateNote: privateNote ?? review.privateNote,
      studentMessage: studentMessage ?? review.studentMessage,
    },
  });
  return { ok: true };
}

export { toPrismaReviewStatus, normalizeV2ReviewStatus };
