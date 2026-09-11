/**
 * Versioned GuidanceDocument upload — reuses GuidanceDocument + MediaAsset.
 */

import {
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

const UPLOAD_CONFIG = {
  multiple: false,
  maxFiles: 1,
  maxBytes: FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
  allowedMimeTypes: [...FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES],
};

export type GuidanceV2DocumentUploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function uploadGuidanceTypedDocument(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
  userId: string;
  file: File;
  documentType: GuidanceDocumentType;
}): Promise<GuidanceV2DocumentUploadResult> {
  const validated = await validateFormUploadFile(params.file, UPLOAD_CONFIG);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: { file: validated.error },
    };
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey(validated.extension);
  const written = await writeMediaFile({ storageKey, data: validated.buffer });

  const documentId = await prisma.$transaction(async (tx) => {
    const latest = await tx.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: params.planId,
        documentType: params.documentType,
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
          documentType: params.documentType,
          planPublicId: params.planPublicId,
        },
      },
      select: { id: true },
    });

    const created = await tx.guidanceDocument.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        mediaAssetId: media.id,
        documentType: params.documentType,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        isLatest: true,
        originalFilename: validated.originalName,
        mimeType: validated.mimeType,
        fileSizeBytes: written.byteSize,
        checksum: written.checksum,
        verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
      },
      select: { id: true },
    });

    return created.id;
  });

  return { ok: true, documentId };
}

export async function loadLatestGuidanceDocument(params: {
  organizationId: string;
  planId: string;
  documentType: GuidanceDocumentType;
}) {
  return prisma.guidanceDocument.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      documentType: params.documentType,
      isLatest: true,
      deletedAt: null,
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      createdAt: true,
      verificationStatus: true,
      reviewNote: true,
    },
  });
}
