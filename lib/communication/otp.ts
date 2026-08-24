/**
 * OTP challenge service (StarOS v0.6A).
 *
 * Security rules:
 * - Six cryptographically secure digits
 * - Hash only in DB (never plaintext)
 * - Two-minute expiry (configurable)
 * - Resend cooldown
 * - Max verification attempts
 * - One active PENDING challenge per mobile+purpose
 * - Persian digit normalization on input
 * - Generic Persian errors (no OTP leakage)
 * - Never log OTP codes
 */

import {
  OtpChallengeStatus,
  OtpPurpose,
} from "@/generated/prisma/enums";
import { getCommunicationConfig } from "@/lib/communication/config";
import { sendOtpTemplate } from "@/lib/communication/send";
import {
  generateSecureOtpDigits,
  hashOtpCode,
  normalizeOtpInput,
  verifyOtpCode,
} from "@/lib/communication/otp-crypto";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { maskMobileForDisplay } from "@/lib/communication/sms-params";
import { prisma } from "@/lib/prisma";

const GENERIC_INVALID = "کد تأیید نامعتبر است.";
const GENERIC_EXPIRED = "کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید.";
const GENERIC_LOCKED = "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.";
const GENERIC_COOLDOWN = "لطفاً کمی صبر کنید و دوباره درخواست دهید.";
const GENERIC_MOBILE = "شماره موبایل واردشده معتبر نیست.";

export type RequestOtpInput = {
  organizationId: string;
  mobile: string;
  purpose?: OtpPurpose;
  idempotencyKey?: string | null;
  /** When true, return the plaintext code for isolated tests only — never in production paths. */
  _testReturnCode?: boolean;
};

export type RequestOtpResult =
  | {
      ok: true;
      challengeId: string;
      expiresAt: Date;
      resendAvailableAt: Date;
      /** Present only when `_testReturnCode` is set (test harness). */
      _testCode?: string;
    }
  | { ok: false; error: string };

export type VerifyOtpInput = {
  organizationId: string;
  mobile: string;
  code: string;
  purpose?: OtpPurpose;
};

export type VerifyOtpResult =
  | { ok: true; challengeId: string }
  | { ok: false; error: string };

export type ConsumeOtpInput = {
  organizationId: string;
  challengeId: string;
};

export type ConsumeOtpResult =
  | { ok: true }
  | { ok: false; error: string };

function resolvePurpose(purpose?: OtpPurpose): OtpPurpose {
  return purpose ?? OtpPurpose.GENERIC;
}

/**
 * Issue a new OTP challenge. Invalidates any prior PENDING challenge
 * for the same organization + mobile + purpose.
 */
export async function requestOtp(
  input: RequestOtpInput,
): Promise<RequestOtpResult> {
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  console.info("[otp-debug] requestOtp ENTER", {
    organizationId: input.organizationId,
    purpose: input.purpose ?? "GENERIC",
    hasIdempotencyKey: Boolean(input.idempotencyKey),
  });

  const mobile = normalizeIranianMobile(input.mobile);
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  console.info("[otp-debug] requestOtp normalized mobile", {
    ok: mobile.ok,
    mobileMasked: mobile.ok ? maskMobileForDisplay(mobile.normalized) : null,
    error: mobile.ok ? null : mobile.error,
  });
  if (!mobile.ok) {
    // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
    console.info("[otp-debug] requestOtp EARLY RETURN", {
      reason: "invalid_mobile",
    });
    return { ok: false, error: GENERIC_MOBILE };
  }

  const config = getCommunicationConfig();
  const purpose = resolvePurpose(input.purpose);
  const now = new Date();
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  console.info("[otp-debug] requestOtp config", {
    smsEnabled: config.smsEnabled,
    providerName: config.providerName,
    purpose,
  });

  const latest = await prisma.otpChallenge.findFirst({
    where: {
      organizationId: input.organizationId,
      normalizedMobile: mobile.normalized,
      purpose,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      resendAvailableAt: true,
      expiresAt: true,
    },
  });
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  console.info("[otp-debug] requestOtp latest challenge lookup", {
    found: Boolean(latest),
    status: latest?.status ?? null,
    resendAvailableAt: latest?.resendAvailableAt ?? null,
    expiresAt: latest?.expiresAt ?? null,
  });
  const active =
    latest?.status === OtpChallengeStatus.PENDING && latest.expiresAt > now
      ? latest
      : null;

  const isRateLimitedOrLocked =
    (latest?.resendAvailableAt && latest.resendAvailableAt > now) ||
    (latest?.status === OtpChallengeStatus.LOCKED && latest.expiresAt > now);
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  console.info("[otp-debug] requestOtp rate-limit result", {
    rateLimited: Boolean(isRateLimitedOrLocked),
    now,
  });
  if (isRateLimitedOrLocked) {
    // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
    console.info("[otp-debug] requestOtp EARLY RETURN", {
      reason: "rate_limited_or_locked",
    });
    return { ok: false, error: GENERIC_COOLDOWN };
  }

  const code = generateSecureOtpDigits(6);
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(now.getTime() + config.otpExpirySeconds * 1000);
  const resendAvailableAt = new Date(
    now.getTime() + config.otpResendCooldownSeconds * 1000,
  );
  // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
  // Never logs the actual code, only that one was generated.
  console.info("[otp-debug] requestOtp OTP generated", {
    codeLength: code.length,
    expiresAt,
    resendAvailableAt,
  });

  try {
    const challenge = await prisma.$transaction(async (tx) => {
      if (active) {
        await tx.otpChallenge.update({
          where: { id: active.id },
          data: { status: OtpChallengeStatus.EXPIRED },
        });
      }

      // Expire any other stale PENDING rows for this mobile/purpose.
      await tx.otpChallenge.updateMany({
        where: {
          organizationId: input.organizationId,
          normalizedMobile: mobile.normalized,
          purpose,
          status: OtpChallengeStatus.PENDING,
          id: active ? { not: active.id } : undefined,
        },
        data: { status: OtpChallengeStatus.EXPIRED },
      });

      return tx.otpChallenge.create({
        data: {
          organizationId: input.organizationId,
          normalizedMobile: mobile.normalized,
          purpose,
          codeHash,
          status: OtpChallengeStatus.PENDING,
          expiresAt,
          maxAttempts: config.otpMaxAttempts,
          lastSentAt: now,
          resendAvailableAt,
          idempotencyKey: input.idempotencyKey?.trim() || null,
        },
        select: { id: true },
      });
    });
    // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
    console.info("[otp-debug] requestOtp challenge persisted", {
      challengeId: challenge.id,
    });

    if (config.smsEnabled) {
      // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
      console.info("[otp-debug] requestOtp BEFORE sendOtpTemplate", {
        challengeId: challenge.id,
        mobileMasked: maskMobileForDisplay(mobile.normalized),
        correlationId: challenge.id,
      });
      const delivery = await sendOtpTemplate({
        toMobile: mobile.normalized,
        code,
        correlationId: challenge.id,
      });
      // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
      console.info("[otp-debug] requestOtp AFTER sendOtpTemplate", {
        challengeId: challenge.id,
        delivery,
      });
      if (!delivery.ok) {
        // A challenge is usable only after the live provider accepts delivery.
        // The conditional write also prevents overwriting a concurrent terminal state.
        await prisma.otpChallenge.updateMany({
          where: {
            id: challenge.id,
            organizationId: input.organizationId,
            status: OtpChallengeStatus.PENDING,
          },
          data: { status: OtpChallengeStatus.EXPIRED },
        });
        // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
        console.info("[otp-debug] requestOtp EARLY RETURN", {
          reason: "sms_delivery_failed",
          delivery,
        });
        return {
          ok: false,
          error: "درخواست کد تأیید در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
        };
      }
    } else {
      // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
      console.info("[otp-debug] requestOtp sendOtpTemplate SKIPPED", {
        reason: "config.smsEnabled is false",
        challengeId: challenge.id,
      });
    }

    // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
    console.info("[otp-debug] requestOtp SUCCESS", {
      challengeId: challenge.id,
    });
    return {
      ok: true,
      challengeId: challenge.id,
      expiresAt,
      resendAvailableAt,
      ...(input._testReturnCode && process.env.NODE_ENV !== "production"
        ? { _testCode: code }
        : {}),
    };
  } catch (error) {
    // TEMPORARY DEBUG — OTP delivery investigation. Remove once diagnosed.
    // Never logs the OTP code — it is not part of the caught error.
    console.error("[otp-debug] requestOtp CAUGHT EXCEPTION", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      ok: false,
      error: "درخواست کد تأیید در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
    };
  }
}

/**
 * Verify OTP without consuming. Marks VERIFIED on success.
 * Replay of an already-verified/consumed challenge fails generically.
 */
export async function verifyOtp(
  input: VerifyOtpInput,
): Promise<VerifyOtpResult> {
  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, error: GENERIC_MOBILE };
  }

  const code = normalizeOtpInput(input.code);
  if (code.length !== 6) {
    return { ok: false, error: GENERIC_INVALID };
  }

  const purpose = resolvePurpose(input.purpose);
  const now = new Date();

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      organizationId: input.organizationId,
      normalizedMobile: mobile.normalized,
      purpose,
      status: {
        in: [
          OtpChallengeStatus.PENDING,
          OtpChallengeStatus.VERIFIED,
          OtpChallengeStatus.CONSUMED,
          OtpChallengeStatus.LOCKED,
          OtpChallengeStatus.EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (
    challenge.status === OtpChallengeStatus.CONSUMED ||
    challenge.status === OtpChallengeStatus.VERIFIED
  ) {
    // Replay protection — do not reveal prior success.
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status === OtpChallengeStatus.LOCKED) {
    return { ok: false, error: GENERIC_LOCKED };
  }

  if (
    challenge.status === OtpChallengeStatus.EXPIRED ||
    challenge.expiresAt <= now
  ) {
    if (challenge.status === OtpChallengeStatus.PENDING) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: OtpChallengeStatus.EXPIRED },
      });
    }
    return { ok: false, error: GENERIC_EXPIRED };
  }

  const match = verifyOtpCode(code, challenge.codeHash);
  if (!match) {
    const attempted = await prisma.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        status: OtpChallengeStatus.PENDING,
        expiresAt: { gt: now },
      },
      data: { attemptCount: { increment: 1 } },
    });
    if (attempted.count !== 1) return { ok: false, error: GENERIC_INVALID };
    const current = await prisma.otpChallenge.findUnique({
      where: { id: challenge.id },
      select: { attemptCount: true, maxAttempts: true },
    });
    const locked = Boolean(current && current.attemptCount >= current.maxAttempts);
    if (locked) {
      await prisma.otpChallenge.updateMany({
        where: {
          id: challenge.id,
          status: OtpChallengeStatus.PENDING,
          attemptCount: { gte: current!.maxAttempts },
        },
        data: { status: OtpChallengeStatus.LOCKED },
      });
    }
    return {
      ok: false,
      error: locked ? GENERIC_LOCKED : GENERIC_INVALID,
    };
  }

  const verified = await prisma.otpChallenge.updateMany({
    where: {
      id: challenge.id,
      status: OtpChallengeStatus.PENDING,
      expiresAt: { gt: now },
      attemptCount: { lt: challenge.maxAttempts },
    },
    data: { status: OtpChallengeStatus.VERIFIED },
  });
  if (verified.count !== 1) return { ok: false, error: GENERIC_INVALID };

  return { ok: true, challengeId: challenge.id };
}

/**
 * Consume a previously verified challenge (one-time use after verify).
 */
export async function consumeOtp(
  input: ConsumeOtpInput,
): Promise<ConsumeOtpResult> {
  const now = new Date();
  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      id: input.challengeId,
      organizationId: input.organizationId,
    },
  });

  if (!challenge) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status === OtpChallengeStatus.CONSUMED) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status !== OtpChallengeStatus.VERIFIED) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.expiresAt <= now) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: OtpChallengeStatus.EXPIRED },
    });
    return { ok: false, error: GENERIC_EXPIRED };
  }

  const consumed = await prisma.otpChallenge.updateMany({
    where: {
      id: challenge.id,
      organizationId: input.organizationId,
      status: OtpChallengeStatus.VERIFIED,
      expiresAt: { gt: now },
    },
    data: {
      status: OtpChallengeStatus.CONSUMED,
      consumedAt: now,
    },
  });
  if (consumed.count !== 1) return { ok: false, error: GENERIC_INVALID };

  return { ok: true };
}
