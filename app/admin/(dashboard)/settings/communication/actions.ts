"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  OtpPurpose,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { getCommunicationConfig } from "@/lib/communication/config";
import { requestOtp } from "@/lib/communication/otp";
import { sendTemplateMessage } from "@/lib/communication/send";
import { getSmsProvider } from "@/lib/communication/sms-provider";
import {
  purposeForSmsTemplateType,
  validateSmsTemplateInput,
} from "@/lib/communication/template-management";
import type { SmsTemplateKind } from "@/lib/communication/types";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

const TEST_COOLDOWN_MS = 60_000;
const LIMITER_MOBILE = "09000000000";
const GENERIC_FAILURE =
  "ارسال آزمایشی انجام نشد. کمی بعد دوباره تلاش کنید.";

type TestKind = SmsTemplateKind;
type TestOutcome =
  | "accepted"
  | "rejected"
  | "invalid_mobile"
  | "rate_limited"
  | "internal_error";

export type CommunicationTestActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function readMobile(formData: FormData): string {
  const value = formData.get("mobile");
  return typeof value === "string" ? value.trim() : "";
}

async function auditAttempt(params: {
  organizationId: string;
  actorUserId: string;
  kind: TestKind;
  outcome: TestOutcome;
  entityId?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action:
          params.outcome === "accepted"
            ? AuditAction.SMS_SENT
            : AuditAction.SMS_FAILED,
        entityType: "CommunicationTest",
        entityId: params.entityId ?? null,
        metadata: {
          testKind: params.kind,
          outcome: params.outcome,
        },
      },
    });
  } catch {
    // The send result must not expose audit persistence details.
  }
}

async function claimCooldown(params: {
  organizationId: string;
  actorUserId: string;
  kind: TestKind;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const now = new Date();
  const purpose = `admin_test_guard:${params.actorUserId}:${params.kind}`;
  const slot = Math.floor(now.getTime() / TEST_COOLDOWN_MS);
  try {
    const marker = await prisma.$transaction(
      async (tx) => {
        const recent = await tx.smsMessage.findFirst({
          where: {
            organizationId: params.organizationId,
            purpose,
            createdAt: { gt: new Date(now.getTime() - TEST_COOLDOWN_MS) },
          },
          select: { id: true },
        });
        if (recent) return null;

        return tx.smsMessage.create({
          data: {
            organizationId: params.organizationId,
            toMobile: LIMITER_MOBILE,
            body: "communication test limiter",
            status: SmsMessageStatus.SENT,
            provider: "internal",
            purpose,
            relatedType: "AdminCommunicationTest",
            relatedId: params.actorUserId,
            attemptCount: 1,
            maxAttempts: 1,
            sentAt: now,
            idempotencyKey: `${purpose}:${slot}`,
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!marker) return { ok: false };
    return { ok: true, id: marker.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return { ok: false };
    }
    throw error;
  }
}

async function runCommunicationTest(
  kind: TestKind,
  formData: FormData,
): Promise<CommunicationTestActionState> {
  const session = await requirePermission("communication.manage");
  const auditBase = {
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    kind,
  };
  const mobile = normalizeIranianMobile(readMobile(formData));

  if (!mobile.ok) {
    await auditAttempt({ ...auditBase, outcome: "invalid_mobile" });
    return {
      status: "error",
      message: "شماره موبایل واردشده معتبر نیست.",
    };
  }

  let guard: Awaited<ReturnType<typeof claimCooldown>>;
  try {
    guard = await claimCooldown(auditBase);
  } catch {
    await auditAttempt({ ...auditBase, outcome: "internal_error" });
    return { status: "error", message: GENERIC_FAILURE };
  }

  if (!guard.ok) {
    await auditAttempt({ ...auditBase, outcome: "rate_limited" });
    return {
      status: "error",
      message: "لطفاً یک دقیقه صبر کنید و دوباره تلاش کنید.",
    };
  }

  try {
    if (!getCommunicationConfig().smsEnabled || !getSmsProvider().isEnabled()) {
      await auditAttempt({
        ...auditBase,
        entityId: guard.id,
        outcome: "rejected",
      });
      return { status: "error", message: GENERIC_FAILURE };
    }

    const result =
      kind === "otp"
        ? await requestOtp({
            organizationId: session.organization.id,
            mobile: mobile.normalized,
            purpose: OtpPurpose.GENERIC,
            idempotencyKey: `admin-test:${guard.id}`,
          })
        : await sendTemplateMessage(
            kind === "booking"
              ? {
                  kind,
                  toMobile: mobile.normalized,
                  variables: {
                    name: "آزمایش",
                    date: "۱۴۰۵/۰۴/۲۵",
                    time: "۱۲:۰۰",
                    tracking: "TEST123",
                  },
                  correlationId: guard.id,
                }
              : {
                  kind,
                  toMobile: mobile.normalized,
                  variables: {
                    name: "آزمایش",
                    tracking: "TEST123",
                  },
                  correlationId: guard.id,
                },
          );
    const accepted = result.ok;
    await auditAttempt({
      ...auditBase,
      entityId: guard.id,
      outcome: accepted ? "accepted" : "rejected",
    });
    return accepted
      ? {
          status: "success",
          message: "درخواست ارسال آزمایشی با موفقیت پذیرفته شد.",
        }
      : { status: "error", message: GENERIC_FAILURE };
  } catch {
    await auditAttempt({
      ...auditBase,
      entityId: guard.id,
      outcome: "internal_error",
    });
    return { status: "error", message: GENERIC_FAILURE };
  }
}

export async function sendOtpTestAction(
  _previous: CommunicationTestActionState,
  formData: FormData,
): Promise<CommunicationTestActionState> {
  return runCommunicationTest("otp", formData);
}

export async function sendBookingTestAction(
  _previous: CommunicationTestActionState,
  formData: FormData,
): Promise<CommunicationTestActionState> {
  return runCommunicationTest("booking", formData);
}

export async function sendFormTestAction(
  _previous: CommunicationTestActionState,
  formData: FormData,
): Promise<CommunicationTestActionState> {
  return runCommunicationTest("form", formData);
}

export type SmsTemplateMutationResult =
  | { ok: true; message: string; templateId: string }
  | { ok: false; error: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readTemplateInput(formData: FormData) {
  return validateSmsTemplateInput({
    name: readString(formData, "name"),
    type: readString(formData, "type"),
    patternId: readString(formData, "patternId"),
    parameterNames: readString(formData, "parameterNames"),
    isActive: formData.get("isActive") === "true",
    description: readString(formData, "description"),
  });
}

function revalidateTemplateConsumers() {
  revalidatePath("/admin/settings/communication");
  revalidatePath("/admin/crm");
}

function templateMutationError(error: unknown): SmsTemplateMutationResult {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      ok: false,
      error: "این شناسه الگوی SMS.ir قبلاً برای سازمان ثبت شده است.",
    };
  }
  console.error("SMS template mutation failed:", error);
  return { ok: false, error: "ذخیره قالب پیامک ممکن نشد." };
}

export async function createSmsTemplateAction(
  formData: FormData,
): Promise<SmsTemplateMutationResult> {
  const session = await requirePermission("communication.manage");
  const validation = readTemplateInput(formData);
  if (!validation.ok) return validation;
  const purpose = purposeForSmsTemplateType(validation.data.type);
  try {
    const template = await prisma.$transaction(async (tx) => {
      if (validation.data.isActive && validation.data.type !== "CUSTOM") {
        await tx.smsTemplate.updateMany({
          where: {
            organizationId: session.organization.id,
            purpose,
            isActive: true,
            deletedAt: null,
          },
          data: { isActive: false },
        });
      }
      return tx.smsTemplate.create({
        data: {
          organizationId: session.organization.id,
          name: validation.data.name,
          purpose,
          code: validation.data.patternId,
          variables: validation.data.parameters,
          isActive: validation.data.isActive,
          body: validation.data.description,
        },
        select: { id: true },
      });
    });
    revalidateTemplateConsumers();
    return {
      ok: true,
      templateId: template.id,
      message: "قالب پیامک ایجاد شد.",
    };
  } catch (error) {
    return templateMutationError(error);
  }
}

export async function updateSmsTemplateAction(
  formData: FormData,
): Promise<SmsTemplateMutationResult> {
  const session = await requirePermission("communication.manage");
  const templateId = readString(formData, "templateId").trim();
  const validation = readTemplateInput(formData);
  if (!templateId) return { ok: false, error: "شناسه قالب معتبر نیست." };
  if (!validation.ok) return validation;
  const purpose = purposeForSmsTemplateType(validation.data.type);
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.smsTemplate.findFirst({
        where: {
          id: templateId,
          organizationId: session.organization.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existing) return null;
      if (validation.data.isActive && validation.data.type !== "CUSTOM") {
        await tx.smsTemplate.updateMany({
          where: {
            organizationId: session.organization.id,
            purpose,
            isActive: true,
            deletedAt: null,
            NOT: { id: templateId },
          },
          data: { isActive: false },
        });
      }
      return tx.smsTemplate.update({
        where: { id: templateId },
        data: {
          name: validation.data.name,
          purpose,
          code: validation.data.patternId,
          variables: validation.data.parameters,
          isActive: validation.data.isActive,
          body: validation.data.description,
        },
        select: { id: true },
      });
    });
    if (!updated) return { ok: false, error: "قالب پیامک یافت نشد." };
    revalidateTemplateConsumers();
    return {
      ok: true,
      templateId: updated.id,
      message: "قالب پیامک به‌روزرسانی شد.",
    };
  } catch (error) {
    return templateMutationError(error);
  }
}

export async function deleteSmsTemplateAction(input: {
  templateId: string;
}): Promise<SmsTemplateMutationResult> {
  const session = await requirePermission("communication.manage");
  const templateId = input.templateId?.trim();
  if (!templateId) return { ok: false, error: "شناسه قالب معتبر نیست." };
  try {
    const result = await prisma.smsTemplate.updateMany({
      where: {
        id: templateId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      data: { isActive: false, deletedAt: new Date() },
    });
    if (result.count !== 1) {
      return { ok: false, error: "قالب پیامک یافت نشد." };
    }
    revalidateTemplateConsumers();
    return { ok: true, templateId, message: "قالب پیامک حذف شد." };
  } catch (error) {
    console.error("SMS template deletion failed:", error);
    return { ok: false, error: "حذف قالب پیامک ممکن نشد." };
  }
}
