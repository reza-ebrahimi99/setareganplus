/**
 * Counselor document replace / verify. Does not change plan.status
 * (journey progress is owned by GuidancePlan currentStep).
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
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import { recordDocumentReviewEvent } from "@/lib/guidance/workspace/review";

const UPLOAD_CONFIG = {
  multiple: false,
  maxFiles: 1,
  maxBytes: FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
  allowedMimeTypes: [...FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES],
};

export type CounselorDocumentResult =
  | { ok: true; versionNumber: number }
  | { ok: false; error: string };

function stepForDocumentType(type: GuidanceDocumentType): GuidanceJourneyStepId {
  return type === GuidanceDocumentType.EXAM_RESULT ? 5 : 1;
}

export async function replaceGuidanceDocumentAsCounselor(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  publicId: string;
  documentType: "FINAL_GRADES" | "EXAM_RESULT";
  file: File;
  reason: string;
}): Promise<CounselorDocumentResult> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      id: params.planId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, publicId: true },
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const validated = await validateFormUploadFile(params.file, UPLOAD_CONFIG);
  if (!validated.ok) return { ok: false, error: validated.error };

  const storageKey = generatePrivateGuidanceUploadStorageKey(validated.extension);
  const written = await writeMediaFile({
    storageKey,
    data: validated.buffer,
  });

  const documentType =
    params.documentType === "EXAM_RESULT"
      ? GuidanceDocumentType.EXAM_RESULT
      : GuidanceDocumentType.FINAL_GRADES;

  const versionNumber = await prisma.$transaction(async (tx) => {
    const latest = await tx.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: plan.id,
        documentType,
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
    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    const media = await tx.mediaAsset.create({
      data: {
        organizationId: params.organizationId,
        storageKey,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        byteSize: written.byteSize,
        checksum: written.checksum,
        status: MediaAssetStatus.ACTIVE,
        createdByUserId: params.actorUserId,
        metadata: {
          kind: "guidance-document",
          documentType,
          planPublicId: plan.publicId,
          replacedByCounselor: true,
        },
      },
      select: { id: true },
    });
    await tx.guidanceDocument.create({
      data: {
        organizationId: params.organizationId,
        planId: plan.id,
        mediaAssetId: media.id,
        documentType,
        versionNumber: nextVersion,
        isLatest: true,
        originalFilename: validated.originalName,
        mimeType: validated.mimeType,
        fileSizeBytes: written.byteSize,
        checksum: written.checksum,
        verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.GUIDANCE_DOCUMENT_REPLACED,
        entityType: "GuidanceDocument",
        entityId: plan.id,
        metadata: {
          planPublicId: plan.publicId,
          documentType,
          versionNumber: nextVersion,
          reason: params.reason,
        },
      },
    });
    return nextVersion;
  });

  await recordDocumentReviewEvent({
    organizationId: params.organizationId,
    planId: plan.id,
    stepNumber: stepForDocumentType(documentType),
    actorUserId: params.actorUserId,
    kind: "DOCUMENT_REPLACED",
    metadata: { documentType, versionNumber, reason: params.reason },
  });

  return { ok: true, versionNumber };
}

export async function verifyGuidanceDocumentAsCounselor(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  documentId: string;
  decision: "VERIFIED" | "REJECTED";
  note?: string;
}): Promise<CounselorDocumentResult> {
  const doc = await prisma.guidanceDocument.findFirst({
    where: {
      id: params.documentId,
      organizationId: params.organizationId,
      planId: params.planId,
      deletedAt: null,
    },
    select: { id: true, documentType: true, versionNumber: true },
  });
  if (!doc) return { ok: false, error: "مدرک یافت نشد." };

  const status =
    params.decision === "VERIFIED"
      ? GuidanceDocumentVerificationStatus.VERIFIED
      : GuidanceDocumentVerificationStatus.REJECTED;

  await prisma.guidanceDocument.update({
    where: { id: doc.id },
    data: {
      verificationStatus: status,
      verifiedByUserId: params.actorUserId,
      verifiedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidanceDocument",
      entityId: doc.id,
      metadata: {
        decision: params.decision,
        note: params.note ?? null,
        versionNumber: doc.versionNumber,
        documentType: doc.documentType,
      },
    },
  });

  await recordDocumentReviewEvent({
    organizationId: params.organizationId,
    planId: params.planId,
    stepNumber: stepForDocumentType(doc.documentType),
    actorUserId: params.actorUserId,
    kind: params.decision === "VERIFIED" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
    metadata: { documentId: doc.id, note: params.note ?? null },
  });

  return { ok: true, versionNumber: doc.versionNumber };
}
