"use server";

/**
 * Guidance ERP — public pre-registration server actions (Phase 0).
 * OTP reuse + identity provisioning + GuidancePlan. No CRM Lead writes.
 */

import { AuditAction, OtpPurpose } from "@/generated/prisma/enums";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { GUIDANCE_PRE_REG_CONSENT_TEXT } from "@/lib/guidance/consent";
import { assertGuidancePublicEnabledOrNotFound } from "@/lib/guidance/require-public";
import {
  parseGuidanceExamGroup,
  provisionGuidancePreRegistration,
} from "@/lib/guidance/pre-register";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";
import { ensureDefaultStudentGrades } from "@/lib/website/student-grades";

export type GuidancePreRegisterState = {
  phase: "form" | "otp" | "done";
  message?: string;
  error?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  examGroup?: string;
  gradeId?: string;
  planPublicId?: string;
};

function field(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function readFormSnapshot(formData: FormData): {
  firstName: string;
  lastName: string;
  mobileRaw: string;
  examGroup: string;
  gradeId: string;
  consent: boolean;
} {
  return {
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    mobileRaw: field(formData, "mobile"),
    examGroup: field(formData, "examGroup"),
    gradeId: field(formData, "gradeId"),
    consent: field(formData, "consent") === "on" || field(formData, "consent") === "true" || field(formData, "consent") === "1",
  };
}

export async function requestGuidancePreRegisterOtpAction(
  _state: GuidancePreRegisterState,
  formData: FormData,
): Promise<GuidancePreRegisterState> {
  const { organizationId } = await assertGuidancePublicEnabledOrNotFound();
  const snapshot = readFormSnapshot(formData);

  if (!snapshot.firstName || !snapshot.lastName) {
    return {
      phase: "form",
      error: "نام و نام خانوادگی الزامی است.",
      ...snapshot,
      mobile: snapshot.mobileRaw,
    };
  }

  const examGroup = parseGuidanceExamGroup(snapshot.examGroup);
  if (!examGroup) {
    return {
      phase: "form",
      error: "گروه آزمایشی را انتخاب کنید.",
      ...snapshot,
      mobile: snapshot.mobileRaw,
    };
  }

  if (!snapshot.gradeId) {
    return {
      phase: "form",
      error: "پایه تحصیلی را انتخاب کنید.",
      ...snapshot,
      mobile: snapshot.mobileRaw,
    };
  }

  if (!snapshot.consent) {
    return {
      phase: "form",
      error: "پذیرش شرایط پردازش اطلاعات الزامی است.",
      ...snapshot,
      mobile: snapshot.mobileRaw,
    };
  }

  const parsed = normalizeIranianMobile(snapshot.mobileRaw);
  if (!parsed.ok) {
    return {
      phase: "form",
      error: "شماره موبایل معتبر وارد کنید.",
      ...snapshot,
      mobile: snapshot.mobileRaw,
    };
  }

  await ensureDefaultStudentGrades(organizationId);
  const grade = await prisma.studentGrade.findFirst({
    where: {
      id: snapshot.gradeId,
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!grade) {
    return {
      phase: "form",
      error: "پایه تحصیلی معتبر انتخاب کنید.",
      ...snapshot,
      mobile: parsed.normalized,
    };
  }

  const requested = await requestOtp({
    organizationId,
    mobile: parsed.normalized,
    purpose: OtpPurpose.VERIFY_MOBILE,
    idempotencyKey: `guidance-prereg:${parsed.normalized}:${Math.floor(Date.now() / 60_000)}`,
  });

  if (!requested.ok) {
    return {
      phase: "form",
      error: requested.error,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      examGroup: snapshot.examGroup,
      gradeId: snapshot.gradeId,
      mobile: parsed.normalized,
    };
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: AuditAction.OTP_REQUESTED,
      entityType: "OtpChallenge",
      entityId: requested.challengeId,
      metadata: { purpose: OtpPurpose.VERIFY_MOBILE, flow: "guidance-pre-register" },
    },
  });

  return {
    phase: "otp",
    message: "کد تأیید به شماره همراه شما ارسال شد.",
    firstName: snapshot.firstName,
    lastName: snapshot.lastName,
    examGroup: snapshot.examGroup,
    gradeId: snapshot.gradeId,
    mobile: parsed.normalized,
  };
}

export async function verifyGuidancePreRegisterOtpAction(
  _state: GuidancePreRegisterState,
  formData: FormData,
): Promise<GuidancePreRegisterState> {
  const { organizationId } = await assertGuidancePublicEnabledOrNotFound();
  const snapshot = readFormSnapshot(formData);
  const code = field(formData, "code");

  const parsed = normalizeIranianMobile(snapshot.mobileRaw);
  const examGroup = parseGuidanceExamGroup(snapshot.examGroup);

  if (!parsed.ok || !code || !examGroup || !snapshot.gradeId) {
    return {
      phase: "form",
      error: "اطلاعات ناقص است. دوباره از ابتدا تکمیل کنید.",
    };
  }

  if (!snapshot.consent) {
    return {
      phase: "otp",
      error: "پذیرش شرایط پردازش اطلاعات الزامی است.",
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      examGroup: snapshot.examGroup,
      gradeId: snapshot.gradeId,
      mobile: parsed.normalized,
    };
  }

  const verified = await verifyOtp({
    organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.VERIFY_MOBILE,
  });
  if (!verified.ok) {
    return {
      phase: "otp",
      error: verified.error,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      examGroup: snapshot.examGroup,
      gradeId: snapshot.gradeId,
      mobile: parsed.normalized,
    };
  }

  const consumed = await consumeOtp({
    organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) {
    return {
      phase: "otp",
      error: consumed.error,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      examGroup: snapshot.examGroup,
      gradeId: snapshot.gradeId,
      mobile: parsed.normalized,
    };
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: AuditAction.OTP_VERIFIED,
      entityType: "OtpChallenge",
      entityId: verified.challengeId,
      metadata: { purpose: OtpPurpose.VERIFY_MOBILE, flow: "guidance-pre-register" },
    },
  });

  const requestMetadata = await readSessionRequestMetadata();
  const provisioned = await provisionGuidancePreRegistration({
    organizationId,
    firstName: snapshot.firstName,
    lastName: snapshot.lastName,
    normalizedMobile: parsed.normalized,
    examGroup,
    gradeId: snapshot.gradeId,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
  });

  if (!provisioned.ok) {
    return {
      phase: "otp",
      error: provisioned.error,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      examGroup: snapshot.examGroup,
      gradeId: snapshot.gradeId,
      mobile: parsed.normalized,
    };
  }

  const { token, expiresAt } = await createPortalSession({
    userId: provisioned.userId,
    organizationMembershipId: provisioned.membershipId,
    ...requestMetadata,
  });

  const now = new Date();
  await prisma.user.update({
    where: { id: provisioned.userId },
    data: { lastLoginAt: now, mobileVerifiedAt: now },
  });

  await setPortalSessionCookie(token, expiresAt);

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: provisioned.userId,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: "PortalSession",
      metadata: {
        flow: "guidance-pre-register",
        planPublicId: provisioned.planPublicId,
        consentTextPreview: GUIDANCE_PRE_REG_CONSENT_TEXT.slice(0, 80),
      },
      ...requestMetadata,
    },
  });

  return {
    phase: "done",
    message: provisioned.createdPlan
      ? "پیش‌ثبت‌نام شما با موفقیت انجام شد. پرونده انتخاب رشته ایجاد شد."
      : "حساب شما تأیید شد. پرونده انتخاب رشته قبلی شما فعال است.",
    planPublicId: provisioned.planPublicId,
    mobile: parsed.normalized,
  };
}
