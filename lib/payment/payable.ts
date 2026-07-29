/**
 * Polymorphic payable target validation + helpers.
 * Keeps PaymentIntent creation consistent across Registration and Commerce.
 */

import {
  ACTIVE_PAYMENT_PAYABLE_TYPES,
  type ActivePaymentPayableType,
  type PaymentPayableTypeValue,
} from "@/lib/commerce/types";

export type PayableTargetInput = {
  payableType: PaymentPayableTypeValue | string;
  payableId: string;
  registrationId?: string | null;
};

export type ValidatedPayableTarget = {
  payableType: ActivePaymentPayableType;
  payableId: string;
  registrationId: string | null;
};

export class PayableTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayableTargetError";
  }
}

function isActivePayableType(
  value: string,
): value is ActivePaymentPayableType {
  return (ACTIVE_PAYMENT_PAYABLE_TYPES as readonly string[]).includes(value);
}

/**
 * Validate payable target shape for PaymentIntent create/update.
 * Does not hit the database — call domain resolvers separately when needed.
 */
export function validatePayableTarget(
  input: PayableTargetInput,
): ValidatedPayableTarget {
  const payableType = String(input.payableType ?? "").trim();
  const payableId = String(input.payableId ?? "").trim();
  const registrationId =
    input.registrationId == null || input.registrationId === ""
      ? null
      : String(input.registrationId).trim();

  if (!payableType) {
    throw new PayableTargetError("payableType is required.");
  }
  if (!payableId) {
    throw new PayableTargetError("payableId is required.");
  }

  if (!isActivePayableType(payableType)) {
    throw new PayableTargetError(
      `Payable type "${payableType}" is reserved and not enabled for intent creation yet.`,
    );
  }

  if (payableType === "REGISTRATION") {
    if (!registrationId) {
      throw new PayableTargetError(
        "registrationId is required when payableType is REGISTRATION.",
      );
    }
    if (registrationId !== payableId) {
      throw new PayableTargetError(
        "For REGISTRATION payables, registrationId must equal payableId.",
      );
    }
    return {
      payableType,
      payableId,
      registrationId,
    };
  }

  if (registrationId != null) {
    throw new PayableTargetError(
      "registrationId must be null for non-REGISTRATION payables.",
    );
  }

  return {
    payableType,
    payableId,
    registrationId: null,
  };
}

/** Build a Registration payable target (backward-compatible path). */
export function registrationPayableTarget(
  registrationId: string,
): ValidatedPayableTarget {
  return validatePayableTarget({
    payableType: "REGISTRATION",
    payableId: registrationId,
    registrationId,
  });
}

/** Build a Commerce order payable target. */
export function commerceOrderPayableTarget(
  orderId: string,
): ValidatedPayableTarget {
  return validatePayableTarget({
    payableType: "COMMERCE_ORDER",
    payableId: orderId,
    registrationId: null,
  });
}

export function isRegistrationPayable(
  target: Pick<ValidatedPayableTarget, "payableType">,
): boolean {
  return target.payableType === "REGISTRATION";
}

export function isCommerceOrderPayable(
  target: Pick<ValidatedPayableTarget, "payableType">,
): boolean {
  return target.payableType === "COMMERCE_ORDER";
}
