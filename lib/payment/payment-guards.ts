/**
 * Shared payment/Zibal safety guards — server-only; no secrets.
 */

import type { PaymentStatus } from "@/generated/prisma/enums";

/** Official Zibal IPG origin — checkout redirects must stay on this host. */
export const ZIBAL_GATEWAY_ORIGIN = "https://gateway.zibal.ir" as const;

/**
 * Checkout URL may only be https://gateway.zibal.ir/start/{trackId}
 * (no credentials, no alternate hosts, no open redirects).
 */
export function isAllowedZibalCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "gateway.zibal.ir") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port) return false;
    if (parsed.search || parsed.hash) return false;
    // pathname: /start/<trackId> — trackId must be non-empty, no extra segments
    if (!/^\/start\/[A-Za-z0-9_-]+$/.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildSafePaymentRedirectPath(
  status: PaymentStatus | "PAID" | "FAILED" | "CANCELLED" | string,
  intentId: string,
): string {
  const safeIntent = encodeURIComponent(intentId);
  if (status === "PAID") {
    return `/payments/success?intent=${safeIntent}`;
  }
  return `/payments/failed?intent=${safeIntent}`;
}

/** Only relative /payments/success|failed paths are allowed after callback. */
export function isSafeInternalPaymentRedirectPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  try {
    const parsed = new URL(path, "https://setareganplus.ir");
    if (parsed.origin !== "https://setareganplus.ir") return false;
    return (
      parsed.pathname === "/payments/success" ||
      parsed.pathname === "/payments/failed"
    );
  } catch {
    return false;
  }
}

export type VerifiedAmountCheck =
  | { ok: true }
  | { ok: false; error: string };

/**
 * After PSP verify: Zibal must return an amount that matches the local intent.
 * Mock may omit amountRials.
 */
export function checkVerifiedAmountAgainstIntent(params: {
  providerId: string;
  verifiedAmountRials: number | null | undefined;
  expectedFinalAmountRials: number;
}): VerifiedAmountCheck {
  if (params.providerId === "zibal") {
    if (
      params.verifiedAmountRials == null ||
      !Number.isFinite(params.verifiedAmountRials)
    ) {
      return {
        ok: false,
        error: "مبلغ تأییدشده از درگاه دریافت نشد.",
      };
    }
    if (params.verifiedAmountRials !== params.expectedFinalAmountRials) {
      return {
        ok: false,
        error: "مبلغ تأییدشده با مبلغ ثبت‌نام هم‌خوانی ندارد.",
      };
    }
    return { ok: true };
  }

  if (
    params.verifiedAmountRials != null &&
    params.verifiedAmountRials !== params.expectedFinalAmountRials
  ) {
    return {
      ok: false,
      error: "مبلغ تأییدشده با مبلغ ثبت‌نام هم‌خوانی ندارد.",
    };
  }
  return { ok: true };
}

export type ZibalCallbackGuardInput = {
  token: string;
  trackId: string;
  orderId: string;
  sessionProviderSessionId: string;
  sessionPaymentIntentId: string;
};

export type ZibalCallbackGuardResult =
  | {
      ok: true;
      trackId: string;
      orderId: string;
    }
  | {
      ok: false;
      errorCode:
        | "missing_token"
        | "track_mismatch"
        | "order_mismatch"
        | "session_not_found";
    };

/**
 * Pre-verify callback guards. Does not mark payment paid.
 * Session must already be loaded by callbackToken (missing session → session_not_found by caller).
 */
export function guardZibalCallbackFields(
  input: ZibalCallbackGuardInput,
): ZibalCallbackGuardResult {
  if (!input.token.trim()) {
    return { ok: false, errorCode: "missing_token" };
  }

  const trackId = input.trackId.trim();
  const orderId = input.orderId.trim();

  if (trackId && trackId !== input.sessionProviderSessionId) {
    return { ok: false, errorCode: "track_mismatch" };
  }

  if (orderId && orderId !== input.sessionPaymentIntentId) {
    return { ok: false, errorCode: "order_mismatch" };
  }

  return {
    ok: true,
    trackId: trackId || input.sessionProviderSessionId,
    orderId: orderId || input.sessionPaymentIntentId,
  };
}

/** Strip any accidental merchant fields from audit JSON. */
export function sanitizeZibalAuditJson(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      lower === "merchant" ||
      lower === "merchantid" ||
      lower === "merchant_id" ||
      lower.includes("merchant")
    ) {
      continue;
    }
    out[key] = v;
  }
  return out;
}
