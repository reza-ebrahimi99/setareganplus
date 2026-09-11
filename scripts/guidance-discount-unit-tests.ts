import assert from "node:assert/strict";
import {
  computeDiscountRials,
  computePayableRials,
  tomanToRials,
} from "@/lib/guidance/discounts/money";
import { generateUniqueGuidanceDiscountCodes } from "@/lib/guidance/discounts/generate";
import { parsePackageScope, scopeIncludesPackage } from "@/lib/guidance/discounts/packages";

function testFixed500kToman() {
  const discount = computeDiscountRials({
    type: "FIXED_AMOUNT",
    value: tomanToRials(500_000),
    packagePriceRials: 8_000_000,
  });
  const payable = computePayableRials({
    packagePriceRials: 8_000_000,
    discountRials: discount,
  });
  assert.equal(discount, 5_000_000);
  assert.equal(payable.finalAmountRials, 3_000_000);
}

function testTenPercent() {
  const discount = computeDiscountRials({
    type: "PERCENTAGE",
    value: 10,
    packagePriceRials: 8_000_000,
  });
  assert.equal(discount, 800_000);
}

function testNeverNegative() {
  const payable = computePayableRials({
    packagePriceRials: 1_000_000,
    discountRials: 9_000_000,
  });
  assert.equal(payable.finalAmountRials, 0);
  assert.equal(payable.discountRials, 1_000_000);
}

function testWrongPackage() {
  const scope = parsePackageScope("SMART,PREMIUM");
  assert.equal(scopeIncludesPackage(scope, "SPECIALIZED"), false);
  assert.equal(scopeIncludesPackage(scope, "SMART"), true);
  assert.equal(scopeIncludesPackage("ALL", "SPECIALIZED"), true);
}

function testBulkUnique() {
  const codes = generateUniqueGuidanceDiscountCodes({
    count: 100,
    prefix: "SETA",
    existing: new Set(),
  });
  assert.equal(codes.length, 100);
  assert.equal(new Set(codes).size, 100);
  assert.ok(codes.every((code) => code.startsWith("SETA")));
}

function testBulkAvoidsExisting() {
  const existing = new Set(["SETA234567", "SETA89ABCD"]);
  const codes = generateUniqueGuidanceDiscountCodes({
    count: 20,
    prefix: "SETA",
    existing,
  });
  assert.equal(codes.length, 20);
  for (const code of existing) {
    assert.equal(codes.includes(code), false);
  }
}

testFixed500kToman();
testTenPercent();
testNeverNegative();
testWrongPackage();
testBulkUnique();
testBulkAvoidsExisting();

const premium97 = computeDiscountRials({
  type: "PERCENTAGE",
  value: 97,
  packagePriceRials: 79_000_000,
});
assert.equal(premium97, 76_630_000);
console.log("guidance-discount-unit-tests: ok");
