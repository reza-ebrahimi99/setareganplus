"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, scopedLeadWhere } from "@/lib/auth/permissions";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  resendFailedLeadSms,
  sendManualLeadSms,
  type ManualSmsResult,
} from "@/lib/crm/manual-sms";
import { prisma } from "@/lib/prisma";

export type SendLeadSmsActionInput = {
  leadId: string;
  templateId: string;
  parameters: Record<string, string>;
  idempotencyKey: string;
};

async function accessibleLead(leadId: string) {
  const session = await requireAdminSession();
  assertPermission(session, "crm.send_sms");
  const lead = await prisma.lead.findFirst({
    where: { ...scopedLeadWhere(session), id: leadId },
    select: { id: true, branchId: true },
  });
  return { session, lead };
}

function safeParameters(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const entries = Object.entries(value);
  if (entries.length > 10) return null;
  const parameters: Record<string, string> = {};
  for (const [name, parameterValue] of entries) {
    if (
      !/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(name) ||
      typeof parameterValue !== "string"
    ) {
      return null;
    }
    parameters[name] = parameterValue;
  }
  return parameters;
}

function revalidateLeadSms(leadId: string) {
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/settings/communication");
}

export async function sendLeadSmsAction(
  input: SendLeadSmsActionInput,
): Promise<ManualSmsResult> {
  const leadId = input.leadId?.trim();
  const templateId = input.templateId?.trim();
  const idempotencyKey = input.idempotencyKey?.trim();
  const parameters = safeParameters(input.parameters);
  if (!leadId || !templateId || !idempotencyKey || !parameters) {
    return { ok: false, error: "اطلاعات درخواست ارسال پیامک معتبر نیست." };
  }
  try {
    const { session, lead } = await accessibleLead(leadId);
    if (!lead) return { ok: false, error: "مخاطب یافت نشد یا دسترسی مجاز نیست." };
    const result = await sendManualLeadSms({
      actor: {
        organizationId: session.organization.id,
        branchId: lead.branchId,
        userId: session.user.id,
      },
      leadId,
      templateId,
      parameters,
      idempotencyKey,
    });
    revalidateLeadSms(leadId);
    return result;
  } catch (error) {
    console.error("Manual CRM SMS send failed:", error);
    return { ok: false, error: "ارسال پیامک ممکن نشد. دوباره تلاش کنید." };
  }
}

export async function resendFailedLeadSmsAction(input: {
  leadId: string;
  messageId: string;
  idempotencyKey: string;
}): Promise<ManualSmsResult> {
  const leadId = input.leadId?.trim();
  const messageId = input.messageId?.trim();
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!leadId || !messageId || !idempotencyKey) {
    return { ok: false, error: "اطلاعات ارسال مجدد معتبر نیست." };
  }
  try {
    const { session, lead } = await accessibleLead(leadId);
    if (!lead) return { ok: false, error: "مخاطب یافت نشد یا دسترسی مجاز نیست." };
    const result = await resendFailedLeadSms({
      actor: {
        organizationId: session.organization.id,
        branchId: lead.branchId,
        userId: session.user.id,
      },
      leadId,
      messageId,
      idempotencyKey,
    });
    revalidateLeadSms(leadId);
    return result;
  } catch (error) {
    console.error("Manual CRM SMS resend failed:", error);
    return { ok: false, error: "ارسال مجدد پیامک ممکن نشد." };
  }
}
