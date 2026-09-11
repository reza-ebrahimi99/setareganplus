/**
 * Canonical guidance discount engine tests. No database.
 */

import assert from "node:assert/strict";
import {
  AMBIGUOUS_FIXED_VALUE_ERROR,
  assertCanonicalStoredFixedAmountRials,
  assertFinancialInvariant,
  calculateGuidanceDiscount,
  formatTomanFromRials,
  normalizeGuidanceDiscountCode,
  rialToToman,
  tomanToRial,
} from "../lib/guidance/discounts/engine";
import { generateUniqueGuidanceDiscountCodes } from "../lib/guidance/discounts/generate";

const PREMIUM_TOMAN = 7_900_000;
const PREMIUM_RIALS = 79_000_000;

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("toman → rial", () => {
  assert.equal(tomanToRial(PREMIUM_TOMAN), PREMIUM_RIALS);
  assert.equal(tomanToRial(500_000), 5_000_000);
});

test("rial → toman", () => {
  assert.equal(rialToToman(PREMIUM_RIALS), PREMIUM_TOMAN);
  assert.equal(rialToToman(2_370_000), 237_000);
});

test("PREMIUM 97%", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 97,
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.originalAmountRials, 79_000_000);
  assert.equal(calc.result.discountAmountRials, 76_630_000);
  assert.equal(calc.result.finalAmountRials, 2_370_000);
  assert.equal(rialToToman(calc.result.discountAmountRials), 7_663_000);
  assert.equal(rialToToman(calc.result.finalAmountRials), 237_000);
});

test("PREMIUM 10%", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 10,
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.discountAmountRials, 7_900_000);
  assert.equal(calc.result.finalAmountRials, 71_100_000);
  assert.equal(rialToToman(calc.result.discountAmountRials), 790_000);
  assert.equal(rialToToman(calc.result.finalAmountRials), 7_110_000);
});

test("PREMIUM 50%", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 50,
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.discountAmountRials, 39_500_000);
  assert.equal(calc.result.finalAmountRials, 39_500_000);
});

test("PREMIUM fixed 500,000 toman", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "FIXED_AMOUNT",
    value: tomanToRial(500_000),
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.finalAmountRials, tomanToRial(7_400_000));
  assert.equal(rialToToman(calc.result.finalAmountRials), 7_400_000);
});

test("0% invalid", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 0,
  });
  assert.equal(calc.ok, false);
});

test("101% invalid", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 101,
  });
  assert.equal(calc.ok, false);
});

test("negative invalid", () => {
  const percent = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: -10,
  });
  const fixed = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "FIXED_AMOUNT",
    value: -1,
  });
  const original = calculateGuidanceDiscount({
    originalAmountRials: -1,
    type: "PERCENTAGE",
    value: 10,
  });
  assert.equal(percent.ok, false);
  assert.equal(fixed.ok, false);
  assert.equal(original.ok, false);
});

test("fixed greater than package is capped", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "FIXED_AMOUNT",
    value: tomanToRial(9_000_000),
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.discountAmountRials, PREMIUM_RIALS);
  assert.equal(calc.result.finalAmountRials, 0);
});

test("100% zero payable", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 100,
  });
  assert.equal(calc.ok, true);
  if (!calc.ok) return;
  assert.equal(calc.result.discountAmountRials, PREMIUM_RIALS);
  assert.equal(calc.result.finalAmountRials, 0);
});

test("financial invariant", () => {
  const ok = assertFinancialInvariant({
    originalAmountRials: 79_000_000,
    discountAmountRials: 76_630_000,
    finalAmountRials: 2_370_000,
  });
  const bad = assertFinancialInvariant({
    originalAmountRials: 79_000_000,
    discountAmountRials: 10,
    finalAmountRials: 10,
  });
  assert.equal(ok.ok, true);
  assert.equal(bad.ok, false);
});

test("formatToman from rials", () => {
  assert.equal(formatTomanFromRials(2_370_000), "237,000");
});

test("code normalization", () => {
  assert.equal(normalizeGuidanceDiscountCode("  seta 97 "), "SETA97");
  assert.equal(normalizeGuidanceDiscountCode("seta-97"), "SETA-97");
});

test("ambiguous FIXED 500,000 (toman-scale) fails closed", () => {
  const stored = assertCanonicalStoredFixedAmountRials(500_000);
  assert.equal(stored.ok, false);
  if (stored.ok) return;
  assert.equal(stored.error, AMBIGUOUS_FIXED_VALUE_ERROR);
});

test("canonical FIXED 500,000 toman as rials is accepted", () => {
  const stored = assertCanonicalStoredFixedAmountRials(tomanToRial(500_000));
  assert.equal(stored.ok, true);
});

test("PERCENT values are not subject to FIXED storage gate", () => {
  const calc = calculateGuidanceDiscount({
    originalAmountRials: PREMIUM_RIALS,
    type: "PERCENTAGE",
    value: 97,
  });
  assert.equal(calc.ok, true);
});

test("bulk unique codes", () => {
  const codes = generateUniqueGuidanceDiscountCodes({
    count: 40,
    prefix: "SETA",
    existing: new Set(["SETA234567"]),
  });
  assert.equal(codes.length, 40);
  assert.equal(new Set(codes).size, 40);
  assert.equal(codes.includes("SETA234567"), false);
});

console.log(`guidance-discount-engine-unit-tests: ${passed} ok`);
