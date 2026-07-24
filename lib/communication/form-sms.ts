/**
 * Form submission confirmation SMS enqueue (optional).
 * Failures never fail form submission. Idempotent per submission.
 */

import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import {
  FormFieldSemantic,
  SmsTemplatePurpose,
} from "@/generated/prisma/enums";
import { parseFormVersionSettings } from "@/lib/forms/form-version-settings";
import { prisma } from "@/lib/prisma";

const DEFAULT_FORM_BODY =
  "پاسخ شما با موفقیت ثبت شد. از همراهی شما سپاسگزاریم.";

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
    if (!settings.confirmationSmsEnabled) return;

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

    if (!submission?.normalizedMobile) return;
    // Public submission validation never stores hidden-field answers. Restricting
    // this lookup to the field semantic prevents arbitrary answer values from
    // becoming template parameters.
    const firstName = (
      submission.answers[0]?.valueText ??
      submission.answers[0]?.valueLongText ??
      ""
    ).trim();
    if (!firstName) return;

    const trackingCode = submission.trackingCode?.trim() || submission.id;

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

    const body = renderSmsTemplate(template?.body ?? DEFAULT_FORM_BODY, {
      formTitle: submission.formVersion.title,
    });

    await enqueueSms({
      organizationId: params.organizationId,
      toMobile: submission.normalizedMobile,
      body,
      purpose: "form_confirmation",
      idempotencyKey: `form_confirmation:${submission.id}`,
      templateId: template?.id ?? null,
      relatedType: "FormSubmission",
      relatedId: submission.id,
      templateDelivery: {
        version: 1,
        kind: "form",
        variables: {
          name: firstName,
          tracking: trackingCode,
        },
      },
    });
  } catch {
    // SMS must never fail the form submission path.
  }
}
