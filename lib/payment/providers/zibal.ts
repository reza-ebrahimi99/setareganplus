/**
 * Zibal IPG provider — server-only.
 * Official contract (help.zibal.ir/ipg + zibalco samples):
 * - POST https://gateway.zibal.ir/v1/request
 * - GET  https://gateway.zibal.ir/start/{trackId}
 * - POST https://gateway.zibal.ir/v1/verify
 * - Callback query: trackId, success, status, orderId
 * - Amount unit: Rials
 * - request success result: 100
 * - verify success: 100; already verified: 201
 */

import type {
  PaymentProvider,
  RequestPaymentInput,
  RequestPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/lib/payment/provider";
import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";
import {
  isAllowedZibalCheckoutUrl,
  sanitizeZibalAuditJson,
} from "@/lib/payment/payment-guards";
import {
  asRecord,
  postZibalJson,
  readInteger,
  readString,
  readZibalMerchantId,
  zibalStartUrl,
} from "@/lib/payment/providers/zibal-http";

function logZibal(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  console.info("[payment.zibal]", { event, ...fields });
}

function buildCallbackUrl(input: RequestPaymentInput): string | null {
  const configured = process.env.ZIBAL_CALLBACK_URL?.trim();
  const base =
    configured && configured.length > 0
      ? configured
      : `${PUBLIC_SITE_ORIGIN}${input.callbackPath.startsWith("/") ? input.callbackPath : `/${input.callbackPath}`}`;

  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    url.searchParams.set("token", input.callbackToken);
    return url.toString();
  } catch {
    return null;
  }
}

function mapRequestResultCode(result: number | null): string {
  switch (result) {
    case 100:
      return "ok";
    case 102:
      return "merchant_not_found";
    case 103:
      return "merchant_inactive";
    case 104:
      return "merchant_invalid";
    case 105:
      return "amount_too_small";
    case 106:
      return "callback_invalid";
    case 113:
      return "amount_too_large";
    default:
      return "request_failed";
  }
}

export class ZibalPaymentProvider implements PaymentProvider {
  readonly id = "zibal" as const;

  async requestPayment(
    input: RequestPaymentInput,
  ): Promise<RequestPaymentResult> {
    const merchant = readZibalMerchantId();
    if (!merchant) {
      return {
        ok: false,
        error: "پیکربندی درگاه زیبال ناقص است.",
      };
    }

    if (!Number.isFinite(input.amountRials) || input.amountRials < 1000) {
      return { ok: false, error: "مبلغ پرداخت نامعتبر است." };
    }

    const callbackUrl = buildCallbackUrl(input);
    if (!callbackUrl) {
      return { ok: false, error: "آدرس بازگشت درگاه نامعتبر است." };
    }

    const body: Record<string, unknown> = {
      merchant,
      amount: Math.trunc(input.amountRials),
      callbackUrl,
      description: input.description.slice(0, 255),
      orderId: input.paymentIntentId,
    };

    const mobile = input.metadata?.mobile?.trim();
    if (mobile) {
      body.mobile = mobile;
    }

    const response = await postZibalJson("v1/request", body);
    if (!response.ok) {
      logZibal("request_http_failed", {
        paymentIntentId: input.paymentIntentId,
        error: response.error,
      });
      return { ok: false, error: response.error };
    }

    const result = readInteger(response.json.result);
    const trackId =
      readInteger(response.json.trackId) ??
      readString(response.json.trackId);

    logZibal("request_response", {
      paymentIntentId: input.paymentIntentId,
      result,
      hasTrackId: Boolean(trackId),
      httpStatus: response.status,
    });

    if (result !== 100 || trackId == null) {
      logZibal("request_rejected", {
        paymentIntentId: input.paymentIntentId,
        result,
        mapped: mapRequestResultCode(result),
      });
      return {
        ok: false,
        error: "ایجاد تراکنش زیبال ناموفق بود.",
      };
    }

    const trackIdStr = String(trackId);
    const checkoutUrl = zibalStartUrl(trackIdStr);
    if (!isAllowedZibalCheckoutUrl(checkoutUrl)) {
      return { ok: false, error: "آدرس درگاه زیبال نامعتبر است." };
    }

    // Never persist merchant credentials in PaymentSession.rawRequestJson
    const safeRaw = sanitizeZibalAuditJson({
      result,
      trackId: trackIdStr,
      mapped: mapRequestResultCode(result),
      callbackHost: new URL(callbackUrl).host,
      message: readString(response.json.message),
    });

    return {
      ok: true,
      provider: this.id,
      providerSessionId: trackIdStr,
      checkoutUrl,
      trackingCode: trackIdStr,
      raw: safeRaw,
    };
  }

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const merchant = readZibalMerchantId();
    if (!merchant) {
      return { ok: false, error: "پیکربندی درگاه زیبال ناقص است." };
    }

    const trackIdRaw =
      readString(input.callbackPayload.trackId) ??
      readInteger(input.callbackPayload.trackId) ??
      input.providerSessionId;

    const trackId =
      typeof trackIdRaw === "number"
        ? trackIdRaw
        : Number.parseInt(String(trackIdRaw).trim(), 10);

    if (!Number.isFinite(trackId)) {
      return { ok: false, error: "شناسه پیگیری زیبال نامعتبر است." };
    }

    const trackIdStr = String(trackId);
    if (trackIdStr !== String(input.providerSessionId).trim()) {
      logZibal("verify_track_mismatch", {
        expectedSession: String(input.providerSessionId),
        callbackTrackId: trackIdStr,
      });
      return {
        ok: false,
        error: "شناسه پیگیری با نشست پرداخت هم‌خوانی ندارد.",
      };
    }

    const successRaw = readString(input.callbackPayload.success);
    const statusRaw =
      readInteger(input.callbackPayload.status) ??
      readString(input.callbackPayload.status);

    // User cancelled / unpaid — still never mark paid without verify when success=1
    if (successRaw === "0" || successRaw === "false") {
      const statusNum =
        typeof statusRaw === "number"
          ? statusRaw
          : statusRaw
            ? Number.parseInt(statusRaw, 10)
            : null;
      const outcome =
        statusNum === 3 ? ("cancelled" as const) : ("failed" as const);
      logZibal("callback_not_success", {
        trackId: trackIdStr,
        status: statusNum,
        outcome,
      });
      return {
        ok: true,
        outcome,
        providerRef: null,
        trackingCode: trackIdStr,
        amountRials: null,
        raw: asRecord(input.callbackPayload) ?? {
          success: successRaw,
          status: statusRaw,
          trackId: trackIdStr,
        },
      };
    }

    const response = await postZibalJson("v1/verify", {
      merchant,
      trackId,
    });

    if (!response.ok) {
      logZibal("verify_http_failed", {
        trackId: trackIdStr,
        error: response.error,
      });
      return { ok: false, error: response.error };
    }

    const result = readInteger(response.json.result);
    const amountRials = readInteger(response.json.amount);
    const refNumber =
      readString(response.json.refNumber) ??
      (readInteger(response.json.refNumber) != null
        ? String(readInteger(response.json.refNumber))
        : null);
    const orderId = readString(response.json.orderId);

    logZibal("verify_response", {
      trackId: trackIdStr,
      result,
      hasAmount: amountRials != null,
      hasRef: Boolean(refNumber),
      orderIdPresent: Boolean(orderId),
    });

    // Official Zibal verify codes:
    // - 100: verified successfully (first time)
    // - 201: already verified previously (idempotent success; still requires
    //   local session ownership, trackId match, and amount comparison before PAID)
    if (result === 100 || result === 201) {
      if (amountRials == null || amountRials < 1000) {
        return {
          ok: false,
          error: "مبلغ تأییدشده از درگاه دریافت نشد.",
        };
      }
      return {
        ok: true,
        outcome: "paid",
        providerRef: refNumber,
        trackingCode: trackIdStr,
        amountRials,
        raw: sanitizeZibalAuditJson({
          result,
          trackId: trackIdStr,
          amount: amountRials,
          refNumber,
          orderId,
          alreadyVerified: result === 201,
          callback: {
            success: successRaw,
            status: statusRaw,
            trackId: trackIdStr,
            orderId: readString(input.callbackPayload.orderId),
          },
        }),
      };
    }

    if (result === 202) {
      return {
        ok: true,
        outcome: "failed",
        providerRef: null,
        trackingCode: trackIdStr,
        amountRials: amountRials,
        raw: sanitizeZibalAuditJson({
          result,
          trackId: trackIdStr,
          amount: amountRials,
        }),
      };
    }

    return {
      ok: false,
      error: "تأیید پرداخت زیبال ناموفق بود.",
    };
  }
}
