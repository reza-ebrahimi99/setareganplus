import { FormFieldType } from "@/generated/prisma/enums";
import {
  isFormFileUploadMetadata,
} from "@/lib/media/form-file-upload";
import type { FormFileUploadAnswer } from "@/lib/forms/file-upload-config";
import type {
  SubmissionFieldDefinition,
  ValidatedAnswerRow,
} from "@/lib/forms/validate-public-submission";
import { prisma } from "@/lib/prisma";

/**
 * Server-side ownership check for FILE_UPLOAD answers.
 * Ensures media assets belong to this org/form/version/field and were
 * created by the public form upload pipeline.
 */
export async function assertFormFileUploadAnswers(params: {
  organizationId: string;
  formId: string;
  formVersionId: string;
  fields: SubmissionFieldDefinition[];
  answers: ValidatedAnswerRow[];
}): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const fieldErrors: Record<string, string> = {};
  const fileFields = params.fields.filter(
    (field) => field.type === FormFieldType.FILE_UPLOAD,
  );
  if (fileFields.length === 0) {
    return { ok: true };
  }

  for (const field of fileFields) {
    const answer = params.answers.find((row) => row.fieldKey === field.fieldKey);
    if (!answer?.valueJson) {
      continue;
    }
    const payload = answer.valueJson as FormFileUploadAnswer;
    if (!payload.files || payload.files.length === 0) {
      continue;
    }

    for (const file of payload.files) {
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: file.mediaAssetId,
          organizationId: params.organizationId,
          deletedAt: null,
          status: "ACTIVE",
        },
        select: {
          id: true,
          mimeType: true,
          byteSize: true,
          originalName: true,
          metadata: true,
        },
      });

      if (!asset || !isFormFileUploadMetadata(asset.metadata)) {
        fieldErrors[field.fieldKey] =
          `فایل بارگذاری‌شده برای «${field.label}» نامعتبر است. دوباره بارگذاری کنید.`;
        break;
      }

      if (
        asset.metadata.formId !== params.formId ||
        asset.metadata.formVersionId !== params.formVersionId ||
        asset.metadata.fieldKey !== field.fieldKey
      ) {
        fieldErrors[field.fieldKey] =
          `فایل «${field.label}» به این فرم تعلق ندارد.`;
        break;
      }

      if (
        asset.mimeType !== file.mimeType ||
        asset.byteSize !== file.byteSize ||
        asset.originalName !== file.originalName
      ) {
        fieldErrors[field.fieldKey] =
          `اطلاعات فایل «${field.label}» دست‌کاری شده است. دوباره بارگذاری کنید.`;
        break;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true };
}
