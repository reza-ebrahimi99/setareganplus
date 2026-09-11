/**
 * Compatibility surface. New code should import engine.ts directly.
 */

export {
  TOMAN_TO_RIALS,
  calculateGuidanceDiscount,
  formatToman,
  formatTomanFromRials,
  rialToToman as rialsToToman,
  tomanToRial as tomanToRials,
} from "@/lib/guidance/discounts/engine";
import { calculateGuidanceDiscount } from "@/lib/guidance/discounts/engine";

export function parsePositiveInt(raw: string, label: string): number | string {
  const trimmed = raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
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
  const calc = calculateGuidanceDiscount({
    originalAmountRials: Math.max(0, Math.floor(params.packagePriceRials)),
    type: params.type,
    value: params.value,
  });
  if (!calc.ok) return 0;
  return calc.result.discountAmountRials;
}

export function computePayableRials(params: {
  packagePriceRials: number;
  discountRials: number;
}): { discountRials: number; finalAmountRials: number } {
  const price = Math.max(0, Math.floor(params.packagePriceRials));
  const requested = Math.max(0, Math.floor(params.discountRials));
  if (requested === 0) {
    return { discountRials: 0, finalAmountRials: price };
  }
  const calc = calculateGuidanceDiscount({
    originalAmountRials: price,
    type: "FIXED_AMOUNT",
    value: requested,
  });
  if (!calc.ok) {
    return { discountRials: 0, finalAmountRials: price };
  }
  return {
    discountRials: calc.result.discountAmountRials,
    finalAmountRials: calc.result.finalAmountRials,
  };
}
