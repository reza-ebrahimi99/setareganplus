/**
 * Promotion Engine — shared types.
 */

import type {
  PromotionType,
  PromotionValueType,
} from "@/generated/prisma/enums";
import type { PromotionRules } from "@/lib/promotions/rules";

export type PromotionCandidate = {
  id: string;
  title: string;
  code: string | null;
  type: PromotionType;
  valueType: PromotionValueType;
  value: number;
  maxDiscountAmount: number | null;
  stackable: boolean;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  usagePerNationalCode: number | null;
  isActive: boolean;
  registrationFlowId: string | null;
  ownerStaffId: string | null;
  rules?: PromotionRules;
  /** Virtual TIMED from RegistrationFlow fields (not a DB row). */
  virtual?: boolean;
};

export type AppliedPromotionLine = {
  promotionId: string;
  title: string;
  code: string | null;
  type: PromotionType;
  discountAmountRials: number;
  virtual?: boolean;
  ownerStaffId: string | null;
};

export type PromotionEngineResult = {
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  applied: AppliedPromotionLine[];
  /** Primary redeem code (coupon / referral / vip) if any. */
  discountCode: string | null;
  referralPromotionId: string | null;
  referralOwnerStaffId: string | null;
  pricingBadge: string | null;
  discountActive: boolean;
  discountEndsAt: Date | null;
  discountPercent: number | null;
};

export const PROMOTION_TYPE_ORDER: readonly PromotionType[] = [
  "TIMED",
  "COUPON",
  "REFERRAL",
  "VIP",
] as const;

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  TIMED: "تخفیف زمان‌دار",
  COUPON: "کد تخفیف",
  REFERRAL: "کد معرف",
  VIP: "VIP",
};

export const PROMOTION_VALUE_TYPE_LABELS: Record<PromotionValueType, string> = {
  PERCENT: "درصدی",
  FIXED: "مبلغ ثابت",
};
