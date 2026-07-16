/**
 * Form submission confirmation SMS enqueue (optional).
 * Failures never fail form submission. Idempotent per submission.
 */

import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
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
        normalizedMobile: true,
        formVersion: { select: { title: true } },
      },
    });

    if (!submission?.normalizedMobile) return;

    const template = await prisma.smsTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        code: "form_confirmation",
        isActive: true,
        deletedAt: null,
      },
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
    });
  } catch {
    // SMS must never fail the form submission path.
  }
}
