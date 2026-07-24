/**
 * Pure discount amount math for a single promotion against a running total.
 */

import type { PromotionValueType } from "@/generated/prisma/enums";

export function computePromotionDiscountAmount(params: {
  currentAmountRials: number;
  valueType: PromotionValueType;
  value: number;
  maxDiscountAmount?: number | null;
}): number {
  const current = Math.max(0, Math.floor(params.currentAmountRials));
  if (current <= 0) return 0;

  const value = Math.floor(params.value);
  if (!Number.isInteger(value) || value <= 0) return 0;

  let raw = 0;
  if (params.valueType === "PERCENT") {
    if (value > 100) return 0;
    raw = Math.floor((current * value) / 100);
  } else {
    raw = value;
  }

  let discount = Math.min(raw, current);
  if (
    params.maxDiscountAmount != null &&
    Number.isInteger(params.maxDiscountAmount) &&
    params.maxDiscountAmount >= 0
  ) {
    discount = Math.min(discount, params.maxDiscountAmount);
  }
  return Math.max(0, discount);
}
