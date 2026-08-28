"use server";

import { redirect } from "next/navigation";
import {
  DuplicatePolicy,
  FormSubmissionStatus,
  FormVersionStatus,
} from "@/generated/prisma/enums";
import {
  linkReservationToSubmission,
  readFormBookingSettings,
  validateBookingProof,
} from "@/lib/booking/form-gate";
import {
  assertCapacityAvailable,
  lockFormVersionCapacity,
} from "@/lib/forms/capacity";
import {
  AVAILABILITY_MESSAGES,
  evaluateFormAvailability,
} from "@/lib/forms/evaluate-form-availability";
import { enqueueFormConfirmationSms } from "@/lib/communication/form-sms";
import { processFormSubmissionCrm } from "@/lib/crm/form-to-lead";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { resolveSubmissionBranch } from "@/lib/forms/resolve-submission-branch";
import {
  validatePublicSubmission,
  type PreservedFieldValue,
} from "@/lib/forms/validate-public-submission";
import { assertFormFileUploadAnswers } from "@/lib/forms/assert-form-file-uploads";
import { prisma } from "@/lib/prisma";
import { allocateUniqueTrackingCode } from "@/lib/tracking/public-tracking-code";

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
 * DuplicatePolicy mapping (schema-backed):
 * - BLOCK: reject when a non-deleted same-form submission shares normalizedMobile
 *   (preferred) or email when mobile is absent.
 * - FLAG_AND_ACCEPT: accept, set isDuplicateInForm=true, status=DUPLICATE,
 *   and link duplicateOfSubmissionId when a prior match exists.
 * - ALLOW_SILENT: accept without duplicate flags.
 *
 * Capacity count: RECEIVED + DUPLICATE only (see lib/forms/capacity.ts).
 *
 * TODO(abuse): Add server-side rate limiting / CAPTCHA before production exposure.
 * TODO(auth): OTP / identity verification for national ID + mobile.
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
      formError: AVAILABILITY_MESSAGES.UNPUBLISHED_OR_PAUSED,
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
      opensAt: true,
      registrationDeadline: true,
      capacity: true,
      settings: true,
      fields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          fieldKey: true,
          type: true,
          label: true,
          required: true,
          config: true,
          visibilityConditions: true,
        },
      },
    },
  });

  if (!version) {
    return {
      formError: AVAILABILITY_MESSAGES.UNPUBLISHED_OR_PAUSED,
    };
  }

  // Pre-check schedule (capacity rechecked inside the write transaction).
  const preAvailability = evaluateFormAvailability({
    isPublishedLive: true,
    opensAt: version.opensAt,
    registrationDeadline: version.registrationDeadline,
    capacity: version.capacity,
    // Informational only — final capacity gate uses locked recount.
    usedCapacity: 0,
  });

  if (
    preAvailability.status === "NOT_OPEN_YET" ||
    preAvailability.status === "CLOSED_BY_DEADLINE"
  ) {
    return {
      formError: preAvailability.message ?? AVAILABILITY_MESSAGES.UNPUBLISHED_OR_PAUSED,
    };
  }

  const bookingSettings = readFormBookingSettings(version.settings);
  let bookingProofReservationId: string | null = null;
  let bookingServiceSlug: string | null = null;

  if (bookingSettings.enabled && bookingSettings.serviceId) {
    const bookingService = await prisma.bookingService.findFirst({
      where: {
        id: bookingSettings.serviceId,
        organizationId: organization.id,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, slug: true },
    });
    bookingServiceSlug = bookingService?.slug ?? null;

    if (
      bookingSettings.requireTiming === "before_submit" &&
      bookingService
    ) {
      const proof = readString(formData, "bookingProof").trim();
      const validatedProof = await validateBookingProof({
        organizationId: organization.id,
        serviceId: bookingService.id,
        proofToken: proof,
      });
      if (!validatedProof.ok) {
        return {
          formError: validatedProof.error,
        };
      }
      bookingProofReservationId = validatedProof.reservation.reservationId;
    }
  }

  const validated = validatePublicSubmission(version.fields, formData);
  if (!validated.ok) {
    return {
      formError: validated.formError,
      fieldErrors: validated.fieldErrors,
      values: validated.values,
    };
  }

  const fileAssert = await assertFormFileUploadAnswers({
    organizationId: organization.id,
    formId: form.id,
    formVersionId: version.id,
    fields: version.fields,
    answers: validated.answers,
  });
  if (!fileAssert.ok) {
    return {
      formError: "لطفاً خطاهای بارگذاری فایل را بررسی کنید.",
      fieldErrors: fileAssert.fieldErrors,
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
    }
  }

  let createdSubmissionId: string | null = null;
  let createdTrackingCode: string | null = null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      await lockFormVersionCapacity(tx, version.id);

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
        select: {
          id: true,
          opensAt: true,
          registrationDeadline: true,
          capacity: true,
        },
      });

      if (!liveVersion) {
        throw new Error("FORM_NO_LONGER_PUBLISHED");
      }

      const scheduleCheck = evaluateFormAvailability({
        isPublishedLive: true,
        opensAt: liveVersion.opensAt,
        registrationDeadline: liveVersion.registrationDeadline,
        capacity: null,
        usedCapacity: 0,
      });

      if (scheduleCheck.status === "NOT_OPEN_YET") {
        throw new Error("NOT_OPEN_YET");
      }
      if (scheduleCheck.status === "CLOSED_BY_DEADLINE") {
        throw new Error("CLOSED_BY_DEADLINE");
      }

      const capacityCheck = await assertCapacityAvailable(tx, {
        organizationId: organization.id,
        formId: form.id,
        formVersionId: version.id,
        capacity: liveVersion.capacity,
      });

      if (!capacityCheck.ok) {
        throw new Error("CAPACITY_FULL");
      }

      const trackingCode = await allocateUniqueTrackingCode({
        organizationId: organization.id,
        exists: async (code) => {
          const row = await tx.formSubmission.findFirst({
            where: { organizationId: organization.id, trackingCode: code },
            select: { id: true },
          });
          return Boolean(row);
        },
      });

      const submission = await tx.formSubmission.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          formId: form.id,
          formVersionId: version.id,
          status,
          trackingCode,
          mobile: validated.mobile,
          mobileRaw: validated.mobileRaw,
          normalizedMobile: validated.normalizedMobile,
          email: validated.email,
          isDuplicateInForm,
          duplicateOfSubmissionId: duplicateOfId,
        },
        select: { id: true, trackingCode: true },
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

      return {
        id: submission.id,
        trackingCode: submission.trackingCode!,
      };
    });

    createdSubmissionId = created.id;
    createdTrackingCode = created.trackingCode;

    if (bookingProofReservationId && createdSubmissionId) {
      await linkReservationToSubmission({
        organizationId: organization.id,
        reservationId: bookingProofReservationId,
        formSubmissionId: createdSubmissionId,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORM_NO_LONGER_PUBLISHED") {
        return {
          formError: AVAILABILITY_MESSAGES.UNPUBLISHED_OR_PAUSED,
          values: validated.values,
        };
      }
      if (error.message === "NOT_OPEN_YET") {
        return {
          formError: AVAILABILITY_MESSAGES.NOT_OPEN_YET,
          values: validated.values,
        };
      }
      if (error.message === "CLOSED_BY_DEADLINE") {
        return {
          formError: AVAILABILITY_MESSAGES.CLOSED_BY_DEADLINE,
          values: validated.values,
        };
      }
      if (error.message === "CAPACITY_FULL") {
        return {
          formError: AVAILABILITY_MESSAGES.CAPACITY_FULL,
          values: validated.values,
        };
      }
      if (error.message === "TRACKING_CODE_ALLOCATION_FAILED") {
        return {
          formError: "ثبت پاسخ با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
          values: validated.values,
        };
      }
    }

    return {
      formError: "ثبت پاسخ با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      values: validated.values,
    };
  }

  // Optional confirmation SMS — outside capacity transaction; never fails submission.
  if (createdSubmissionId) {
    await enqueueFormConfirmationSms({
      organizationId: organization.id,
      submissionId: createdSubmissionId,
      formVersionId: version.id,
    });
    await processFormSubmissionCrm({
      organizationId: organization.id,
      submissionId: createdSubmissionId,
      formId: form.id,
      formVersionId: version.id,
      branchId: branch.id,
    });
  }

  if (
    bookingSettings.enabled &&
    bookingSettings.requireTiming === "after_submit" &&
    bookingServiceSlug &&
    createdSubmissionId
  ) {
    redirect(
      `/book/${bookingServiceSlug}?afterForm=1&submissionId=${encodeURIComponent(createdSubmissionId)}&form=${encodeURIComponent(form.slug)}`,
    );
  }

  if (createdTrackingCode) {
    redirect(
      `/forms/${form.slug}/success?code=${encodeURIComponent(createdTrackingCode)}`,
    );
  }

  redirect(`/forms/${form.slug}/success`);
}
