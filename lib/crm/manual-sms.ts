import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  CrmActivityType,
  SmsMessageStatus,
  SmsTemplatePurpose,
} from "@/generated/prisma/enums";
import { sendPatternTemplate } from "@/lib/communication/send";
import {
  parseSmsTemplateVariables,
  renderSmsTemplate,
} from "@/lib/communication/template";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { recordCrmActivity } from "@/lib/crm/activity";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type CrmSmsTemplateOption = {
  id: string;
  name: string;
  body: string;
  variables: string[];
};

export type ManualSmsResult =
  | {
      ok: true;
      messageId: string;
      providerMessageId: string | null;
      message: string;
    }
  | { ok: false; error: string; messageId?: string };

type ManualSmsActor = {
  organizationId: string;
  branchId: string;
  userId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadCrmSmsTemplates(
  organizationId: string,
): Promise<CrmSmsTemplateOption[]> {
  const templates = await prisma.smsTemplate.findMany({
    where: {
      organizationId,
      purpose: SmsTemplatePurpose.CUSTOM,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }, { code: "asc" }],
    take: 50,
    select: { id: true, name: true, body: true, variables: true },
  });
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    body: template.body,
    variables: parseSmsTemplateVariables(template.variables),
  }));
}

function validateParameters(
  expected: readonly string[],
  input: Record<string, string>,
): { ok: true; parameters: Record<string, string> } | { ok: false; error: string } {
  const inputKeys = Object.keys(input);
  if (
    inputKeys.length !== expected.length ||
    inputKeys.some((key) => !expected.includes(key))
  ) {
    return { ok: false, error: "پارامترهای قالب پیامک کامل نیست." };
  }
  const parameters: Record<string, string> = {};
  for (const name of expected) {
    const value = input[name]?.trim() ?? "";
    if (!value || value.length > 25) {
      return {
        ok: false,
        error: `مقدار پارامتر ${name} باید بین ۱ تا ۲۵ نویسه باشد.`,
      };
    }
    parameters[name] = value;
  }
  return { ok: true, parameters };
}

async function existingAttemptResult(
  organizationId: string,
  idempotencyKey: string,
): Promise<ManualSmsResult | null> {
  const existing = await prisma.smsMessage.findFirst({
    where: { organizationId, idempotencyKey },
    select: {
      id: true,
      status: true,
      providerMessageId: true,
      lastError: true,
    },
  });
  if (!existing) return null;
  if (existing.status === SmsMessageStatus.SENT) {
    return {
      ok: true,
      messageId: existing.id,
      providerMessageId: existing.providerMessageId,
      message: "این پیامک قبلاً ارسال شده است.",
    };
  }
  if (
    existing.status === SmsMessageStatus.PROCESSING ||
    existing.status === SmsMessageStatus.PENDING
  ) {
    return {
      ok: false,
      messageId: existing.id,
      error: "ارسال این پیامک در حال انجام است.",
    };
  }
  return {
    ok: false,
    messageId: existing.id,
    error: existing.lastError ?? "ارسال قبلی این پیامک ناموفق بود.",
  };
}

export async function sendManualLeadSms(params: {
  actor: ManualSmsActor;
  leadId: string;
  templateId: string;
  parameters: Record<string, string>;
  idempotencyKey: string;
  resendOf?: string | null;
}): Promise<ManualSmsResult> {
  const key = params.idempotencyKey.trim();
  if (!key || key.length > 120) {
    return { ok: false, error: "شناسه درخواست ارسال معتبر نیست." };
  }

  const [lead, template] = await Promise.all([
    prisma.lead.findFirst({
      where: {
        id: params.leadId,
        organizationId: params.actor.organizationId,
        branchId: params.actor.branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
        normalizedMobile: true,
      },
    }),
    prisma.smsTemplate.findFirst({
      where: {
        id: params.templateId,
        organizationId: params.actor.organizationId,
        purpose: SmsTemplatePurpose.CUSTOM,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        body: true,
        variables: true,
      },
    }),
  ]);
  if (!lead) return { ok: false, error: "مخاطب یافت نشد یا دسترسی مجاز نیست." };
  if (!template) return { ok: false, error: "قالب پیامک فعال و معتبری انتخاب نشده است." };

  const mobile = normalizeIranianMobile(lead.normalizedMobile ?? lead.mobile);
  if (!mobile.ok) return { ok: false, error: "شماره موبایل مخاطب معتبر نیست." };

  const expectedVariables = parseSmsTemplateVariables(template.variables);
  const validated = validateParameters(expectedVariables, params.parameters);
  if (!validated.ok) return validated;
  const body = renderSmsTemplate(template.body, validated.parameters).trim();
  if (!body) return { ok: false, error: "پیش‌نمایش پیامک خالی است." };

  const idempotencyKey = `crm_manual_sms:${lead.id}:${key}`;
  const duplicate = await existingAttemptResult(
    params.actor.organizationId,
    idempotencyKey,
  );
  if (duplicate) return duplicate;

  let messageId: string;
  try {
    const message = await prisma.smsMessage.create({
      data: {
        organizationId: params.actor.organizationId,
        templateId: template.id,
        toMobile: mobile.normalized,
        body,
        status: SmsMessageStatus.PROCESSING,
        provider: readSmsProviderName(),
        purpose: "crm_manual",
        relatedType: "Lead",
        relatedId: lead.id,
        attemptCount: 1,
        maxAttempts: 1,
        idempotencyKey,
        metadata: {
          manual: true,
          templateCode: template.code,
          templateName: template.name,
          parameters: validated.parameters,
          actorUserId: params.actor.userId,
          ...(params.resendOf ? { resendOf: params.resendOf } : {}),
        },
      },
      select: { id: true },
    });
    messageId = message.id;
  } catch {
    return (
      (await existingAttemptResult(
        params.actor.organizationId,
        idempotencyKey,
      )) ?? { ok: false, error: "ثبت درخواست پیامک ممکن نشد." }
    );
  }

  const result = await sendPatternTemplate({
    toMobile: mobile.normalized,
    templateCode: template.code,
    parameters: validated.parameters,
    correlationId: messageId,
  });
  const sentAt = new Date();
  const activityMetadata = {
    manual: true,
    status: result.ok ? "sent" : "failed",
    smsMessageId: messageId,
    recipientMobile: mobile.normalized,
    templateName: template.name,
    templateCode: template.code,
    providerMessageId: result.providerMessageId,
    errorSummary: result.ok ? null : result.safeMessage,
    sentByUserId: params.actor.userId,
    sentTimestamp: sentAt.toISOString(),
    ...(params.resendOf ? { resendOf: params.resendOf } : {}),
  };

  await prisma.$transaction(async (tx) => {
    await tx.smsMessage.update({
      where: { id: messageId },
      data: result.ok
        ? {
            status: SmsMessageStatus.SENT,
            providerMessageId: result.providerMessageId,
            sentAt,
            lastError: null,
          }
        : {
            status: SmsMessageStatus.FAILED,
            lastError: result.safeMessage,
          },
    });
    await recordCrmActivity({
      organizationId: params.actor.organizationId,
      leadId: lead.id,
      activityType: CrmActivityType.SMS_QUEUED,
      title: result.ok ? "پیامک ارسال شد" : "ارسال پیامک ناموفق بود",
      summary: result.ok
        ? `قالب «${template.name}» برای ${mobile.normalized} ارسال شد.`
        : `قالب «${template.name}»: ${result.safeMessage}`,
      actorUserId: params.actor.userId,
      metadata: activityMetadata,
      occurredAt: sentAt,
      tx,
    });
    await tx.auditLog.create({
      data: {
        organizationId: params.actor.organizationId,
        branchId: params.actor.branchId,
        actorUserId: params.actor.userId,
        action: result.ok ? AuditAction.SMS_SENT : AuditAction.SMS_FAILED,
        entityType: "SmsMessage",
        entityId: messageId,
        metadata: activityMetadata as Prisma.InputJsonValue,
      },
    });
  });

  return result.ok
    ? {
        ok: true,
        messageId,
        providerMessageId: result.providerMessageId,
        message: "پیامک با موفقیت ارسال شد.",
      }
    : { ok: false, messageId, error: result.safeMessage };
}

export async function resendFailedLeadSms(params: {
  actor: ManualSmsActor;
  leadId: string;
  messageId: string;
  idempotencyKey: string;
}): Promise<ManualSmsResult> {
  const original = await prisma.smsMessage.findFirst({
    where: {
      id: params.messageId,
      organizationId: params.actor.organizationId,
      relatedType: "Lead",
      relatedId: params.leadId,
      status: { in: [SmsMessageStatus.FAILED, SmsMessageStatus.DEAD_LETTER] },
    },
    select: { id: true, templateId: true, metadata: true },
  });
  if (!original?.templateId || !isRecord(original.metadata)) {
    return { ok: false, error: "پیامک ناموفق برای ارسال مجدد یافت نشد." };
  }
  const rawParameters = original.metadata.parameters;
  if (!isRecord(rawParameters)) {
    return { ok: false, error: "پارامترهای ارسال قبلی قابل بازیابی نیست." };
  }
  const parameters: Record<string, string> = {};
  for (const [name, value] of Object.entries(rawParameters)) {
    if (typeof value === "string") parameters[name] = value;
  }
  return sendManualLeadSms({
    actor: params.actor,
    leadId: params.leadId,
    templateId: original.templateId,
    parameters,
    idempotencyKey: params.idempotencyKey,
    resendOf: original.id,
  });
}
