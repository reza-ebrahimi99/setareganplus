"use server";

import { redirect } from "next/navigation";
import {
  DuplicatePolicy,
  FormSubmissionStatus,
  FormVersionStatus,
} from "@/generated/prisma/enums";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { resolveSubmissionBranch } from "@/lib/forms/resolve-submission-branch";
import {
  validatePublicSubmission,
  type PreservedFieldValue,
} from "@/lib/forms/validate-public-submission";
import { prisma } from "@/lib/prisma";

export type SubmitPublicFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, PreservedFieldValue>;
};

const HONEYPOT_FIELD = "company_url";
const LOADED_AT_FIELD = "_formLoadedAt";
/** Low-risk timing gate — forgeable; not a substitute for production rate limits. */
const MIN_FILL_MS = 1200;

/**
 * DuplicatePolicy mapping (schema-backed, documented for 3.4B-4):
 * - BLOCK: reject when a non-deleted same-form submission shares normalizedMobile
 *   (preferred) or email when mobile is absent.
 * - FLAG_AND_ACCEPT: accept, set isDuplicateInForm=true, status=DUPLICATE,
 *   and link duplicateOfSubmissionId when a prior match exists.
 * - ALLOW_SILENT: accept without duplicate flags.
 *
 * TODO(abuse): Add server-side rate limiting / CAPTCHA before production exposure.
 */

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitPublicFormAction(
  slug: string,
  _prevState: SubmitPublicFormState,
  formData: FormData,
): Promise<SubmitPublicFormState> {
  // Public unauthenticated write path — published-version + org-scoped only.

  const honeypot = readString(formData, HONEYPOT_FIELD).trim();
  if (honeypot.length > 0) {
    return {
      formError: "ارسال فرم معتبر نبود. لطفاً دوباره تلاش کنید.",
    };
  }

  const loadedAtRaw = readString(formData, LOADED_AT_FIELD).trim();
  const loadedAt = Number(loadedAtRaw);
  if (
    !Number.isFinite(loadedAt) ||
    loadedAt <= 0 ||
    Date.now() - loadedAt < MIN_FILL_MS
  ) {
    return {
      formError: "ارسال فرم خیلی سریع انجام شد. لطفاً دوباره تلاش کنید.",
    };
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return {
      formError: "سامانه موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
    };
  }

  const form = await prisma.form.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      branchId: true,
      publishedVersionId: true,
    },
  });

  if (!form || !form.publishedVersionId) {
    return {
      formError: "این فرم هم‌اکنون برای ثبت پاسخ فعال نیست.",
    };
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
      duplicatePolicy: true,
      fields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          fieldKey: true,
          type: true,
          label: true,
          required: true,
          config: true,
        },
      },
    },
  });

  if (!version) {
    return {
      formError: "نسخه منتشرشده فرم یافت نشد. لطفاً بعداً دوباره تلاش کنید.",
    };
  }

  const validated = validatePublicSubmission(version.fields, formData);
  if (!validated.ok) {
    return {
      formError: validated.formError,
      fieldErrors: validated.fieldErrors,
      values: validated.values,
    };
  }

  const branch = await resolveSubmissionBranch({
    organizationId: organization.id,
    formBranchId: form.branchId,
  });

  if (!branch) {
    return {
      formError:
        "شعبه پیش‌فرض برای ثبت پاسخ پیکربندی نشده است. لطفاً با پشتیبانی تماس بگیرید.",
      values: validated.values,
    };
  }

  let duplicateOfId: string | null = null;
  let isDuplicateInForm = false;
  let status: typeof FormSubmissionStatus.RECEIVED | typeof FormSubmissionStatus.DUPLICATE =
    FormSubmissionStatus.RECEIVED;

  const duplicateWhere =
    validated.normalizedMobile || validated.email
      ? {
          organizationId: organization.id,
          formId: form.id,
          deletedAt: null,
          OR: [
            ...(validated.normalizedMobile
              ? [{ normalizedMobile: validated.normalizedMobile }]
              : []),
            ...(validated.email ? [{ email: validated.email }] : []),
          ],
        }
      : null;

  if (duplicateWhere && duplicateWhere.OR.length > 0) {
    const prior = await prisma.formSubmission.findFirst({
      where: duplicateWhere,
      orderBy: { submittedAt: "asc" },
      select: { id: true },
    });

    if (prior) {
      if (version.duplicatePolicy === DuplicatePolicy.BLOCK) {
        return {
          formError:
            "با این مشخصات قبلاً در این فرم ثبت‌نام شده است و ثبت تکراری مجاز نیست.",
          values: validated.values,
        };
      }

      if (version.duplicatePolicy === DuplicatePolicy.FLAG_AND_ACCEPT) {
        isDuplicateInForm = true;
        status = FormSubmissionStatus.DUPLICATE;
        duplicateOfId = prior.id;
      }
      // ALLOW_SILENT: proceed without flags
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Reconfirm live published pointer inside the write transaction.
      const liveForm = await tx.form.findFirst({
        where: {
          id: form.id,
          organizationId: organization.id,
          deletedAt: null,
          publishedVersionId: version.id,
        },
        select: { id: true },
      });

      if (!liveForm) {
        throw new Error("FORM_NO_LONGER_PUBLISHED");
      }

      const liveVersion = await tx.formVersion.findFirst({
        where: {
          id: version.id,
          organizationId: organization.id,
          formId: form.id,
          status: FormVersionStatus.PUBLISHED,
        },
        select: { id: true },
      });

      if (!liveVersion) {
        throw new Error("FORM_NO_LONGER_PUBLISHED");
      }

      const submission = await tx.formSubmission.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          formId: form.id,
          formVersionId: version.id,
          status,
          mobile: validated.mobile,
          mobileRaw: validated.mobileRaw,
          normalizedMobile: validated.normalizedMobile,
          email: validated.email,
          isDuplicateInForm,
          duplicateOfSubmissionId: duplicateOfId,
        },
        select: { id: true },
      });

      if (validated.answers.length > 0) {
        await tx.formAnswer.createMany({
          data: validated.answers.map((answer) => ({
            organizationId: organization.id,
            submissionId: submission.id,
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORM_NO_LONGER_PUBLISHED") {
      return {
        formError: "این فرم دیگر برای ثبت پاسخ فعال نیست.",
        values: validated.values,
      };
    }

    return {
      formError: "ثبت پاسخ با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values: validated.values,
    };
  }

  redirect(`/forms/${form.slug}/success`);
}
