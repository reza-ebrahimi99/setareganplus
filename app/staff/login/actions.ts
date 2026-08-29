"use server";

import { redirect } from "next/navigation";
import {
  AuditAction,
  OtpPurpose,
} from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import { findActiveStaffMembershipByMobile } from "@/lib/auth/staff-login";
import {
  createAdminSession,
  readSessionRequestMetadata,
  setAdminSessionCookie,
} from "@/lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

const GENERIC_REQUEST =
  "اگر حساب فعالی برای این شماره وجود داشته باشد، کد ورود ارسال شده است.";
const GENERIC_VERIFY = "کد ورود نامعتبر یا منقضی است.";

export type StaffLoginState = {
  phase: "mobile" | "otp";
  message?: string;
  error?: string;
  mobile?: string;
};

function field(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function requestStaffOtpAction(
  _state: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  if (!parsed.ok) {
    return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
  }

  const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
  if (membership) {
    const requested = await requestOtp({
      organizationId: membership.organizationId,
      mobile: parsed.normalized,
      purpose: OtpPurpose.STAFF_LOGIN,
      idempotencyKey: `staff-login:${membership.id}:${Math.floor(Date.now() / 60_000)}`,
    });
    if (requested.ok) {
      await prisma.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          actorUserId: membership.user.id,
          action: AuditAction.OTP_REQUESTED,
          entityType: "OtpChallenge",
          entityId: requested.challengeId,
        },
      });
    }
  }

  return {
    phase: "otp",
    message: GENERIC_REQUEST,
    mobile: parsed.normalized,
  };
}

export async function verifyStaffOtpAction(
  _state: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const code = field(formData, "code");
  if (!parsed.ok || !code) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: field(formData, "mobile") };
  }

  const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
  if (!membership) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const verified = await verifyOtp({
    organizationId: membership.organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.STAFF_LOGIN,
  });
  if (!verified.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }
  const consumed = await consumeOtp({
    organizationId: membership.organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const requestMetadata = await readSessionRequestMetadata();
  const { token, expiresAt } = await createAdminSession({
    userId: membership.user.id,
    organizationMembershipId: membership.id,
    ...requestMetadata,
  });
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: membership.user.id },
      data: { lastLoginAt: now, mobileVerifiedAt: now },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: membership.user.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "AdminSession",
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: membership.user.id,
        action: AuditAction.OTP_VERIFIED,
        entityType: "OtpChallenge",
        entityId: verified.challengeId,
      },
    }),
  ]);
  await setAdminSessionCookie(token, expiresAt);

  const permissions = permissionsForRole(membership.role);
  redirect(permissions.has("reports.view") && !permissions.has("crm.view_assigned") && !permissions.has("crm.view_all")
    ? "/admin/reports/staff-performance"
    : permissions.has("crm.view_assigned")
      ? "/admin/workspace"
      : "/admin");
}
