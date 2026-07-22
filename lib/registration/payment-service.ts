/**
 * Payment provider boundary for Registration Engine.
 * Zarinpal (or others) will implement this interface — no fake success.
 */

export type PaymentStartRequest = {
  organizationId: string;
  registrationId: string;
  registrationNumber: string;
  amountRials: number;
  description: string;
  callbackPath: string;
};

export type PaymentStartSuccess = {
  ok: true;
  /** Provider accepted the intent; checkout may be unavailable until integrated. */
  status: "awaiting_provider";
  checkoutUrl: string | null;
  trackingCode: string | null;
  provider: string;
  message: string;
};

export type PaymentStartFailure = {
  ok: false;
  error: string;
};

export type PaymentStartResult = PaymentStartSuccess | PaymentStartFailure;

export interface PaymentService {
  startPayment(request: PaymentStartRequest): Promise<PaymentStartResult>;
}

/**
 * Placeholder: records that payment is required without simulating a paid state.
 */
export class PlaceholderPaymentService implements PaymentService {
  async startPayment(
    request: PaymentStartRequest,
  ): Promise<PaymentStartResult> {
    if (request.amountRials < 0) {
      return { ok: false, error: "مبلغ پرداخت نامعتبر است." };
    }

    return {
      ok: true,
      status: "awaiting_provider",
      checkoutUrl: null,
      trackingCode: null,
      provider: "placeholder",
      message:
        "درگاه پرداخت آنلاین به‌زودی فعال می‌شود. ثبت‌نام شما با وضعیت «در انتظار پرداخت» ذخیره شد.",
    };
  }
}

let paymentServiceSingleton: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentServiceSingleton) {
    paymentServiceSingleton = new PlaceholderPaymentService();
  }
  return paymentServiceSingleton;
}

/** Test/DI hook — production uses Placeholder until Zarinpal is wired. */
export function setPaymentServiceForTests(service: PaymentService | null): void {
  paymentServiceSingleton = service;
}
