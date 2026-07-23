/**
 * @deprecated Use lib/payment/service.ts (Sprint 4A).
 * Kept as a thin re-export so older imports keep compiling during transition.
 */

export {
  startCheckoutForRegistration as getPaymentServiceBridge,
} from "@/lib/payment/service";

/** Legacy interface — no longer used by createRegistration. */
export type PaymentStartRequest = {
  organizationId: string;
  registrationId: string;
  registrationNumber: string;
  amountRials: number;
  description: string;
  callbackPath: string;
};

export type PaymentStartResult =
  | {
      ok: true;
      status: "awaiting_provider";
      checkoutUrl: string | null;
      trackingCode: string | null;
      provider: string;
      message: string;
    }
  | { ok: false; error: string };

export interface PaymentService {
  startPayment(request: PaymentStartRequest): Promise<PaymentStartResult>;
}
