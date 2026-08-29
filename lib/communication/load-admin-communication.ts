/**
 * Admin communication settings loader (read-only foundation).
 */

import { SmsMessageStatus } from "@/generated/prisma/enums";
import {
  getCommunicationConfig,
  getSmsSecretStatus,
} from "@/lib/communication/config";
import { getSmsProvider } from "@/lib/communication/sms-provider";
import { parseSmsTemplateVariables } from "@/lib/communication/template";
import {
  editorTypeForSmsTemplatePurpose,
  type SmsTemplateEditorType,
} from "@/lib/communication/template-management";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export type AdminCommunicationData = {
  provider: {
    name: string;
    enabled: boolean;
    smsEnabledEnv: boolean;
    timeoutMs: number;
    secrets: ReturnType<typeof getSmsSecretStatus>;
  };
  otp: {
    expirySeconds: number;
    resendCooldownSeconds: number;
    maxAttempts: number;
  };
  templates: Array<{
    id: string;
    code: string;
    name: string;
    purpose: string;
    type: SmsTemplateEditorType;
    description: string;
    parameters: string[];
    isActive: boolean;
  }>;
  queue: {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    deadLetter: number;
  };
  failedMessages: Array<{
    id: string;
    purpose: string;
    toMobileMasked: string;
    status: string;
    attemptCount: number;
    lastError: string | null;
    createdAt: string;
  }>;
};

function maskMobile(mobile: string): string {
  if (mobile.length < 7) return "••••";
  return `${mobile.slice(0, 4)}•••${mobile.slice(-2)}`;
}

export async function loadAdminCommunicationSettings(): Promise<
  | { ok: true; data: AdminCommunicationData }
  | { ok: false }
> {
  try {
    const session = await requireAdminSession();
    const organizationId = session.organization.id;
    const config = getCommunicationConfig();
    const provider = getSmsProvider();
    const secrets = getSmsSecretStatus();

    const [
      templates,
      pending,
      processing,
      sent,
      failed,
      deadLetter,
      failedRows,
    ] = await Promise.all([
      prisma.smsTemplate.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        take: 200,
        select: {
          id: true,
          code: true,
          name: true,
          purpose: true,
          body: true,
          variables: true,
          isActive: true,
        },
      }),
      prisma.smsMessage.count({
        where: {
          organizationId,
          status: SmsMessageStatus.PENDING,
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
      }),
      prisma.smsMessage.count({
        where: {
          organizationId,
          status: SmsMessageStatus.PROCESSING,
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
      }),
      prisma.smsMessage.count({
        where: {
          organizationId,
          status: SmsMessageStatus.SENT,
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
      }),
      prisma.smsMessage.count({
        where: {
          organizationId,
          status: SmsMessageStatus.FAILED,
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
      }),
      prisma.smsMessage.count({
        where: {
          organizationId,
          status: SmsMessageStatus.DEAD_LETTER,
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
      }),
      prisma.smsMessage.findMany({
        where: {
          organizationId,
          status: {
            in: [SmsMessageStatus.FAILED, SmsMessageStatus.DEAD_LETTER],
          },
          NOT: { purpose: { startsWith: "admin_test_guard:" } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          purpose: true,
          toMobile: true,
          status: true,
          attemptCount: true,
          lastError: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ok: true,
      data: {
        provider: {
          name: provider.name,
          enabled: provider.isEnabled(),
          smsEnabledEnv: config.smsEnabled,
          timeoutMs: config.timeoutMs,
          secrets,
        },
        otp: {
          expirySeconds: config.otpExpirySeconds,
          resendCooldownSeconds: config.otpResendCooldownSeconds,
          maxAttempts: config.otpMaxAttempts,
        },
        templates: templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          purpose: t.purpose,
          type: editorTypeForSmsTemplatePurpose(t.purpose),
          description: t.body,
          parameters: parseSmsTemplateVariables(t.variables),
          isActive: t.isActive,
        })),
        queue: {
          pending,
          processing,
          sent,
          failed,
          deadLetter,
        },
        failedMessages: failedRows.map((row) => ({
          id: row.id,
          purpose: row.purpose,
          toMobileMasked: maskMobile(row.toMobile),
          status: row.status,
          attemptCount: row.attemptCount,
          lastError: row.lastError,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    };
  } catch {
    return { ok: false };
  }
}
