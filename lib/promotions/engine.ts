/**
 * Promotion Engine — apply TIMED → COUPON → REFERRAL → VIP in order.
 * Preserves RegistrationFlow timed-discount fields as the TIMED source of truth
 * (virtual candidate); DB TIMED for the same flow is skipped when virtual applies.
 */

import { PromotionType } from "@/generated/prisma/enums";
import { computePromotionDiscountAmount } from "@/lib/promotions/compute";
import {
  evaluatePromotionEligibility,
} from "@/lib/promotions/eligibility";
import {
  PROMOTION_TYPE_ORDER,
  type AppliedPromotionLine,
  type PromotionCandidate,
  type PromotionEngineResult,
} from "@/lib/promotions/types";
import {
  resolveTimedDiscountPricing,
  type TimedDiscountFields,
} from "@/lib/registration/timed-discount";

function sortWithinType(a: PromotionCandidate, b: PromotionCandidate) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.title.localeCompare(b.title, "fa");
}

export function buildVirtualTimedPromotion(params: {
  flowId: string | null;
  timedFields: TimedDiscountFields;
  now: Date;
}): PromotionCandidate | null {
  const timed = resolveTimedDiscountPricing(params.timedFields, params.now);
  if (!timed.discountActive || timed.discountRials <= 0) return null;

  return {
    id: params.flowId
      ? `virtual-timed:${params.flowId}`
      : "virtual-timed:flow",
    title: params.timedFields.pricingBadge?.trim() || "تخفیف زمان‌دار",
    code: null,
    type: PromotionType.TIMED,
    valueType: "FIXED",
    value: timed.discountRials,
    maxDiscountAmount: null,
    stackable: true,
    priority: 0,
    startsAt: params.timedFields.discountStartsAt,
    endsAt: params.timedFields.discountEndsAt,
    usageLimit: null,
    usageCount: 0,
    usagePerNationalCode: null,
    isActive: true,
    registrationFlowId: params.flowId,
    ownerStaffId: null,
    virtual: true,
  };
}

export function applyPromotionEngine(params: {
  amountRials: number;
  candidates: PromotionCandidate[];
  /** Redeem code from wizard (coupon / referral / vip). */
  redeemCode?: string | null;
  registrationFlowId: string | null;
  now?: Date;
  nationalCodeUsageByPromotionId?: Record<string, number>;
  /** Flow timed fields — preferred TIMED source (compatibility). */
  timedFields?: TimedDiscountFields | null;
  pricingBadgeFallback?: string | null;
}): PromotionEngineResult {
  const now = params.now ?? new Date();
  const amountRials = Math.max(0, Math.floor(params.amountRials));
  let current = amountRials;
  const applied: AppliedPromotionLine[] = [];
  const blockedTypes = new Set<string>();
  let pricingBadge: string | null = null;
  let discountEndsAt: Date | null = null;
  let discountCode: string | null = null;
  let referralPromotionId: string | null = null;
  let referralOwnerStaffId: string | null = null;

  const redeem = (params.redeemCode ?? "").trim().toUpperCase() || null;

  const candidates = [...params.candidates];
  if (params.timedFields) {
    const virtual = buildVirtualTimedPromotion({
      flowId: params.registrationFlowId,
      timedFields: params.timedFields,
      now,
    });
    if (virtual) {
      candidates.unshift(virtual);
    }
  }

  const byType = new Map<string, PromotionCandidate[]>();
  for (const type of PROMOTION_TYPE_ORDER) {
    byType.set(type, []);
  }
  for (const promo of candidates) {
    const list = byType.get(promo.type);
    if (list) list.push(promo);
  }
  for (const list of byType.values()) {
    list.sort(sortWithinType);
  }

  for (const type of PROMOTION_TYPE_ORDER) {
    const list = byType.get(type) ?? [];
    for (const promo of list) {
      // When virtual TIMED already applied for this flow, skip DB TIMED for same flow.
      if (
        type === PromotionType.TIMED &&
        !promo.virtual &&
        params.registrationFlowId &&
        promo.registrationFlowId === params.registrationFlowId &&
        applied.some(
          (line) =>
            line.type === PromotionType.TIMED && line.virtual === true,
        )
      ) {
        continue;
      }

      // Code-bearing types require an explicit redeem code match.
      if (
        type === PromotionType.COUPON ||
        type === PromotionType.REFERRAL ||
        (type === PromotionType.VIP && promo.code)
      ) {
        if (!redeem || !promo.code || promo.code.toUpperCase() !== redeem) {
          continue;
        }
      }

      const eligibility = evaluatePromotionEligibility({
        promo,
        now,
        registrationFlowId: params.registrationFlowId,
        nationalCodeUsageCount:
          params.nationalCodeUsageByPromotionId?.[promo.id] ?? 0,
        blockedTypes,
      });
      if (!eligibility.ok) continue;

      const discountAmount = computePromotionDiscountAmount({
        currentAmountRials: current,
        valueType: promo.valueType,
        value: promo.value,
        maxDiscountAmount: promo.maxDiscountAmount,
      });
      if (discountAmount <= 0) continue;

      current = Math.max(0, current - discountAmount);
      applied.push({
        promotionId: promo.id,
        title: promo.title,
        code: promo.code,
        type: promo.type,
        discountAmountRials: discountAmount,
        virtual: promo.virtual,
        ownerStaffId: promo.ownerStaffId,
      });

      if (promo.type === PromotionType.TIMED) {
        pricingBadge = promo.title || params.pricingBadgeFallback || null;
        discountEndsAt = promo.endsAt;
      }
      if (promo.code) {
        discountCode = promo.code.toUpperCase();
      }
      if (promo.type === PromotionType.REFERRAL) {
        referralPromotionId = promo.virtual ? null : promo.id;
        referralOwnerStaffId = promo.ownerStaffId;
      }

      if (!promo.stackable) {
        blockedTypes.add(promo.type);
      }

      // Only one code-redeemed promo of each type in a single resolve.
      if (
        type === PromotionType.COUPON ||
        type === PromotionType.REFERRAL ||
        (type === PromotionType.VIP && promo.code)
      ) {
        break;
      }

      // Auto VIP without code: apply highest priority only unless stackable chain.
      if (type === PromotionType.VIP && !promo.code) {
        if (!promo.stackable) break;
      }
    }
  }

  // Legacy catalog fixed codes are handled by caller if no coupon matched.
  const discountRials = Math.max(0, amountRials - current);
  const discountPercent =
    amountRials > 0 && discountRials > 0
      ? Math.round((discountRials / amountRials) * 100)
      : null;

  return {
    amountRials,
    discountRials,
    finalAmountRials: current,
    applied,
    discountCode,
    referralPromotionId,
    referralOwnerStaffId,
    pricingBadge,
    discountActive: discountRials > 0,
    discountEndsAt: applied.some((a) => a.type === PromotionType.TIMED)
      ? discountEndsAt
      : null,
    discountPercent,
  };
}
