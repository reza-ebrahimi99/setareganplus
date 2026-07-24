/**
 * Unit tests for Promotion Engine (no DB).
 * Run: npx tsx scripts/promotion-engine-unit-tests.ts
 */

import assert from "node:assert/strict";
import { PromotionType } from "../generated/prisma/enums";
import { computePromotionDiscountAmount } from "../lib/promotions/compute";
import { applyPromotionEngine } from "../lib/promotions/engine";
import type { PromotionCandidate } from "../lib/promotions/types";

function basePromo(
  partial: Partial<PromotionCandidate> &
    Pick<PromotionCandidate, "id" | "title" | "type" | "valueType" | "value">,
): PromotionCandidate {
  return {
    code: null,
    maxDiscountAmount: null,
    stackable: false,
    priority: 100,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    usagePerNationalCode: null,
    isActive: true,
    registrationFlowId: null,
    ownerStaffId: null,
    ...partial,
  };
}

function testCompute() {
  assert.equal(
    computePromotionDiscountAmount({
      currentAmountRials: 1_000_000,
      valueType: "PERCENT",
      value: 10,
    }),
    100_000,
  );
  assert.equal(
    computePromotionDiscountAmount({
      currentAmountRials: 1_000_000,
      valueType: "PERCENT",
      value: 50,
      maxDiscountAmount: 200_000,
    }),
    200_000,
  );
  assert.equal(
    computePromotionDiscountAmount({
      currentAmountRials: 500_000,
      valueType: "FIXED",
      value: 800_000,
    }),
    500_000,
  );
}

function testOrderAndStacking() {
  const now = new Date("2026-07-24T12:00:00.000Z");
  const result = applyPromotionEngine({
    amountRials: 1_000_000,
    now,
    registrationFlowId: "flow-1",
    redeemCode: "REF10",
    timedFields: {
      paymentAmountRials: 1_000_000,
      saleAmountRials: 800_000,
      discountStartsAt: null,
      discountEndsAt: null,
      pricingBadge: "فروش ویژه",
      showDiscountCountdown: false,
      isFree: false,
    },
    candidates: [
      basePromo({
        id: "c1",
        title: "کوپن",
        code: "SAVE5",
        type: PromotionType.COUPON,
        valueType: "PERCENT",
        value: 5,
        stackable: false,
      }),
      basePromo({
        id: "r1",
        title: "معرف علی",
        code: "REF10",
        type: PromotionType.REFERRAL,
        valueType: "PERCENT",
        value: 10,
        ownerStaffId: "staff-1",
        stackable: false,
      }),
    ],
  });

  // Timed first: 200k off → 800k, then referral 10% of 800k = 80k → 720k
  assert.equal(result.finalAmountRials, 720_000);
  assert.equal(result.applied[0]?.type, PromotionType.TIMED);
  assert.equal(result.applied[1]?.type, PromotionType.REFERRAL);
  assert.equal(result.referralOwnerStaffId, "staff-1");
  assert.equal(result.discountCode, "REF10");
}

function testInactiveRejected() {
  const result = applyPromotionEngine({
    amountRials: 1_000_000,
    registrationFlowId: null,
    redeemCode: "DEAD",
    candidates: [
      basePromo({
        id: "x",
        title: "مرده",
        code: "DEAD",
        type: PromotionType.COUPON,
        valueType: "FIXED",
        value: 100_000,
        isActive: false,
      }),
    ],
  });
  assert.equal(result.discountRials, 0);
  assert.equal(result.applied.length, 0);
}

function testNonStackableBlocksSameType() {
  const result = applyPromotionEngine({
    amountRials: 1_000_000,
    registrationFlowId: null,
    candidates: [
      basePromo({
        id: "v1",
        title: "VIP1",
        type: PromotionType.VIP,
        valueType: "FIXED",
        value: 50_000,
        stackable: false,
        priority: 1,
      }),
      basePromo({
        id: "v2",
        title: "VIP2",
        type: PromotionType.VIP,
        valueType: "FIXED",
        value: 80_000,
        stackable: false,
        priority: 2,
      }),
    ],
  });
  assert.equal(result.applied.length, 1);
  assert.equal(result.applied[0]?.promotionId, "v1");
  assert.equal(result.finalAmountRials, 950_000);
}

testCompute();
testOrderAndStacking();
testInactiveRejected();
testNonStackableBlocksSameType();
console.log("promotion-engine-unit-tests: ok");
