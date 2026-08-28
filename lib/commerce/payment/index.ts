/**
 * Commerce ↔ Payment bridge notes (Phase 1).
 * Checkout initiation for commerce is deferred; only payable target helpers live here.
 */

export {
  commerceOrderPayableTarget,
  validatePayableTarget,
  type ValidatedPayableTarget,
} from "@/lib/payment/payable";
