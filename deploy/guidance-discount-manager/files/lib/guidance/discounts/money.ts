/**
 * Integer-only guidance discount arithmetic.
 * Canonical payment unit is rials. Admin UI uses تومان (1 تومان = 10 ریال).
 */

export const TOMAN_TO_RIALS = 10;

export function tomanToRials(toman: number): number {
  if (!Number.isInteger(toman) || toman < 0) {
    throw new Error("مبلغ تومان باید عدد صحیح نامنفی باشد.");
  }
  return toman * TOMAN_TO_RIALS;
}

export function rialsToToman(rials: number): number {
  if (!Number.isInteger(rials) || rials < 0) {
    throw new Error("مبلغ ریال باید عدد صحیح نامنفی باشد.");
  }
  return Math.floor(rials / TOMAN_TO_RIALS);
}

export function parsePositiveInt(raw: string, label: string): number | string {
  const trimmed = raw.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (!/^\d+$/.test(trimmed)) return `${label} را به‌صورت عدد وارد کنید.`;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) return `${label} باید بزرگ‌تر از صفر باشد.`;
  return value;
}

export function computeDiscountRials(params: {
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  value: number;
  packagePriceRials: number;
}): number {
  const price = Math.max(0, Math.floor(params.packagePriceRials));
  if (params.type === "PERCENTAGE") {
    const percent = Math.min(100, Math.max(0, Math.floor(params.value)));
    return Math.min(price, Math.floor((price * percent) / 100));
  }
  return Math.min(price, Math.max(0, Math.floor(params.value)));
}

export function computePayableRials(params: {
  packagePriceRials: number;
  discountRials: number;
}): { discountRials: number; finalAmountRials: number } {
  const price = Math.max(0, Math.floor(params.packagePriceRials));
  const discount = Math.min(price, Math.max(0, Math.floor(params.discountRials)));
  return {
    discountRials: discount,
    finalAmountRials: price - discount,
  };
}
