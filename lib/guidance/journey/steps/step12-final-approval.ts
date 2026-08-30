/**
 * Guidance Journey Engine — Step 12: Final Approval (Phase 1).
 * Digital confirmation (typed signature) + printable consent + archive.
 * Terminal step — journey stays "complete" at step 12 afterwards.
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";

export type CompleteStep12Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function completeGuidanceStep12(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  typedSignature: string;
  expectedFullName: string;
  confirmed: boolean;
}): Promise<CompleteStep12Result> {
  const fieldErrors: Record<string, string> = {};

  const signature = params.typedSignature.trim();
  if (signature.length < 3) {
    fieldErrors.typedSignature = "نام کامل خودت را برای تأیید دیجیتال تایپ کن.";
  } else {
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    if (normalize(signature) !== normalize(params.expectedFullName)) {
      fieldErrors.typedSignature = "نام واردشده باید دقیقاً با نام پرونده یکسان باشد.";
    }
  }

  if (!params.confirmed) {
    fieldErrors.confirmed = "برای ادامه باید تأیید نهایی را بپذیری.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "لطفاً موارد مشخص‌شده را اصلاح کنید.", fieldErrors };
  }

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: params.planId },
      data: { finalApprovedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.GUIDANCE_JOURNEY_APPROVED,
        entityType: "GuidancePlan",
        entityId: params.planId,
        metadata: { publicId: params.planPublicId, typedSignature: signature },
      },
    }),
  ]);

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 12,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
