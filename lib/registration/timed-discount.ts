/**
 * Shared timed-discount pricing for RegistrationFlow.
 * Used by admin validation, public UI, catalog pricing, and createRegistration.
 * Dates are compared as UTC instants (Date); UI converts Jalali → Tehran wall → UTC.
 */

export type TimedDiscountFields = {
  paymentAmountRials: number;
  saleAmountRials: number | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  pricingBadge: string | null;
  showDiscountCountdown: boolean;
  /** When true, timed sale never applies (FREE flows). */
  isFree: boolean;
};

export type ResolvedTimedDiscount = {
  amountRials: number;
  finalAmountRials: number;
  discountRials: number;
  discountActive: boolean;
  pricingBadge: string | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  showCountdown: boolean;
  discountPercent: number | null;
  savingsRials: number;
};

/** True when saleAmount is set and `now` is inside the optional start/end window. */
export function isTimedDiscountWindowActive(
  flow: Pick<
    TimedDiscountFields,
    "saleAmountRials" | "discountStartsAt" | "discountEndsAt" | "isFree"
  >,
  now = new Date(),
): boolean {
  if (flow.isFree) return false;
  if (flow.saleAmountRials == null) return false;
  if (!Number.isInteger(flow.saleAmountRials) || flow.saleAmountRials < 0) {
    return false;
  }
  if (flow.discountStartsAt && now < flow.discountStartsAt) return false;
  if (flow.discountEndsAt && now > flow.discountEndsAt) return false;
  return true;
}

/**
 * Resolve list/base vs sale price for a RegistrationFlow payment amount.
 * - Inside window + valid sale < base → final = sale
 * - Outside window / missing sale / free → final = paymentAmountRials (or 0 if free)
 */
export function resolveTimedDiscountPricing(
  flow: TimedDiscountFields,
  now = new Date(),
): ResolvedTimedDiscount {
  const amountRials = Math.max(0, Math.floor(flow.paymentAmountRials));

  if (flow.isFree) {
    return {
      amountRials: 0,
      finalAmountRials: 0,
      discountRials: 0,
      discountActive: false,
      pricingBadge: null,
      discountStartsAt: flow.discountStartsAt,
      discountEndsAt: flow.discountEndsAt,
      showCountdown: false,
      discountPercent: null,
      savingsRials: 0,
    };
  }

  const sale = flow.saleAmountRials;
  const windowActive = isTimedDiscountWindowActive(flow, now);
  const saleValid =
    sale != null &&
    Number.isInteger(sale) &&
    sale >= 0 &&
    sale < amountRials;

  const discountActive = windowActive && saleValid;
  const finalAmountRials = discountActive ? sale! : amountRials;
  const discountRials = Math.max(0, amountRials - finalAmountRials);
  const discountPercent =
    discountActive && amountRials > 0
      ? Math.round((discountRials / amountRials) * 100)
      : null;

  return {
    amountRials,
    finalAmountRials,
    discountRials,
    discountActive,
    pricingBadge: discountActive ? flow.pricingBadge : null,
    discountStartsAt: flow.discountStartsAt,
    discountEndsAt: flow.discountEndsAt,
    showCountdown: Boolean(
      discountActive &&
        flow.showDiscountCountdown &&
        flow.discountEndsAt != null,
    ),
    discountPercent,
    savingsRials: discountRials,
  };
}

export type TimedDiscountValidation =
  | {
      ok: true;
      saleAmountRials: number | null;
      pricingBadge: string | null;
      discountStartsAt: Date | null;
      discountEndsAt: Date | null;
      showDiscountCountdown: boolean;
    }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * Normalize + validate admin form timed-discount payload.
 * When disabled or free, all discount fields clear to null / safe defaults.
 */
export function validateTimedDiscountFormInput(params: {
  enabled: boolean;
  isFree: boolean;
  paymentAmountRials: number;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  showDiscountCountdown: boolean;
  /** Parse failures already mapped to Persian messages. */
  parseErrors?: Record<string, string>;
}): TimedDiscountValidation {
  const fieldErrors: Record<string, string> = {
    ...(params.parseErrors ?? {}),
  };

  if (params.isFree || !params.enabled) {
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, fieldErrors };
    }
    return {
      ok: true,
      saleAmountRials: null,
      pricingBadge: null,
      discountStartsAt: null,
      discountEndsAt: null,
      showDiscountCountdown: true,
    };
  }

  if (params.saleAmountRials == null) {
    fieldErrors.saleAmountRials = "قیمت تخفیفی را وارد کنید.";
  } else if (params.saleAmountRials < 0) {
    fieldErrors.saleAmountRials = "قیمت تخفیفی نمی‌تواند منفی باشد.";
  } else if (params.saleAmountRials >= params.paymentAmountRials) {
    fieldErrors.saleAmountRials =
      "قیمت تخفیفی باید کمتر از قیمت اصلی باشد.";
  }

  if (
    params.discountStartsAt &&
    params.discountEndsAt &&
    params.discountEndsAt.getTime() <= params.discountStartsAt.getTime()
  ) {
    fieldErrors.discountEndsAt =
      "تاریخ پایان تخفیف باید بعد از تاریخ شروع باشد.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    saleAmountRials: params.saleAmountRials,
    pricingBadge: params.pricingBadge,
    discountStartsAt: params.discountStartsAt,
    discountEndsAt: params.discountEndsAt,
    showDiscountCountdown: params.showDiscountCountdown,
  };
}
