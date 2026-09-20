import assert from "node:assert/strict";
import { quoteGuidanceCheckoutSelection } from "../lib/guidance/commerce/checkout-quote";
import { GUIDANCE_PRICE_RIALS } from "../lib/guidance/commerce/catalog";
import {
  hasValidGuidanceCommercialPurchase,
  packageIncludesArrangement,
} from "../lib/guidance/commerce/access";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("premium standalone price", () => {
  const q = quoteGuidanceCheckoutSelection({
    basePackageCode: "PREMIUM",
    farhangianAddon: false,
  });
  assert.equal(q.ok, true);
  if (q.ok) assert.equal(q.quote.originalAmountRials, GUIDANCE_PRICE_RIALS.PREMIUM);
});

test("farhangian standalone price", () => {
  const q = quoteGuidanceCheckoutSelection({
    basePackageCode: "FARHANGIAN",
    farhangianAddon: false,
  });
  assert.equal(q.ok, true);
  if (q.ok) assert.equal(q.quote.originalAmountRials, GUIDANCE_PRICE_RIALS.FARHANGIAN);
});

test("premium + addon = 10.2M toman in rials", () => {
  const q = quoteGuidanceCheckoutSelection({
    basePackageCode: "PREMIUM",
    farhangianAddon: true,
  });
  assert.equal(q.ok, true);
  if (q.ok) {
    assert.equal(
      q.quote.originalAmountRials,
      GUIDANCE_PRICE_RIALS.PREMIUM + GUIDANCE_PRICE_RIALS.FARHANGIAN_ADDON,
    );
  }
});

test("farhangian standalone rejects addon flag", () => {
  const q = quoteGuidanceCheckoutSelection({
    basePackageCode: "FARHANGIAN",
    farhangianAddon: true,
  });
  assert.equal(q.ok, false);
});

test("START free legacy is not valid commercial purchase", () => {
  assert.equal(
    hasValidGuidanceCommercialPurchase({
      packageCode: "START",
      packageAddons: [],
      packagePaidAtIso: new Date().toISOString(),
    }),
    false,
  );
});

test("legacy SMART paid remains arrangement", () => {
  assert.equal(packageIncludesArrangement("SMART"), true);
});

console.log("\nguidance commerce catalog unit tests passed");
