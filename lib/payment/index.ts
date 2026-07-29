/**
 * Payment foundation public exports.
 */

export type {
  PaymentProvider,
  RequestPaymentInput,
  RequestPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/lib/payment/provider";
export { getPaymentProvider, setPaymentProviderForTests, resolveConfiguredPaymentProviderId } from "@/lib/payment/get-provider";
export {
  startCheckoutForRegistration,
  verifyPaymentCallback,
  getPaymentIntentPublicView,
  getMockCheckoutSession,
} from "@/lib/payment/service";
export {
  canTransitionPaymentStatus,
  assertPaymentTransition,
  isTerminalPaymentStatus,
  isRetryablePaymentStatus,
} from "@/lib/payment/status-machine";
export {
  validatePayableTarget,
  registrationPayableTarget,
  commerceOrderPayableTarget,
  isRegistrationPayable,
  isCommerceOrderPayable,
  PayableTargetError,
} from "@/lib/payment/payable";
