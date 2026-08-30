/**
 * Counselor Workspace Phase 2 — per-step review SoR.
 * Does not touch Journey Engine advance/complete functions.
 */

import {
  AuditAction,
  GuidanceStepReviewEventKind,
  GuidanceStepReviewStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  isGuidanceJourneyStepId,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import { rewindGuidanceJourneyToStep } from "@/lib/guidance/workspace/rewind";

export const STEP_REVIEW_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION",
] as const;

export type StepReviewStatus = (typeof STEP_REVIEW_STATUSES)[number];

export type StepReviewRecord = {
  stepNumber: GuidanceJourneyStepId;
  status: StepReviewStatus;
  privateNote: string | null;
  studentMessage: string | null;
  rejectReason: string | null;
  approvedAtIso: string | null;
  approvedByUserId: string | null;
  approvedByName: string | null;
  rejectedAtIso: string | null;
  revisionRequestedAtIso: string | null;
  updatedAtIso: string | null;
};

export type StepReviewHistoryItem = {
  id: string;
  kind: string;
  status: StepReviewStatus;
  actorName: string;
  atIso: string;
  rejectReason: string | null;
  privateNote: string | null;
  studentMessage: string | null;
  summary: string;
};

export type ReviewMutationResult =
  | { ok: true }
  | { ok: false; error: string };

function isReviewStatus(value: string): value is StepReviewStatus {
  return (STEP_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function emptyStepReview(stepNumber: GuidanceJourneyStepId): StepReviewRecord {
  return {
    stepNumber,
    status: "PENDING",
    privateNote: null,
    studentMessage: null,
    rejectReason: null,
    approvedAtIso: null,
    approvedByUserId: null,
    approvedByName: null,
    rejectedAtIso: null,
    revisionRequestedAtIso: null,
    updatedAtIso: null,
  };
}

async function loadPlanRef(params: {
  organizationId: string;
  publicId: string;
}) {
  return prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      publicId: params.publicId,
      deletedAt: null,
    },
    select: {
      id: true,
      publicId: true,
      organizationId: true,
      userId: true,
      studentId: true,
      currentStep: true,
      completedSteps: true,
      completionPercentage: true,
      status: true,
    },
  });
}

async function upsertReviewRow(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceJourneyStepId;
}) {
  return prisma.guidanceStepReview.upsert({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepNumber,
      },
    },
    update: {},
    create: {
      organizationId: params.organizationId,
      planId: params.planId,
      stepNumber: params.stepNumber,
      status: GuidanceStepReviewStatus.PENDING,
    },
  });
}

export async function loadStepReviewsForPlan(params: {
  organizationId: string;
  planId: string;
}): Promise<StepReviewRecord[]> {
  const rows = await prisma.guidanceStepReview.findMany({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
    },
    select: {
      stepNumber: true,
      status: true,
      privateNote: true,
      studentMessage: true,
      rejectReason: true,
      approvedAt: true,
      approvedByUserId: true,
      approvedBy: { select: { firstName: true, lastName: true } },
      rejectedAt: true,
      revisionRequestedAt: true,
      updatedAt: true,
    },
  });

  return rows
    .filter((row) => isGuidanceJourneyStepId(row.stepNumber))
    .map((row) => ({
      stepNumber: row.stepNumber as GuidanceJourneyStepId,
      status: isReviewStatus(row.status) ? row.status : "PENDING",
      privateNote: row.privateNote,
      studentMessage: row.studentMessage,
      rejectReason: row.rejectReason,
      approvedAtIso: row.approvedAt?.toISOString() ?? null,
      approvedByUserId: row.approvedByUserId,
      approvedByName:
        `${row.approvedBy?.firstName ?? ""} ${row.approvedBy?.lastName ?? ""}`.trim() ||
        null,
      rejectedAtIso: row.rejectedAt?.toISOString() ?? null,
      revisionRequestedAtIso: row.revisionRequestedAt?.toISOString() ?? null,
      updatedAtIso: row.updatedAt.toISOString(),
    }));
}

export async function loadStepReview(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceJourneyStepId;
}): Promise<StepReviewRecord> {
  const all = await loadStepReviewsForPlan({
    organizationId: params.organizationId,
    planId: params.planId,
  });
  return (
    all.find((row) => row.stepNumber === params.stepNumber) ??
    emptyStepReview(params.stepNumber)
  );
}

export async function loadStudentVisibleMessage(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceJourneyStepId;
}): Promise<string | null> {
  const row = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepNumber,
      },
    },
    select: { studentMessage: true, status: true },
  });
  if (!row?.studentMessage) return null;
  return row.studentMessage;
}

export async function loadStepReviewHistory(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceJourneyStepId;
}): Promise<StepReviewHistoryItem[]> {
  const review = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepNumber,
      },
    },
    select: { id: true },
  });
  if (!review) return [];

  const events = await prisma.guidanceStepReviewEvent.findMany({
    where: {
      organizationId: params.organizationId,
      reviewId: review.id,
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      kind: true,
      status: true,
      rejectReason: true,
      privateNote: true,
      studentMessage: true,
      createdAt: true,
      actor: { select: { firstName: true, lastName: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    kind: event.kind,
    status: isReviewStatus(event.status) ? event.status : "PENDING",
    actorName:
      `${event.actor?.firstName ?? ""} ${event.actor?.lastName ?? ""}`.trim() ||
      "مشاور",
    atIso: event.createdAt.toISOString(),
    rejectReason: event.rejectReason,
    privateNote: event.privateNote,
    studentMessage: event.studentMessage,
    summary: historySummary(event.kind, event.rejectReason),
  }));
}

function historySummary(kind: string, rejectReason: string | null): string {
  switch (kind) {
    case "APPROVED":
      return "مرحله تأیید شد";
    case "REJECTED":
      return rejectReason ? `رد شد: ${rejectReason}` : "مرحله رد شد";
    case "REVISION_REQUESTED":
      return rejectReason ? `درخواست اصلاح: ${rejectReason}` : "درخواست اصلاح";
    case "NOTE_ADDED":
      return "یادداشت داخلی ثبت شد";
    case "STUDENT_MESSAGE_SET":
      return "پیام دانش‌آموز ثبت شد";
    case "EDITED":
      return "اطلاعات مرحله ویرایش شد";
    case "DOCUMENT_REPLACED":
      return "مدرک جایگزین شد";
    case "DOCUMENT_VERIFIED":
      return "مدرک تأیید شد";
    case "DOCUMENT_REJECTED":
      return "مدرک رد شد";
    default:
      return kind;
  }
}

async function appendEvent(params: {
  organizationId: string;
  reviewId: string;
  actorUserId: string;
  kind: GuidanceStepReviewEventKind;
  status: GuidanceStepReviewStatus;
  privateNote?: string | null;
  studentMessage?: string | null;
  rejectReason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.guidanceStepReviewEvent.create({
    data: {
      organizationId: params.organizationId,
      reviewId: params.reviewId,
      actorUserId: params.actorUserId,
      kind: params.kind,
      status: params.status,
      privateNote: params.privateNote ?? null,
      studentMessage: params.studentMessage ?? null,
      rejectReason: params.rejectReason ?? null,
      metadata: (params.metadata ?? undefined) as object | undefined,
    },
  });
}

export async function setStepReviewStatus(params: {
  organizationId: string;
  publicId: string;
  stepNumber: GuidanceJourneyStepId;
  actorUserId: string;
  nextStatus: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  rejectReason?: string;
  privateNote?: string;
  studentMessage?: string;
}): Promise<ReviewMutationResult> {
  const plan = await loadPlanRef({
    organizationId: params.organizationId,
    publicId: params.publicId,
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  if (
    (params.nextStatus === "REJECTED" || params.nextStatus === "NEEDS_REVISION") &&
    !params.rejectReason?.trim()
  ) {
    return { ok: false, error: "دلیل رد یا درخواست اصلاح الزامی است." };
  }

  const now = new Date();
  const review = await upsertReviewRow({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });

  const status =
    params.nextStatus === "APPROVED"
      ? GuidanceStepReviewStatus.APPROVED
      : params.nextStatus === "REJECTED"
        ? GuidanceStepReviewStatus.REJECTED
        : GuidanceStepReviewStatus.NEEDS_REVISION;

  const kind =
    params.nextStatus === "APPROVED"
      ? GuidanceStepReviewEventKind.APPROVED
      : params.nextStatus === "REJECTED"
        ? GuidanceStepReviewEventKind.REJECTED
        : GuidanceStepReviewEventKind.REVISION_REQUESTED;

  await prisma.guidanceStepReview.update({
    where: { id: review.id },
    data: {
      status,
      rejectReason: params.rejectReason?.trim() || null,
      privateNote: params.privateNote?.trim()
        ? params.privateNote.trim()
        : review.privateNote,
      studentMessage: params.studentMessage?.trim()
        ? params.studentMessage.trim()
        : review.studentMessage,
      approvedAt: status === GuidanceStepReviewStatus.APPROVED ? now : null,
      approvedByUserId:
        status === GuidanceStepReviewStatus.APPROVED ? params.actorUserId : null,
      rejectedAt: status === GuidanceStepReviewStatus.REJECTED ? now : null,
      rejectedByUserId:
        status === GuidanceStepReviewStatus.REJECTED ? params.actorUserId : null,
      revisionRequestedAt:
        status === GuidanceStepReviewStatus.NEEDS_REVISION ? now : null,
    },
  });

  await appendEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.actorUserId,
    kind,
    status,
    privateNote: params.privateNote?.trim() || null,
    studentMessage: params.studentMessage?.trim() || null,
    rejectReason: params.rejectReason?.trim() || null,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STEP_REVIEWED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        publicId: plan.publicId,
        step: params.stepNumber,
        status: params.nextStatus,
        rejectReason: params.rejectReason?.trim() || null,
      },
    },
  });

  if (params.nextStatus === "REJECTED" || params.nextStatus === "NEEDS_REVISION") {
    const rewound = await rewindGuidanceJourneyToStep({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      planId: plan.id,
      publicId: plan.publicId,
      studentId: plan.studentId,
      userId: plan.userId,
      currentStep: plan.currentStep,
      completedSteps: plan.completedSteps,
      targetStep: params.stepNumber,
    });
    if (!rewound.ok) return rewound;
  }

  return { ok: true };
}

export async function saveStepReviewNotes(params: {
  organizationId: string;
  publicId: string;
  stepNumber: GuidanceJourneyStepId;
  actorUserId: string;
  privateNote?: string;
  studentMessage?: string;
}): Promise<ReviewMutationResult> {
  const plan = await loadPlanRef({
    organizationId: params.organizationId,
    publicId: params.publicId,
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const privateNote = params.privateNote?.trim() || null;
  const studentMessage = params.studentMessage?.trim() || null;
  if (!privateNote && !studentMessage) {
    return { ok: false, error: "متن یادداشت خالی است." };
  }

  const review = await upsertReviewRow({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: params.stepNumber,
  });

  await prisma.guidanceStepReview.update({
    where: { id: review.id },
    data: {
      privateNote: privateNote ?? review.privateNote,
      studentMessage: studentMessage ?? review.studentMessage,
    },
  });

  if (privateNote) {
    await appendEvent({
      organizationId: params.organizationId,
      reviewId: review.id,
      actorUserId: params.actorUserId,
      kind: GuidanceStepReviewEventKind.NOTE_ADDED,
      status: review.status,
      privateNote,
    });
  }
  if (studentMessage) {
    await appendEvent({
      organizationId: params.organizationId,
      reviewId: review.id,
      actorUserId: params.actorUserId,
      kind: GuidanceStepReviewEventKind.STUDENT_MESSAGE_SET,
      status: review.status,
      studentMessage,
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_NOTE_ADDED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        publicId: plan.publicId,
        step: params.stepNumber,
        internal: Boolean(privateNote),
        studentVisible: Boolean(studentMessage),
      },
    },
  });

  return { ok: true };
}

export async function recordStepEditEvent(params: {
  organizationId: string;
  planId: string;
  publicId: string;
  stepNumber: GuidanceJourneyStepId;
  actorUserId: string;
  changes: readonly { field: string; oldValue: string; newValue: string }[];
  reason: string;
}): Promise<void> {
  const review = await upsertReviewRow({
    organizationId: params.organizationId,
    planId: params.planId,
    stepNumber: params.stepNumber,
  });
  await appendEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.actorUserId,
    kind: GuidanceStepReviewEventKind.EDITED,
    status: review.status,
    metadata: { changes: params.changes, reason: params.reason },
  });
}

export async function recordDocumentReviewEvent(params: {
  organizationId: string;
  planId: string;
  stepNumber: GuidanceJourneyStepId;
  actorUserId: string;
  kind:
    | "DOCUMENT_REPLACED"
    | "DOCUMENT_VERIFIED"
    | "DOCUMENT_REJECTED";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const review = await upsertReviewRow({
    organizationId: params.organizationId,
    planId: params.planId,
    stepNumber: params.stepNumber,
  });
  await appendEvent({
    organizationId: params.organizationId,
    reviewId: review.id,
    actorUserId: params.actorUserId,
    kind: GuidanceStepReviewEventKind[params.kind],
    status: review.status,
    metadata: params.metadata,
  });
}
