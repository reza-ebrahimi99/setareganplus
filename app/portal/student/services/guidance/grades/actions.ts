"use server";

/**
 * Guidance ERP — portal final-grades upload action.
 */

import { readSessionRequestMetadata } from "@/lib/auth/session";
import { uploadGuidanceFinalGrades } from "@/lib/guidance/documents";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type GuidanceGradesUploadState = {
  ok?: boolean;
  error?: string;
  versionNumber?: number;
  replaced?: boolean;
};

export async function uploadGuidanceFinalGradesAction(
  _state: GuidanceGradesUploadState,
  formData: FormData,
): Promise<GuidanceGradesUploadState> {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    return { error: "سامانه انتخاب رشته در حال حاضر فعال نیست." };
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { error: "حساب دانش‌آموز فعال یافت نشد." };
  }

  const plan = await loadGuidancePlanForPortalUser({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) {
    return { error: "ابتدا پیش‌ثبت‌نام انتخاب رشته را تکمیل کنید." };
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return { error: "فایلی انتخاب نشده است." };
  }

  const requestMetadata = await readSessionRequestMetadata();
  const uploaded = await uploadGuidanceFinalGrades({
    organizationId: context.organization.id,
    planId: plan.id,
    userId: context.user.id,
    file: fileValue,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
  });

  if (!uploaded.ok) {
    return { error: uploaded.error };
  }

  return {
    ok: true,
    versionNumber: uploaded.versionNumber,
    replaced: uploaded.replaced,
  };
}
