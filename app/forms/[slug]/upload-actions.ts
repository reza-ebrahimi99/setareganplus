"use server";

import { FormFieldType, FormVersionStatus } from "@/generated/prisma/enums";
import { readFileUploadConfig } from "@/lib/forms/file-upload-config";
import { requireRegistrationFormMode } from "@/lib/forms/require-registration-mode";
import {
  buildFormFileUploadMetadata,
  formFileUploadMetadataToJson,
  validateFormUploadFile,
  writeValidatedFormUpload,
} from "@/lib/media/form-file-upload";
import { tryUnlinkMediaFile } from "@/lib/media/storage";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export type UploadPublicFormFileResult =
  | {
      ok: true;
      file: {
        /** Secure reference — use auth-gated admin download, never a public /media URL. */
        mediaAssetId: string;
        originalName: string;
        mimeType: string;
        byteSize: number;
      };
    }
  | { ok: false; error: string };

/**
 * Public (unauthenticated) upload for published REGISTRATION form FILE_UPLOAD fields.
 * Creates an org-scoped private MediaAsset tagged for later Student association.
 */
export async function uploadPublicFormFileAction(
  slug: string,
  formData: FormData,
): Promise<UploadPublicFormFileResult> {
  const fieldKey = String(formData.get("fieldKey") ?? "").trim();
  const fileValue = formData.get("file");

  if (!fieldKey) {
    return { ok: false, error: "کلید فیلد نامعتبر است." };
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return { ok: false, error: "سامانه موقتاً در دسترس نیست." };
  }

  const form = await prisma.form.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
      mode: true,
      publishedVersionId: true,
    },
  });

  if (!form?.publishedVersionId) {
    return { ok: false, error: "این فرم برای بارگذاری فعال نیست." };
  }

  const modeCheck = requireRegistrationFormMode(form.mode);
  if (!modeCheck.ok) {
    return { ok: false, error: modeCheck.formError };
  }

  const version = await prisma.formVersion.findFirst({
    where: {
      id: form.publishedVersionId,
      organizationId: organization.id,
      formId: form.id,
      status: FormVersionStatus.PUBLISHED,
    },
    select: {
      id: true,
      fields: {
        where: { fieldKey },
        select: {
          id: true,
          fieldKey: true,
          type: true,
          config: true,
        },
        take: 1,
      },
    },
  });

  const field = version?.fields[0];
  if (!version || !field || field.type !== FormFieldType.FILE_UPLOAD) {
    return { ok: false, error: "فیلد بارگذاری یافت نشد." };
  }

  const config = readFileUploadConfig(field.config);
  const validated = await validateFormUploadFile(
    fileValue instanceof File ? fileValue : null,
    config,
  );
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  let storageKey: string | null = null;
  try {
    const written = await writeValidatedFormUpload({ validated });
    storageKey = written.storageKey;
    const metadata = buildFormFileUploadMetadata({
      formId: form.id,
      formVersionId: version.id,
      fieldKey: field.fieldKey,
    });

    const media = await prisma.mediaAsset.create({
      data: {
        organizationId: organization.id,
        storageKey: written.storageKey,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        byteSize: written.byteSize,
        checksum: written.checksum,
        category: "form-upload",
        metadata: formFileUploadMetadataToJson(metadata),
        status: "ACTIVE",
      },
      select: { id: true },
    });

    return {
      ok: true,
      file: {
        mediaAssetId: media.id,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        byteSize: written.byteSize,
      },
    };
  } catch {
    if (storageKey) {
      await tryUnlinkMediaFile(storageKey);
    }
    return {
      ok: false,
      error: "بارگذاری فایل با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    };
  }
}
