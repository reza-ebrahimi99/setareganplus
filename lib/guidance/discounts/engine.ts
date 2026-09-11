/**
 * Canonical guidance discount engine.
 * Integer rials only. No floating-point money. Client-safe (no Prisma).
 *
 * Rounding: percentage discount = floor(originalRials * percent / 100).
 * Floor is deterministic and never exceeds the exact rational amount.
 */

export const TOMAN_TO_RIALS = 10;

/**
 * Canonical FIXED storage is integer toman × 10.
 * Values below 1,000,000 rials (100,000 toman) collide with unconverted
 * toman amounts such as 500,000. Fail closed — do not guess; do not rewrite rows.
 */
export const MIN_CANONICAL_FIXED_RIALS = 1_000_000;

export const AMBIGUOUS_FIXED_VALUE_ERROR =
  "مبلغ ثابت این کد تخفیف مبهم است. آن را در پنل مدیریت ویرایش و دوباره ذخیره کنید.";

export function assertCanonicalStoredFixedAmountRials(
  value: number,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, error: "مبلغ تخفیف ثابت نامعتبر است." };
  }
  if (value % TOMAN_TO_RIALS !== 0) {
    return { ok: false, error: AMBIGUOUS_FIXED_VALUE_ERROR };
  }
  if (value < MIN_CANONICAL_FIXED_RIALS) {
    return { ok: false, error: AMBIGUOUS_FIXED_VALUE_ERROR };
  }
  return { ok: true };
}

export type GuidanceDiscountCalcType = "FIXED_AMOUNT" | "PERCENTAGE";

export type GuidanceDiscountCalculation = {
  originalAmountRials: number;
  discountAmountRials: number;
  finalAmountRials: number;
  effectivePercent: number;
};

export function normalizeGuidanceDiscountCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function tomanToRial(toman: number): number {
  if (!Number.isInteger(toman) || toman < 0) {
    throw new Error("مبلغ تومان باید عدد صحیح نامنفی باشد.");
  }
  return toman * TOMAN_TO_RIALS;
}

export function rialToToman(rials: number): number {
  if (!Number.isInteger(rials) || rials < 0) {
    throw new Error("مبلغ ریال باید عدد صحیح نامنفی باشد.");
  }
  return Math.floor(rials / TOMAN_TO_RIALS);
}

export function formatTomanFromRials(rials: number): string {
  return rialToToman(rials).toLocaleString("en-US");
}

export const formatToman = formatTomanFromRials;

export function calculateGuidanceDiscount(params: {
  originalAmountRials: number;
  type: GuidanceDiscountCalcType;
  value: number;
}):
  | { ok: true; result: GuidanceDiscountCalculation }
  | { ok: false; error: string } {
  const original = params.originalAmountRials;
  if (!Number.isInteger(original) || original < 0) {
    return { ok: false, error: "مبلغ بسته نامعتبر است." };
  }

  let discount: number;
  if (params.type === "PERCENTAGE") {
    const percent = params.value;
    if (!Number.isInteger(percent) || percent <= 0 || percent > 100) {
      return { ok: false, error: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
    }
    discount = Math.floor((original * percent) / 100);
  } else {
    const fixed = params.value;
    if (!Number.isInteger(fixed) || fixed <= 0) {
      return { ok: false, error: "مبلغ تخفیف ثابت نامعتبر است." };
    }
    // Cap at original — never negative payable.
    discount = Math.min(original, fixed);
  }

  const final = original - discount;
  const invariant = assertFinancialInvariant({
    originalAmountRials: original,
    discountAmountRials: discount,
    finalAmountRials: final,
  });
  if (!invariant.ok) return invariant;

  const effectivePercent =
    original === 0 ? 0 : Math.floor((discount * 100) / original);

  return {
    ok: true,
    result: {
      originalAmountRials: original,
      discountAmountRials: discount,
      finalAmountRials: final,
      effectivePercent,
    },
  };
}

export function assertFinancialInvariant(params: {
  originalAmountRials: number;
  discountAmountRials: number;
  finalAmountRials: number;
}): { ok: true } | { ok: false; error: string } {
  const { originalAmountRials: original, discountAmountRials: discount, finalAmountRials: final } =
    params;
  if (
    !Number.isInteger(original) ||
    !Number.isInteger(discount) ||
    !Number.isInteger(final)
  ) {
    return { ok: false, error: "مبالغ مالی باید عدد صحیح ریال باشند." };
  }
  if (original < 0 || discount < 0 || final < 0) {
    return { ok: false, error: "مبالغ مالی نمی‌توانند منفی باشند." };
  }
  if (discount > original) {
    return { ok: false, error: "مبلغ تخفیف از قیمت بسته بیشتر است." };
  }
  if (original !== discount + final) {
    return { ok: false, error: "جمع تخفیف و مبلغ نهایی با قیمت بسته برابر نیست." };
  }
  return { ok: true };
}

export function assertGatewayAmountMatchesIntent(params: {
  intentFinalAmountRials: number;
  gatewayAmountRials: number;
}): { ok: true } | { ok: false; error: string } {
  if (params.intentFinalAmountRials !== params.gatewayAmountRials) {
    return { ok: false, error: "مبلغ درگاه با مبلغ نهایی پرداخت هم‌خوان نیست." };
  }
  return { ok: true };
}
