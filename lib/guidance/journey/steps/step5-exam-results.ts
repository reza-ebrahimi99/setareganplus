/**
 * Guidance Journey Engine — Step 5: Exam Results (Sanjesh) (Phase 1).
 * Student self-reports rank/score numbers (server validates shape, not
 * correctness — the spec's own explicit warning covers that) and uploads
 * the official result PDF as a new, additive GuidanceDocumentType
 * (EXAM_RESULT) using the same versioned-upload approach as final grades,
 * without modifying lib/guidance/documents.ts (Phase 0, FINAL_GRADES only).
 */

import {
  AuditAction,
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
  MediaAssetStatus,
} from "@/generated/prisma/enums";
import {
  FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES,
  FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
} from "@/lib/forms/file-upload-config";
import { validateFormUploadFile } from "@/lib/media/form-file-upload";
import {
  generatePrivateGuidanceUploadStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";

export const STEP5_CATEGORY = "guidance-journey-step5";
export const STEP5_KIND = "guidance-journey-step5";

const UPLOAD_CONFIG = {
  multiple: false,
  maxFiles: 1,
  maxBytes: FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
  allowedMimeTypes: [...FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES],
};

export type Step5ExamResultData = {
  nationalRank: number;
  regionalRank: number;
  quotaRank: number | null;
  score: number;
  acknowledgedAtIso: string;
};

export type Step5Input = {
  nationalRank: string;
  regionalRank: string;
  quotaRank: string;
  score: string;
  acknowledged: boolean;
};

function parsePositiveInt(raw: string): number | null {
  const digits = toLatinDigits(raw.trim()).replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
  return value;
}

function parseScore(raw: string): number | null {
  const normalized = toLatinDigits(raw.trim()).replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100_000) return null;
  return Math.round(value * 100) / 100;
}

export function validateStep5Input(
  input: Step5Input,
): { ok: true; data: Omit<Step5ExamResultData, "acknowledgedAtIso"> } | {
  ok: false;
  error: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};

  const nationalRank = parsePositiveInt(input.nationalRank);
  if (nationalRank === null) fieldErrors.nationalRank = "رتبه کشوری معتبر وارد کنید.";

  const regionalRank = parsePositiveInt(input.regionalRank);
  if (regionalRank === null) fieldErrors.regionalRank = "رتبه منطقه معتبر وارد کنید.";

  let quotaRank: number | null = null;
  if (input.quotaRank.trim()) {
    quotaRank = parsePositiveInt(input.quotaRank);
    if (quotaRank === null) fieldErrors.quotaRank = "رتبه سهمیه معتبر وارد کنید.";
  }

  const score = parseScore(input.score);
  if (score === null) fieldErrors.score = "تراز/نمره کل معتبر وارد کنید.";

  if (!input.acknowledged) {
    fieldErrors.acknowledged = "برای ادامه باید مسئولیت صحت اطلاعات را بپذیری.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "لطفاً موارد مشخص‌شده را اصلاح کنید.", fieldErrors };
  }

  return {
    ok: true,
    data: { nationalRank: nationalRank!, regionalRank: regionalRank!, quotaRank, score: score! },
  };
}

function validateStoredData(raw: unknown): Step5ExamResultData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.nationalRank !== "number" || typeof obj.regionalRank !== "number") {
    return null;
  }
  return {
    nationalRank: obj.nationalRank,
    regionalRank: obj.regionalRank,
    quotaRank: typeof obj.quotaRank === "number" ? obj.quotaRank : null,
    score: typeof obj.score === "number" ? obj.score : 0,
    acknowledgedAtIso:
      typeof obj.acknowledgedAtIso === "string" ? obj.acknowledgedAtIso : "",
  };
}

export async function loadStep5Prefill(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Step5ExamResultData | null> {
  const stored = await loadGuidanceStepData<Step5ExamResultData>({
    organizationId: params.organizationId,
    category: STEP5_CATEGORY,
    kind: STEP5_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  return stored.data;
}

async function uploadExamResultDocument(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
  userId: string;
  file: File;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const validated = await validateFormUploadFile(params.file, UPLOAD_CONFIG);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey(validated.extension);
  const written = await writeMediaFile({ storageKey, data: validated.buffer });

  await prisma.$transaction(async (tx) => {
    const latest = await tx.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: params.planId,
        documentType: GuidanceDocumentType.EXAM_RESULT,
        isLatest: true,
        deletedAt: null,
      },
      select: { id: true, versionNumber: true },
    });

    if (latest) {
      await tx.guidanceDocument.update({
        where: { id: latest.id },
        data: { isLatest: false },
      });
    }

    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const media = await tx.mediaAsset.create({
      data: {
        organizationId: params.organizationId,
        storageKey,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        byteSize: written.byteSize,
        checksum: written.checksum,
        status: MediaAssetStatus.ACTIVE,
        createdByUserId: params.userId,
        metadata: {
          kind: "guidance-document",
          documentType: GuidanceDocumentType.EXAM_RESULT,
          planPublicId: params.planPublicId,
        },
      },
      select: { id: true },
    });

    await tx.guidanceDocument.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        mediaAssetId: media.id,
        documentType: GuidanceDocumentType.EXAM_RESULT,
        versionNumber,
        isLatest: true,
        originalFilename: validated.originalName,
        mimeType: validated.mimeType,
        fileSizeBytes: written.byteSize,
        checksum: written.checksum,
        verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
      },
    });
  });

  return { ok: true };
}

export type CompleteStep5Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function completeGuidanceStep5(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  input: Step5Input;
  file: File | null;
}): Promise<CompleteStep5Result> {
  const validated = validateStep5Input(params.input);
  if (!validated.ok) {
    return { ok: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const existingDoc = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      documentType: GuidanceDocumentType.EXAM_RESULT,
      isLatest: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existingDoc && !params.file) {
    return {
      ok: false,
      error: "بارگذاری کارنامه رسمی سنجش الزامی است.",
      fieldErrors: { file: "فایل کارنامه سنجش را بارگذاری کنید." },
    };
  }

  if (params.file) {
    const uploaded = await uploadExamResultDocument({
      organizationId: params.organizationId,
      planId: params.planId,
      planPublicId: params.planPublicId,
      userId: params.actorUserId,
      file: params.file,
    });
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error, fieldErrors: { file: uploaded.error } };
    }
  }

  const data: Step5ExamResultData = {
    ...validated.data,
    acknowledgedAtIso: new Date().toISOString(),
  };

  await saveGuidanceStepData<Step5ExamResultData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP5_CATEGORY,
    kind: STEP5_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data,
    filenamePrefix: "guidance-step5",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        step: 5,
        nationalRank: data.nationalRank,
        regionalRank: data.regionalRank,
      },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 5,
  });

  if (!advanced.ok) {
    return { ok: false, error: advanced.error };
  }

  return { ok: true };
}
