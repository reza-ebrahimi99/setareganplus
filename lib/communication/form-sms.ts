/**
 * Form submission confirmation SMS enqueue (optional).
 * Failures never fail form submission. Idempotent per submission + recipient.
 */

import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import {
  truncateSmsParam,
} from "@/lib/communication/sms-params";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import {
  FormFieldSemantic,
  SmsTemplatePurpose,
} from "@/generated/prisma/enums";
import { parseFormVersionSettings } from "@/lib/forms/form-version-settings";
import { prisma } from "@/lib/prisma";

const DEFAULT_FORM_BODY =
  "پاسخ شما با موفقیت ثبت شد. کد پیگیری: {{trackingCode}} — {{date}}";

const DEFAULT_ADMIN_FORM_BODY =
  "ثبت فرم جدید: {{formTitle}} — کد: {{trackingCode}} — {{date}}";

export async function enqueueFormConfirmationSms(params: {
  organizationId: string;
  submissionId: string;
  formVersionId: string;
}): Promise<void> {
  try {
    const version = await prisma.formVersion.findFirst({
      where: {
        id: params.formVersionId,
        organizationId: params.organizationId,
      },
      select: { settings: true },
    });
    if (!version) return;

    const settings = parseFormVersionSettings(version.settings);
    if (
      !settings.confirmationSmsEnabled &&
      !settings.adminNotificationSmsEnabled
    ) {
      return;
    }

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: params.submissionId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        trackingCode: true,
        normalizedMobile: true,
        submittedAt: true,
        formVersion: { select: { title: true } },
        answers: {
          where: {
            field: { semantic: FormFieldSemantic.FIRST_NAME },
          },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            valueText: true,
            valueLongText: true,
          },
        },
      },
    });

    if (!submission) return;

    // Public submission validation never stores hidden-field answers. Restricting
    // this lookup to the field semantic prevents arbitrary answer values from
    // becoming template parameters.
    const firstName = (
      submission.answers[0]?.valueText ??
      submission.answers[0]?.valueLongText ??
      ""
    ).trim();
    const trackingCode = submission.trackingCode?.trim() || submission.id;
    const submittedAtJalali = formatJalaliDateShort(submission.submittedAt);
    const formTitle = truncateSmsParam(submission.formVersion.title);
    const nameParam = truncateSmsParam(firstName);
    const trackingParam = truncateSmsParam(trackingCode);

    const template = await prisma.smsTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        purpose: SmsTemplatePurpose.FORM_CONFIRMATION,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, body: true },
    });

    const bodyVariables: Record<string, string> = {
      formTitle,
      trackingCode: trackingParam,
      date: submittedAtJalali,
      name: nameParam,
    };

    if (
      settings.confirmationSmsEnabled &&
      submission.normalizedMobile &&
      firstName
    ) {
      const body = renderSmsTemplate(
        template?.body ?? DEFAULT_FORM_BODY,
        bodyVariables,
      );

      await enqueueSms({
        organizationId: params.organizationId,
        toMobile: submission.normalizedMobile,
        body,
        purpose: "form_submitted",
        idempotencyKey: `form_submitted:${submission.id}:user`,
        templateId: template?.id ?? null,
        relatedType: "FormSubmission",
        relatedId: submission.id,
        templateDelivery: {
          version: 1,
          kind: "form",
          variables: {
            name: nameParam,
            tracking: trackingParam,
          },
        },
        metadata: {
          ...(settings.smsTemplateCode
            ? { smsTemplateCode: settings.smsTemplateCode }
            : {}),
        },
      });
    }

    if (
      settings.adminNotificationSmsEnabled &&
      settings.adminSmsRecipients.length > 0
    ) {
      const adminBody = renderSmsTemplate(
        DEFAULT_ADMIN_FORM_BODY,
        bodyVariables,
      );

      for (const recipient of settings.adminSmsRecipients) {
        await enqueueSms({
          organizationId: params.organizationId,
          toMobile: recipient,
          body: adminBody,
          purpose: "form_submitted",
          idempotencyKey: `form_submitted:${submission.id}:admin:${recipient}`,
          templateId: template?.id ?? null,
          relatedType: "FormSubmission",
          relatedId: submission.id,
          templateDelivery: {
            version: 1,
            kind: "form",
            variables: {
              name: nameParam || formTitle,
              tracking: trackingParam,
            },
          },
          metadata: {
            recipientRole: "admin",
            ...(settings.smsTemplateCode
              ? { smsTemplateCode: settings.smsTemplateCode }
              : {}),
          },
        });
      }
    }
  } catch (error) {
    console.error(
      "[form-sms] enqueue failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}
