/**
 * Registration completed SMS enqueue (optional).
 * Failures never fail registration. Idempotent per registration + recipient.
 */

import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import { truncateSmsParam } from "@/lib/communication/sms-params";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { SmsTemplatePurpose } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeRegistrationFlowSlug } from "@/lib/registration/flows/slug";

const DEFAULT_REGISTRATION_BODY =
  "ثبت‌نام شما با موفقیت ثبت شد. کد پیگیری: {{trackingCode}}";

const DEFAULT_ADMIN_REGISTRATION_BODY =
  "ثبت‌نام جدید: {{name}} — کد: {{trackingCode}} — {{date}}";

export async function enqueueRegistrationCompletedSms(params: {
  organizationId: string;
  registrationId: string;
}): Promise<void> {
  try {
    const registration = await prisma.registration.findFirst({
      where: {
        id: params.registrationId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        flowKey: true,
        studentFirstName: true,
        parentMobileNormalized: true,
        publicTrackingCode: true,
        registrationNumber: true,
        createdAt: true,
      },
    });
    if (!registration) return;

    const flow = await prisma.registrationFlow.findFirst({
      where: {
        organizationId: params.organizationId,
        slug: normalizeRegistrationFlowSlug(registration.flowKey),
        deletedAt: null,
      },
      select: {
        confirmationSmsEnabled: true,
        adminNotificationSmsEnabled: true,
        adminSmsRecipients: true,
        smsTemplateCode: true,
      },
    });
    if (!flow) return;

    if (
      !flow.confirmationSmsEnabled &&
      !flow.adminNotificationSmsEnabled
    ) {
      return;
    }

    const adminRecipients = Array.isArray(flow.adminSmsRecipients)
      ? flow.adminSmsRecipients.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [];

    const nameParam = truncateSmsParam(registration.studentFirstName ?? "");
    const trackingRaw =
      registration.publicTrackingCode?.trim() ||
      registration.registrationNumber;
    const trackingParam = truncateSmsParam(trackingRaw);
    const dateParam = formatJalaliDateShort(registration.createdAt);

    if (!nameParam || !trackingParam) return;

    const template = await prisma.smsTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        purpose: SmsTemplatePurpose.REGISTRATION_CONFIRMATION,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, body: true },
    });

    const bodyVariables: Record<string, string> = {
      name: nameParam,
      trackingCode: trackingParam,
      date: dateParam,
    };

    const templateDelivery = {
      version: 1 as const,
      kind: "form" as const,
      variables: {
        name: nameParam,
        tracking: trackingParam,
      },
    };

    if (
      flow.confirmationSmsEnabled &&
      registration.parentMobileNormalized
    ) {
      const body = renderSmsTemplate(
        template?.body ?? DEFAULT_REGISTRATION_BODY,
        bodyVariables,
      );

      await enqueueSms({
        organizationId: params.organizationId,
        toMobile: registration.parentMobileNormalized,
        body,
        purpose: "registration_completed",
        idempotencyKey: `registration_completed:${registration.id}:user`,
        templateId: template?.id ?? null,
        relatedType: "Registration",
        relatedId: registration.id,
        templateDelivery,
        metadata: {
          ...(flow.smsTemplateCode
            ? { smsTemplateCode: flow.smsTemplateCode }
            : {}),
        },
      });
    }

    if (flow.adminNotificationSmsEnabled && adminRecipients.length > 0) {
      const adminBody = renderSmsTemplate(
        DEFAULT_ADMIN_REGISTRATION_BODY,
        bodyVariables,
      );

      for (const recipient of adminRecipients) {
        await enqueueSms({
          organizationId: params.organizationId,
          toMobile: recipient,
          body: adminBody,
          purpose: "registration_completed",
          idempotencyKey: `registration_completed:${registration.id}:admin:${recipient}`,
          templateId: template?.id ?? null,
          relatedType: "Registration",
          relatedId: registration.id,
          templateDelivery,
          metadata: {
            recipientRole: "admin",
            ...(flow.smsTemplateCode
              ? { smsTemplateCode: flow.smsTemplateCode }
              : {}),
          },
        });
      }
    }
  } catch (error) {
    console.error(
      "[registration-sms] enqueue failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}
