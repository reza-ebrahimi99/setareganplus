"use server";

/**
 * Counselor Review Center — staff actions.
 * Verifies transcripts, notes, corrections, Ready for Session.
 * No GuidancePlan schema mutation beyond existing document verification fields.
 */

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  GuidanceDocumentVerificationStatus,
} from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  COUNSELOR_REVIEW_STATUSES,
  loadCounselorCase,
  saveCounselorCase,
  type CounselorActivityItem,
  type CounselorNote,
  type CounselorReviewStatus,
} from "@/lib/guidance/counselor";
import { prisma } from "@/lib/prisma";

export type CounselorActionResult =
  | { ok: true }
  | { ok: false; error: string };

function actorName(session: {
  user: { displayName: string };
}): string {
  return session.user.displayName || "مشاور";
}

async function requireCounselorGate(publicId: string) {
  const session = await requirePermission("guidance.review");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) {
    return { ok: false as const, error: "سامانه انتخاب رشته فعال نیست." };
  }
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: session.organization.id,
      publicId,
      deletedAt: null,
    },
    select: { id: true, publicId: true },
  });
  if (!plan) {
    return { ok: false as const, error: "پرونده یافت نشد." };
  }
  return { ok: true as const, session, plan };
}

function revalidateCase(publicId: string) {
  revalidatePath("/admin/guidance");
  revalidatePath(`/admin/guidance/${publicId}`);
}

export async function verifyGuidanceTranscriptAction(input: {
  publicId: string;
  documentId: string;
  decision: "VERIFIED" | "REJECTED";
}): Promise<CounselorActionResult> {
  const gate = await requireCounselorGate(input.publicId);
  if (!gate.ok) return gate;

  const doc = await prisma.guidanceDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: gate.session.organization.id,
      planId: gate.plan.id,
      deletedAt: null,
    },
    select: { id: true, verificationStatus: true },
  });
  if (!doc) {
    return { ok: false, error: "سند کارنامه یافت نشد." };
  }

  const status =
    input.decision === "VERIFIED"
      ? GuidanceDocumentVerificationStatus.VERIFIED
      : GuidanceDocumentVerificationStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    await tx.guidanceDocument.update({
      where: { id: doc.id },
      data: {
        verificationStatus: status,
        verifiedByUserId: gate.session.user.id,
        verifiedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: gate.session.organization.id,
        actorUserId: gate.session.user.id,
        action: AuditAction.GUIDANCE_STATUS_CHANGED,
        entityType: "GuidanceDocument",
        entityId: doc.id,
        metadata: {
          planPublicId: gate.plan.publicId,
          verificationStatus: status,
          from: doc.verificationStatus,
        },
      },
    });
  });

  const existing = await loadCounselorCase({
    organizationId: gate.session.organization.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const name = actorName(gate.session);
  const activity: CounselorActivityItem = {
    id: `act-${Date.now()}`,
    kind:
      input.decision === "VERIFIED"
        ? "transcript_verified"
        : "transcript_rejected",
    summary:
      input.decision === "VERIFIED"
        ? "کارنامه تأیید شد"
        : "کارنامه رد شد — نیاز به اصلاح",
    actorUserId: gate.session.user.id,
    actorName: name,
    atIso: new Date().toISOString(),
  };

  const nextStatus: CounselorReviewStatus =
    input.decision === "REJECTED"
      ? "needs_correction"
      : existing.reviewStatus === "awaiting_review"
        ? "in_review"
        : existing.reviewStatus;

  await saveCounselorCase({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    reviewStatus: nextStatus,
    notes: existing.notes,
    activity: [activity, ...existing.activity],
    assigneeUserId: gate.session.user.id,
    assigneeName: name,
  });

  revalidateCase(gate.plan.publicId);
  return { ok: true };
}

export async function addCounselorNoteAction(input: {
  publicId: string;
  body: string;
}): Promise<CounselorActionResult> {
  const gate = await requireCounselorGate(input.publicId);
  if (!gate.ok) return gate;

  const body = input.body.trim();
  if (body.length < 2) {
    return { ok: false, error: "متن یادداشت خیلی کوتاه است." };
  }
  if (body.length > 4000) {
    return { ok: false, error: "متن یادداشت خیلی بلند است." };
  }

  const existing = await loadCounselorCase({
    organizationId: gate.session.organization.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const name = actorName(gate.session);
  const note: CounselorNote = {
    id: `note-${Date.now()}`,
    body,
    authorUserId: gate.session.user.id,
    authorName: name,
    createdAtIso: new Date().toISOString(),
  };
  const activity: CounselorActivityItem = {
    id: `act-${Date.now()}`,
    kind: "note_added",
    summary: "یادداشت مشاور افزوده شد",
    actorUserId: gate.session.user.id,
    actorName: name,
    atIso: note.createdAtIso,
  };

  await saveCounselorCase({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    reviewStatus:
      existing.reviewStatus === "awaiting_review"
        ? "in_review"
        : existing.reviewStatus,
    notes: [note, ...existing.notes],
    activity: [activity, ...existing.activity],
    assigneeUserId: gate.session.user.id,
    assigneeName: name,
  });

  revalidateCase(gate.plan.publicId);
  return { ok: true };
}

export async function requestCounselorCorrectionAction(input: {
  publicId: string;
  message: string;
}): Promise<CounselorActionResult> {
  const gate = await requireCounselorGate(input.publicId);
  if (!gate.ok) return gate;

  const message = input.message.trim();
  if (message.length < 2) {
    return { ok: false, error: "پیام اصلاح را بنویس." };
  }

  const existing = await loadCounselorCase({
    organizationId: gate.session.organization.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const name = actorName(gate.session);
  const note: CounselorNote = {
    id: `note-${Date.now()}`,
    body: `درخواست اصلاح: ${message}`,
    authorUserId: gate.session.user.id,
    authorName: name,
    createdAtIso: new Date().toISOString(),
  };
  const activity: CounselorActivityItem = {
    id: `act-${Date.now()}`,
    kind: "correction_requested",
    summary: "درخواست اصلاح برای دانش‌آموز ثبت شد",
    actorUserId: gate.session.user.id,
    actorName: name,
    atIso: note.createdAtIso,
  };

  await saveCounselorCase({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    reviewStatus: "needs_correction",
    notes: [note, ...existing.notes],
    activity: [activity, ...existing.activity],
    assigneeUserId: gate.session.user.id,
    assigneeName: name,
  });

  revalidateCase(gate.plan.publicId);
  return { ok: true };
}

export async function setCounselorReviewStatusAction(input: {
  publicId: string;
  status: CounselorReviewStatus;
}): Promise<CounselorActionResult> {
  const gate = await requireCounselorGate(input.publicId);
  if (!gate.ok) return gate;

  if (
    !(COUNSELOR_REVIEW_STATUSES as readonly string[]).includes(input.status)
  ) {
    return { ok: false, error: "وضعیت نامعتبر است." };
  }

  const existing = await loadCounselorCase({
    organizationId: gate.session.organization.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const name = actorName(gate.session);
  const activity: CounselorActivityItem = {
    id: `act-${Date.now()}`,
    kind: "status_changed",
    summary: `وضعیت بررسی به «${input.status}» تغییر کرد`,
    actorUserId: gate.session.user.id,
    actorName: name,
    atIso: new Date().toISOString(),
  };

  await saveCounselorCase({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    reviewStatus: input.status,
    notes: existing.notes,
    activity: [activity, ...existing.activity],
    assigneeUserId: gate.session.user.id,
    assigneeName: name,
  });

  revalidateCase(gate.plan.publicId);
  return { ok: true };
}

/** Guard helper for view-only pages */
export async function assertGuidanceViewAccess() {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) {
    return { ok: false as const, session, error: "disabled" as const };
  }
  return {
    ok: true as const,
    session,
    canReview: hasPermission(session, "guidance.review"),
  };
}
