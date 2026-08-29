/**
 * Guidance ERP — versioned final-grades document upload (private MediaAsset).
 */

import {
  AuditAction,
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
  GuidancePlanStatus,
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

export type UploadFinalGradesResult =
  | {
      ok: true;
      versionNumber: number;
      verificationStatus: "PENDING";
      replaced: boolean;
    }
  | { ok: false; error: string };

const UPLOAD_CONFIG = {
  multiple: false,
  maxFiles: 1,
  maxBytes: FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
  allowedMimeTypes: [...FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES],
};

/**
 * Append a new FINAL_GRADES version (or first upload). Marks prior latest inactive.
 * Sets plan status to FINAL_GRADES_UPLOADED; verification stays PENDING.
 */
export async function uploadGuidanceFinalGrades(params: {
  organizationId: string;
  planId: string;
  userId: string;
  file: File;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<UploadFinalGradesResult> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      id: params.planId,
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
    },
    select: { id: true, status: true, publicId: true },
  });
  if (!plan) {
    return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };
  }

  const validated = await validateFormUploadFile(params.file, UPLOAD_CONFIG);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey(
    validated.extension,
  );
  const written = await writeMediaFile({
    storageKey,
    data: validated.buffer,
  });

  const result = await prisma.$transaction(async (tx) => {
    const latest = await tx.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: plan.id,
        documentType: GuidanceDocumentType.FINAL_GRADES,
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
    const replaced = Boolean(latest);

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
          documentType: GuidanceDocumentType.FINAL_GRADES,
          planPublicId: plan.publicId,
        },
      },
      select: { id: true },
    });

    await tx.guidanceDocument.create({
      data: {
        organizationId: params.organizationId,
        planId: plan.id,
        mediaAssetId: media.id,
        documentType: GuidanceDocumentType.FINAL_GRADES,
        versionNumber,
        isLatest: true,
        originalFilename: validated.originalName,
        mimeType: validated.mimeType,
        fileSizeBytes: written.byteSize,
        checksum: written.checksum,
        verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
      },
    });

    const previousStatus = plan.status;
    if (previousStatus !== GuidancePlanStatus.FINAL_GRADES_UPLOADED) {
      await tx.guidancePlan.update({
        where: { id: plan.id },
        data: { status: GuidancePlanStatus.FINAL_GRADES_UPLOADED },
      });
      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actorUserId: params.userId,
          action: AuditAction.GUIDANCE_STATUS_CHANGED,
          entityType: "GuidancePlan",
          entityId: plan.id,
          metadata: {
            from: previousStatus,
            to: GuidancePlanStatus.FINAL_GRADES_UPLOADED,
            publicId: plan.publicId,
          },
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.userId,
        action: replaced
          ? AuditAction.GUIDANCE_DOCUMENT_REPLACED
          : AuditAction.GUIDANCE_DOCUMENT_UPLOADED,
        entityType: "GuidanceDocument",
        entityId: plan.id,
        metadata: {
          planPublicId: plan.publicId,
          documentType: GuidanceDocumentType.FINAL_GRADES,
          versionNumber,
          mediaAssetId: media.id,
          verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return { versionNumber, replaced };
  });

  return {
    ok: true,
    versionNumber: result.versionNumber,
    verificationStatus: "PENDING",
    replaced: result.replaced,
  };
}
