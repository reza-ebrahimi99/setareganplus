/**
 * Checkout financial handoff tests.
 * Asserts gateway-request amounts without creating a real Zibal transaction.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertGuidanceGatewayHandoff,
  buildGuidanceCheckoutIdempotencyKey,
  decideGuidanceCheckoutPath,
  prepareGuidanceCheckoutHandoff,
} from "../lib/guidance/checkout/financials";
import { evaluateStoredGuidanceDiscount } from "../lib/guidance/discounts/quote";
import { rialToToman, tomanToRial } from "../lib/guidance/discounts/engine";
import { resolveGuidancePayablePackage } from "../lib/guidance/packages/resolve-payable";
import { getGuidancePackage } from "../lib/guidance/journey/packages";

const SMART = resolveGuidancePayablePackage("SMART", { journeyVersion: 2 });
const SPECIALIZED = resolveGuidancePayablePackage("SPECIALIZED", { journeyVersion: 2 });
const PREMIUM = resolveGuidancePayablePackage("PREMIUM", { journeyVersion: 2 });
assert.ok(SMART);
assert.ok(SPECIALIZED);
assert.ok(PREMIUM);
assert.equal(SMART.priceRials, 43_000_000);
assert.equal(SPECIALIZED.priceRials, 57_000_000);
assert.equal(PREMIUM.priceRials, 79_000_000);
assert.equal(rialToToman(SMART.priceRials), 4_300_000);
assert.equal(rialToToman(SPECIALIZED.priceRials), 5_700_000);
assert.equal(rialToToman(PREMIUM.priceRials), 7_900_000);
assert.notEqual(PREMIUM.priceRials, getGuidancePackage("PREMIUM")?.priceRials);

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function stored(partial: Partial<Parameters<typeof evaluateStoredGuidanceDiscount>[0]["row"]> & {
  type: string;
  value: number;
}) {
  return {
    id: "disc-1",
    isActive: true,
    startsAt: null,
    endsAt: null,
    maxUses: null,
    usageCount: 0,
    packageScope: "ALL",
    ...partial,
  };
}

function planCheckout(params: {
  packageCode: string;
  row?: ReturnType<typeof stored>;
}) {
  const pkg = resolveGuidancePayablePackage(params.packageCode, { journeyVersion: 2 });
  if (!pkg || !pkg.requiresPayment) {
    return { ok: false as const, error: "بسته انتخاب‌شده معتبر نیست.", createGateway: false };
  }
  if (!params.row) {
    const handoff = prepareGuidanceCheckoutHandoff({ packageCode: pkg.code });
    if (!handoff.ok) return { ...handoff, createGateway: false };
    return {
      ok: true as const,
      snapshot: handoff.snapshot,
      createGateway: handoff.snapshot.path === "gateway",
      gatewayAmountRials: handoff.snapshot.gatewayAmountRials,
    };
  }
  const quote = evaluateStoredGuidanceDiscount({
    row: params.row,
    code: "TEST97",
    packageCode: pkg.code,
    packagePriceRials: pkg.priceRials,
  });
  if (!quote.ok) {
    return { ok: false as const, error: quote.error, createGateway: false };
  }
  const handoff = prepareGuidanceCheckoutHandoff({
    packageCode: pkg.code,
    discount: { type: quote.type, value: params.row.value },
  });
  if (!handoff.ok) return { ...handoff, createGateway: false };
  return {
    ok: true as const,
    snapshot: handoff.snapshot,
    createGateway: handoff.snapshot.path === "gateway",
    gatewayAmountRials: handoff.snapshot.gatewayAmountRials,
  };
}

test("V2 checkout never uses V1 PREMIUM price", () => {
  const v1 = getGuidancePackage("PREMIUM");
  assert.ok(v1);
  assert.equal(v1.priceRials, 1_890_000);
  const handoff = prepareGuidanceCheckoutHandoff({ packageCode: "PREMIUM" });
  assert.equal(handoff.ok, true);
  if (!handoff.ok) return;
  assert.equal(handoff.snapshot.originalAmountRials, 79_000_000);
});

test("NO COUPON: SMART and SPECIALIZED use catalog prices at gateway", () => {
  const smart = planCheckout({ packageCode: "SMART" });
  assert.equal(smart.ok, true);
  if (!smart.ok) return;
  assert.equal(smart.snapshot.originalAmountRials, 43_000_000);
  assert.equal(smart.gatewayAmountRials, 43_000_000);

  const specialized = planCheckout({ packageCode: "SPECIALIZED" });
  assert.equal(specialized.ok, true);
  if (!specialized.ok) return;
  assert.equal(specialized.snapshot.originalAmountRials, 57_000_000);
  assert.equal(specialized.snapshot.discountAmountRials, 0);
  assert.equal(specialized.snapshot.finalAmountRials, 57_000_000);
  assert.equal(specialized.gatewayAmountRials, 57_000_000);
});

test("NO COUPON: PREMIUM → full amount reaches gateway", () => {
  const result = planCheckout({ packageCode: "PREMIUM" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.createGateway, true);
  assert.equal(result.snapshot.originalAmountRials, 79_000_000);
  assert.equal(result.snapshot.discountAmountRials, 0);
  assert.equal(result.snapshot.finalAmountRials, 79_000_000);
  assert.equal(result.gatewayAmountRials, 79_000_000);
  const gate = assertGuidanceGatewayHandoff({
    intentFinalAmountRials: result.snapshot.finalAmountRials,
    gatewayAmountRials: result.gatewayAmountRials ?? -1,
  });
  assert.equal(gate.ok, true);
});

test("VALID FIXED: 500,000 toman → correct gateway amount", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "FIXED_AMOUNT", value: tomanToRial(500_000) }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.createGateway, true);
  assert.equal(result.snapshot.finalAmountRials, 74_000_000);
  assert.equal(result.gatewayAmountRials, 74_000_000);
});

test("ambiguous legacy FIXED 500,000 does not create a gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "FIXED_AMOUNT", value: 500_000 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
  if (result.ok) return;
  assert.match(result.error, /مبهم/);
});

test("PERCENT 97 is unaffected by FIXED storage gate", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 97 }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.gatewayAmountRials, 2_370_000);
});

test("VALID PERCENT 10%", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 10 }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.gatewayAmountRials, 71_100_000);
});

test("97% PREMIUM regression — 237,000 toman reaches gateway boundary", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 97 }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.snapshot.packageCode, "PREMIUM");
  assert.equal(result.snapshot.originalAmountRials, 79_000_000);
  assert.equal(result.snapshot.discountAmountRials, 76_630_000);
  assert.equal(result.snapshot.finalAmountRials, 2_370_000);
  assert.equal(result.gatewayAmountRials, 2_370_000);
  assert.equal(result.createGateway, true);
  const gate = assertGuidanceGatewayHandoff({
    intentFinalAmountRials: 2_370_000,
    gatewayAmountRials: result.gatewayAmountRials ?? -1,
  });
  assert.equal(gate.ok, true);
});

test("INVALID percent does not create gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 0 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
});

test("EXPIRED does not create gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({
      type: "PERCENTAGE",
      value: 97,
      endsAt: new Date("2020-01-01T00:00:00.000Z"),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
  if (result.ok) return;
  assert.match(result.error, /پایان رسیده/);
});

test("WRONG PACKAGE does not create gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 97, packageScope: "SMART" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
});

test("EXHAUSTED does not create gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 97, maxUses: 1, usageCount: 1 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
  if (result.ok) return;
  assert.match(result.error, /ظرفیت/);
});

test("DISABLED does not create gateway request", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 97, isActive: false }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
});

test("100% uses zero-pay path and never sets a gateway amount", () => {
  const result = planCheckout({
    packageCode: "PREMIUM",
    row: stored({ type: "PERCENTAGE", value: 100 }),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.createGateway, false);
  assert.equal(result.snapshot.path, "zero-pay");
  assert.equal(result.snapshot.finalAmountRials, 0);
  assert.equal(result.gatewayAmountRials, null);
});

test("gateway rejects mismatched amounts", () => {
  const mismatch = assertGuidanceGatewayHandoff({
    intentFinalAmountRials: 2_370_000,
    gatewayAmountRials: 79_000_000,
  });
  assert.equal(mismatch.ok, false);
});

test("sub-minimum positive amount is invalid, not zero-pay", () => {
  const path = decideGuidanceCheckoutPath(500);
  assert.equal(path.ok, false);
});

test("idempotency key includes financial snapshot", () => {
  const key = buildGuidanceCheckoutIdempotencyKey({
    planId: "plan-1",
    packageCode: "PREMIUM",
    originalAmountRials: 79_000_000,
    discountAmountRials: 76_630_000,
    finalAmountRials: 2_370_000,
    discountCode: "SALE97",
  });
  assert.match(key, /PREMIUM:79000000:76630000:2370000:d:SALE97/);
});

test("unknown V2 package does not create gateway request", () => {
  const result = planCheckout({ packageCode: "ESSENTIAL" });
  assert.equal(result.ok, false);
  assert.equal(result.createGateway, false);
});

test("Step 10 action returns checkoutUrl instead of redirecting to Zibal", () => {
  const source = readFileSync(
    join(process.cwd(), "app/portal/student/services/guidance/journey/steps/actions/step10.ts"),
    "utf8",
  );
  assert.equal(source.includes("redirect(started.checkoutUrl)"), false);
  assert.equal(source.includes("checkoutUrl: started.checkoutUrl"), true);
  assert.equal(source.includes("discountCode: discountCode || null"), true);
});

test("پرداخت امن client navigates to returned checkoutUrl", () => {
  const source = readFileSync(
    join(process.cwd(), "components/guidance/journey-v2/PackagePaymentV2Step.tsx"),
    "utf8",
  );
  assert.equal(source.includes("window.location.assign(state.checkoutUrl)"), true);
  assert.equal(source.includes('name="discountCode"'), true);
  assert.equal(source.includes('name="packageCode"'), true);
  assert.equal(source.includes("در حال اتصال به درگاه امن"), true);
});

test("Zibal request amount is integer rials from the provider input", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/payment/providers/zibal.ts"),
    "utf8",
  );
  assert.equal(source.includes("amount: Math.trunc(input.amountRials)"), true);
  assert.match(source, /Amount unit: Rials/);
});

test("callback finalizes stored intent amount and does not re-quote coupons", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/guidance/journey/payment.ts"),
    "utf8",
  );
  const verifyIndex = source.indexOf("export async function verifyGuidancePaymentCallback");
  assert.ok(verifyIndex > 0);
  const verifyFn = source.slice(verifyIndex);
  assert.equal(verifyFn.includes("quoteGuidancePackageDiscount"), false);
  assert.equal(verifyFn.includes("calculateGuidanceDiscount"), false);
  assert.equal(verifyFn.includes("expectedFinalAmountRials: intent.finalAmountRials"), true);
  assert.equal(verifyFn.includes("consumeGuidanceDiscountUse"), false);
});

test("active gateway session is reused instead of opening a second Zibal request", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/guidance/journey/payment.ts"),
    "utf8",
  );
  assert.equal(source.includes("gateway_session_reused"), true);
});

console.log(`guidance-checkout-handoff-unit-tests: ${passed} ok`);
