/**
 * Document verification presentation + server-side progression gates.
 * Schema statuses stay PENDING / VERIFIED / REJECTED.
 */

import { GuidanceDocumentType, GuidanceDocumentVerificationStatus } from "@/generated/prisma/enums";

export const DOC_VERIFY_UI = {
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  NEEDS_CORRECTION: "NEEDS_CORRECTION",
} as const;

export type DocumentVerifyUiStatus =
  (typeof DOC_VERIFY_UI)[keyof typeof DOC_VERIFY_UI];

export const DOCUMENT_VERIFY_LABELS: Record<DocumentVerifyUiStatus, string> = {
  PENDING_REVIEW: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  NEEDS_CORRECTION: "نیازمند اصلاح",
};

export function toDocumentVerifyUi(
  status: string | null | undefined,
): DocumentVerifyUiStatus {
  if (status === GuidanceDocumentVerificationStatus.VERIFIED) return "APPROVED";
  if (status === GuidanceDocumentVerificationStatus.REJECTED) return "NEEDS_CORRECTION";
  return "PENDING_REVIEW";
}

export function documentVerifyLabel(status: string | null | undefined): string {
  return DOCUMENT_VERIFY_LABELS[toDocumentVerifyUi(status)];
}

export const GATED_DOCUMENT_TYPES = {
  FINAL_GRADES: GuidanceDocumentType.FINAL_GRADES,
  EXAM_RESULT: GuidanceDocumentType.EXAM_RESULT,
} as const;

export function requiredDocumentTypeForAdvance(stepId: number): GuidanceDocumentType | null {
  if (stepId === 12) return GuidanceDocumentType.EXAM_RESULT;
  return null;
}

export function assertRequiredDocumentApproved(params: {
  stepId: number;
  latestStatus: string | null | undefined;
  hasLatest: boolean;
}): { ok: true } | { ok: false; error: string } {
  const required = requiredDocumentTypeForAdvance(params.stepId);
  if (!required) return { ok: true };
  if (!params.hasLatest) {
    return {
      ok: false,
      error:
        required === GuidanceDocumentType.FINAL_GRADES
          ? "بارگذاری کارنامه نهایی برای ادامه این مرحله الزامی است."
          : "بارگذاری کارنامه کنکور برای ادامه این مرحله الزامی است.",
    };
  }
  if (toDocumentVerifyUi(params.latestStatus) !== "APPROVED") {
    return {
      ok: false,
      error:
        toDocumentVerifyUi(params.latestStatus) === "NEEDS_CORRECTION"
          ? "مشاور این مدرک را نیازمند اصلاح دانسته است. پس از بارگذاری نسخه جدید و تأیید مشاور می‌توانید ادامه دهید."
          : "ادامه این مرحله پس از تأیید مدرک توسط مشاور امکان‌پذیر است.",
    };
  }
  return { ok: true };
}
