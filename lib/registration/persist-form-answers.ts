/**
 * Persist Form Builder answers for a Registration (no schema migration).
 * Links via Registration.metadata.formSubmissionId.
 */

import { FormSubmissionStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import {
  validatePublicSubmission,
  type PreservedFieldValue,
} from "@/lib/forms/validate-public-submission";
import type { PublicFormField } from "@/lib/forms/load-public-form";

export type PersistRegistrationFormAnswersResult =
  | { ok: true; formSubmissionId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function answersRecordToFormData(
  answers: Record<string, PreservedFieldValue>,
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(answers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item);
      }
      continue;
    }
    if (typeof value === "boolean") {
      if (value) formData.set(key, "yes");
      continue;
    }
    if (typeof value === "object") {
      formData.set(key, JSON.stringify(value));
      continue;
    }
    formData.set(key, String(value));
  }
  return formData;
}

async function resolveBranchId(organizationId: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { organizationId, isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!branch) {
    throw new Error("هیچ شعبه فعالی برای سازمان یافت نشد.");
  }
  return branch.id;
}

export async function persistRegistrationFormAnswers(params: {
  registrationId: string;
  formId: string;
  formVersionId: string;
  fields: PublicFormField[];
  answers: Record<string, PreservedFieldValue>;
  mobileNormalized: string | null;
  email: string | null;
}): Promise<PersistRegistrationFormAnswersResult> {
  const organization = await getCurrentOrganization();

  const formData = answersRecordToFormData(params.answers);
  const validated = validatePublicSubmission(params.fields, formData);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.formError ?? "لطفاً خطاهای فرم تکمیلی را برطرف کنید.",
      fieldErrors: validated.fieldErrors,
    };
  }

  const branchId = await resolveBranchId(organization.id);

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.formSubmission.create({
      data: {
        organizationId: organization.id,
        branchId,
        formId: params.formId,
        formVersionId: params.formVersionId,
        status: FormSubmissionStatus.RECEIVED,
        mobile: validated.mobile,
        mobileRaw: validated.mobileRaw,
        normalizedMobile: validated.normalizedMobile ?? params.mobileNormalized,
        email: validated.email ?? params.email,
        metadata: {
          source: "registration_wizard",
          registrationId: params.registrationId,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    if (validated.answers.length > 0) {
      await tx.formAnswer.createMany({
        data: validated.answers.map((answer) => ({
          organizationId: organization.id,
          submissionId: created.id,
          fieldId: answer.fieldId,
          fieldKey: answer.fieldKey,
          valueText: answer.valueText ?? null,
          valueLongText: answer.valueLongText ?? null,
          valueNumber: answer.valueNumber ?? null,
          valueDate: answer.valueDate ?? null,
          valueJson: answer.valueJson ?? undefined,
        })),
      });
    }

    const registration = await tx.registration.findFirst({
      where: {
        id: params.registrationId,
        organizationId: organization.id,
        deletedAt: null,
      },
      select: { id: true, metadata: true },
    });
    if (registration) {
      const prev =
        registration.metadata &&
        typeof registration.metadata === "object" &&
        !Array.isArray(registration.metadata)
          ? (registration.metadata as Record<string, unknown>)
          : {};
      await tx.registration.update({
        where: { id: registration.id },
        data: {
          metadata: {
            ...prev,
            formSubmissionId: created.id,
            formId: params.formId,
            formVersionId: params.formVersionId,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return created;
  });

  return { ok: true, formSubmissionId: submission.id };
}
