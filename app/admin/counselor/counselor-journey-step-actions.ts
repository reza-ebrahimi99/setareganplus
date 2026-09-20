"use server";

import { revalidatePath } from "next/cache";
import {
  assertCounselorCanAccessStudent,
  requireCounselorContext,
} from "@/lib/counselor-os/auth";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { recordCounselorStepEdit } from "@/lib/guidance/journey-v2/step-review/service";
import { replaceGuidanceDocumentAsCounselor } from "@/lib/guidance/workspace/documents";
import { GuidanceDocumentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type CounselorJourneyStepActionState = { ok?: boolean; error?: string };

function revalidateJourney(studentId: string, step: number) {
  revalidatePath(`/admin/counselor/students/${studentId}`);
  revalidatePath(`/admin/counselor/students/${studentId}/journey/${step}`);
}

export async function counselorJourneyReplaceFinalGradesAction(
  _prev: CounselorJourneyStepActionState,
  formData: FormData,
): Promise<CounselorJourneyStepActionState> {
  const ctx = await requireCounselorContext();
  if (!ctx.canReview) {
    return { error: "مجوز ویرایش ندارید." };
  }

  const studentId = String(formData.get("studentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const fileValue = formData.get("file");

  if (!studentId) return { error: "شناسه دانش‌آموز نامعتبر است." };
  if (!reason) return { error: "دلیل جایگزینی الزامی است." };
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { error: "فایل کارنامه الزامی است." };
  }

  try {
    await assertCounselorCanAccessStudent({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      canReview: ctx.canReview,
      isSupervisor: ctx.isSupervisor,
    });
  } catch {
    return { error: "دسترسی به این پرونده مجاز نیست." };
  }

  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan) return { error: "پرونده V2 یافت نشد." };

  const before = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: ctx.organizationId,
      planId: plan.id,
      documentType: GuidanceDocumentType.FINAL_GRADES,
      isLatest: true,
      deletedAt: null,
    },
    select: {
      id: true,
      originalFilename: true,
      versionNumber: true,
      verificationStatus: true,
    },
  });

  const replaced = await replaceGuidanceDocumentAsCounselor({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    planId: plan.id,
    publicId: plan.publicId,
    documentType: "FINAL_GRADES",
    file: fileValue,
    reason,
    reviewStepNumber: 3,
  });

  if (!replaced.ok) return { error: replaced.error };

  const after = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: ctx.organizationId,
      planId: plan.id,
      documentType: GuidanceDocumentType.FINAL_GRADES,
      isLatest: true,
      deletedAt: null,
    },
    select: {
      originalFilename: true,
      versionNumber: true,
      verificationStatus: true,
    },
  });

  const edit = await recordCounselorStepEdit({
    organizationId: ctx.organizationId,
    studentId,
    stepNumber: 3,
    counselorUserId: ctx.userId,
    reason,
    beforeSnapshot: before
      ? {
          filename: before.originalFilename,
          version: before.versionNumber,
          verification: before.verificationStatus,
        }
      : { filename: "", version: 0 },
    afterSnapshot: after
      ? {
          filename: after.originalFilename,
          version: after.versionNumber,
          verification: after.verificationStatus,
        }
      : {},
    notifyStudent: false,
  });
  if (!edit.ok) return { error: edit.error };

  revalidateJourney(studentId, 3);
  return { ok: true };
}
