/**
 * Public + admin registration document helpers.
 */

import { randomBytes } from "node:crypto";
import {
  MediaAssetStatus,
  RegistrationActivityType,
  RegistrationDocumentReviewStatus,
  RegistrationDocumentType,
} from "@/generated/prisma/enums";
import { processLibraryImageUpload } from "@/lib/media/library-image";
import {
  publicUrlForStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { recordRegistrationActivity } from "@/lib/registration/activity";

function registrationStorageKey(extension: string): string {
  const name = randomBytes(16).toString("hex");
  return `registrations/${name}.${extension}`;
}

export async function uploadRegistrationDocument(params: {
  resumeToken: string;
  documentType: RegistrationDocumentType;
  file: File;
}): Promise<
  | {
      ok: true;
      documentId: string;
      publicUrl: string;
      documentType: RegistrationDocumentType;
    }
  | { ok: false; error: string }
> {
  const organization = await getCurrentOrganization();
  const registration = await prisma.registration.findFirst({
    where: {
      organizationId: organization.id,
      resumeToken: params.resumeToken,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!registration) {
    return { ok: false, error: "ثبت‌نام برای بارگذاری مدرک یافت نشد." };
  }

  const processed = await processLibraryImageUpload(params.file);
  if (!processed.ok) return processed;

  const storageKey = registrationStorageKey(processed.extension);
  const written = await writeMediaFile({
    storageKey,
    data: processed.buffer,
  });

  const media = await prisma.mediaAsset.create({
    data: {
      organizationId: organization.id,
      storageKey,
      originalName: processed.originalName,
      mimeType: processed.mimeType,
      byteSize: written.byteSize,
      checksum: written.checksum,
      width: processed.width,
      height: processed.height,
      altText: REGISTRATION_DOC_ALT[params.documentType],
      title: REGISTRATION_DOC_ALT[params.documentType],
      status: MediaAssetStatus.ACTIVE,
      metadata: { kind: "registration-document" },
    },
    select: { id: true, storageKey: true },
  });

  const doc = await prisma.registrationDocument.create({
    data: {
      organizationId: organization.id,
      registrationId: registration.id,
      mediaAssetId: media.id,
      documentType: params.documentType,
      reviewStatus: RegistrationDocumentReviewStatus.PENDING,
    },
    select: { id: true, documentType: true },
  });

  await recordRegistrationActivity({
    organizationId: organization.id,
    registrationId: registration.id,
    activityType: RegistrationActivityType.DOCUMENT_UPLOADED,
    title: "مدرک بارگذاری شد",
    summary: doc.documentType,
    metadata: { documentId: doc.id, documentType: doc.documentType },
  });

  return {
    ok: true,
    documentId: doc.id,
    publicUrl: publicUrlForStorageKey(media.storageKey),
    documentType: doc.documentType,
  };
}

const REGISTRATION_DOC_ALT: Record<RegistrationDocumentType, string> = {
  STUDENT_PHOTO: "عکس دانش‌آموز",
  NATIONAL_CARD: "کارت ملی",
  BIRTH_CERTIFICATE: "شناسنامه",
  PARENT_CONSENT: "رضایت‌نامه ولی",
  OTHER: "مدرک پیوست",
};

export async function reviewRegistrationDocument(params: {
  organizationId: string;
  documentId: string;
  actorUserId: string;
  reviewStatus: RegistrationDocumentReviewStatus;
  reviewNote?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const doc = await prisma.registrationDocument.findFirst({
    where: {
      id: params.documentId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, registrationId: true },
  });
  if (!doc) return { ok: false, error: "مدرک یافت نشد." };

  await prisma.registrationDocument.update({
    where: { id: doc.id },
    data: {
      reviewStatus: params.reviewStatus,
      reviewNote: params.reviewNote?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: params.actorUserId,
    },
  });

  await recordRegistrationActivity({
    organizationId: params.organizationId,
    registrationId: doc.registrationId,
    activityType: RegistrationActivityType.DOCUMENT_REVIEWED,
    title:
      params.reviewStatus === RegistrationDocumentReviewStatus.APPROVED
        ? "مدرک تأیید شد"
        : "مدرک رد شد",
    actorUserId: params.actorUserId,
    metadata: {
      documentId: doc.id,
      reviewStatus: params.reviewStatus,
    },
  });

  return { ok: true };
}
