import assert from "node:assert/strict";
import test from "node:test";
import { canSeeBookletRates, pricingStatus } from "./pricing-access";
import { bookletUnit, chargeFor, orderQuote, sheetsFor, type BookletRates } from "./pricing";

const RATES: BookletRates = {
  sheetToman: 1000,
  spiralToman: 5000,
  colorFirstToman: 2000,
  bwFirstToman: 700,
  shippingToman: 3000,
  vatPercent: 10,
};

test("45 pages print as 23 double-sided sheets", () => {
  assert.equal(sheetsFor(45), 23);
  assert.equal(sheetsFor(1), 1);
  assert.equal(sheetsFor(2), 1);
  assert.equal(sheetsFor(0), 0);
  const unit = bookletUnit({ pageCount: 45, isSpiral: false, firstPageType: "bw", priceRials: 9990 }, { ...RATES, spiralToman: 0, colorFirstToman: 0, bwFirstToman: 0, shippingToman: 0, vatPercent: 0 });
  assert.equal(unit.auto, true);
  assert.equal(unit.sheets, 23);
  assert.equal(unit.unitToman, 23000);
});

test("the formula adds spiral, the first page, and print-shop delivery on every booklet", () => {
  const color = bookletUnit({ pageCount: 45, isSpiral: true, firstPageType: "color", priceRials: 1 }, RATES);
  assert.equal(color.sheetToman, 23000);
  assert.equal(color.spiralToman, 5000);
  assert.equal(color.coverToman, 2000);
  assert.equal(color.shippingToman, 3000);
  assert.equal(color.unitToman, 33000);
  const plain = bookletUnit({ pageCount: 45, isSpiral: false, firstPageType: "bw", priceRials: 1 }, RATES);
  assert.equal(plain.spiralToman, 0);
  assert.equal(plain.coverToman, 700);
  assert.equal(plain.shippingToman, 3000);
  assert.equal(plain.unitToman, 26700);
});

test("a blank rate card or a booklet without pages keeps the stored price", () => {
  const stored = bookletUnit({ pageCount: 45, isSpiral: true, firstPageType: "color", priceRials: 480000 }, { ...RATES, sheetToman: 0, spiralToman: 0, colorFirstToman: 0, bwFirstToman: 0 });
  assert.equal(stored.auto, false);
  assert.equal(stored.unitRials, 480000);
  assert.equal(stored.shippingToman, 0);
  const noPages = bookletUnit({ pageCount: null, isSpiral: true, firstPageType: "color", priceRials: 480000 }, RATES);
  assert.equal(noPages.auto, false);
  assert.equal(noPages.unitRials, 480000);
});

test("checkout charges each booklet with its own delivery cost, then VAT on that total", () => {
  const one = chargeFor({ pageCount: 45, isSpiral: true, firstPageType: "color", priceRials: 1 }, RATES, 1);
  const sale = chargeFor({ pageCount: 45, isSpiral: true, firstPageType: "color", priceRials: 1 }, RATES, 3);
  assert.equal(one.unit.unitToman, 33000);
  assert.equal(sale.quote.unitRials, 330000);
  assert.equal(sale.quote.bookletsRials, one.quote.unitRials * 3);
  assert.equal(sale.quote.shippingRials, 0);
  assert.equal(sale.quote.vatPercent, 10);
  assert.equal(sale.quote.totalRials, 1089000);
  assert.equal(sale.publicCheckout.payableRials, sale.quote.totalRials);
  assert.equal(sale.publicPrice.priceRials, sale.quote.unitRials);
  const noVat = orderQuote(10000, 2, { vatPercent: 0 });
  assert.equal(noVat.vatRials, 0);
  assert.equal(noVat.shippingRials, 0);
  assert.equal(noVat.totalRials, 20000);
});

test("only the owner may see the rate card", () => {
  assert.equal(pricingStatus({ owner: true }), 200);
  assert.equal(pricingStatus({ owner: false }), 403);
  assert.equal(pricingStatus(null), 403);
  assert.equal(canSeeBookletRates({ owner: false }), false);
  assert.equal(canSeeBookletRates(undefined), false);
});

test("a public price response has the final amounts and none of the rates", () => {
  const rates: BookletRates = { sheetToman: 137, spiralToman: 41, colorFirstToman: 23, bwFirstToman: 19, shippingToman: 53, vatPercent: 9.5 };
  const sale = chargeFor({ pageCount: 45, isSpiral: true, firstPageType: "color", priceRials: 500000 }, rates, 1);
  const raw = JSON.stringify({ booklet: sale.publicPrice, checkout: sale.publicCheckout });
  assert.deepEqual(Object.keys(sale.publicCheckout).sort(), ["label", "payableRials"]);
  assert.deepEqual(Object.keys(sale.publicPrice), ["priceRials"]);
  assert.equal(sale.publicCheckout.label, "مبلغ قابل پرداخت");
  assert.equal(sale.publicCheckout.payableRials, sale.quote.totalRials);
  for (const secret of ["sheetToman", "spiralToman", "colorFirst", "bwFirst", "shippingToman", "vatPercent", "vatRials", "137", "41", "23", "19", "53", "9.5", "سیمی", "حمل", "ارزش افزوده"]) {
    assert.equal(raw.includes(secret), false, secret);
  }
});
