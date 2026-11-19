/** Pure booklet pricing. No database and no secrets: the rates are arguments, never constants. */

export type BookletRates = {
  sheetToman: number;
  spiralToman: number;
  colorFirstToman: number;
  bwFirstToman: number;
  shippingToman: number;
  vatPercent: number;
};

/** Used when the rate card cannot be read. VAT stays 0 so checkout totals do not change. */
export const EMPTY_RATES: BookletRates = {
  sheetToman: 0,
  spiralToman: 0,
  colorFirstToman: 0,
  bwFirstToman: 0,
  shippingToman: 0,
  vatPercent: 0,
};

export type BookletFacts = {
  pageCount: number | null;
  isSpiral: boolean;
  firstPageType: string;
  priceRials: number;
};

export type UnitQuote = {
  /** True when the formula replaced the stored price. */
  auto: boolean;
  sheets: number | null;
  sheetToman: number;
  spiralToman: number;
  coverToman: number;
  unitToman: number;
  unitRials: number;
};

export type OrderQuote = {
  qty: number;
  unitRials: number;
  bookletsRials: number;
  shippingRials: number;
  vatPercent: number;
  vatRials: number;
  totalRials: number;
};

/** What a student or a non-owner may see. One booklet price, or one payable total. */
export type PublicBookletPrice = { priceRials: number };
export type PublicCheckout = { label: "مبلغ قابل پرداخت"; payableRials: number };

export function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value * 100) / 100);
}

export function clampToman(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1_000_000_000, Math.round(value));
}

export function clampRates(input: BookletRates): BookletRates {
  return {
    sheetToman: clampToman(input.sheetToman),
    spiralToman: clampToman(input.spiralToman),
    colorFirstToman: clampToman(input.colorFirstToman),
    bwFirstToman: clampToman(input.bwFirstToman),
    shippingToman: clampToman(input.shippingToman),
    vatPercent: clampPercent(input.vatPercent),
  };
}

/** The four print rates, not shipping or VAT. Automatic booklet price stays off until one of these is set. */
export function printRatesOn(rates: BookletRates): boolean {
  return rates.sheetToman > 0 || rates.spiralToman > 0 || rates.colorFirstToman > 0 || rates.bwFirstToman > 0;
}

/** Double-sided printing: 45 pages → 23 sheets. */
export function sheetsFor(pages: number): number {
  if (!Number.isFinite(pages) || pages < 1) return 0;
  return Math.ceil(pages / 2);
}

export function bookletUnit(product: BookletFacts, rates: BookletRates): UnitQuote {
  const safe = clampRates(rates);
  const fallback = Math.max(0, Math.round(product.priceRials / 10));
  const pages = product.pageCount ?? 0;
  if (!printRatesOn(safe) || pages < 1) {
    return { auto: false, sheets: null, sheetToman: 0, spiralToman: 0, coverToman: 0, unitToman: fallback, unitRials: fallback * 10 };
  }
  const sheets = sheetsFor(pages);
  const sheetToman = sheets * safe.sheetToman;
  const spiralToman = product.isSpiral ? safe.spiralToman : 0;
  const coverToman = product.firstPageType === "color" ? safe.colorFirstToman : safe.bwFirstToman;
  const unitToman = sheetToman + spiralToman + coverToman;
  if (unitToman <= 0) {
    return { auto: false, sheets, sheetToman, spiralToman, coverToman, unitToman: fallback, unitRials: fallback * 10 };
  }
  return { auto: true, sheets, sheetToman, spiralToman, coverToman, unitToman, unitRials: unitToman * 10 };
}

/** Shipping is added once. VAT is a percent of booklets plus shipping, and the payable total is whole Toman. */
export function orderQuote(unitRials: number, qty: number, rates: Pick<BookletRates, "shippingToman" | "vatPercent">): OrderQuote {
  const q = Math.max(1, Math.min(10, Math.floor(qty) || 1));
  const unit = Math.max(0, Math.round(unitRials));
  const bookletsRials = unit * q;
  const shippingRials = clampToman(rates.shippingToman) * 10;
  const subtotalToman = (bookletsRials + shippingRials) / 10;
  const percent = clampPercent(rates.vatPercent);
  const totalToman = percent > 0 ? Math.round(subtotalToman * (1 + percent / 100)) : subtotalToman;
  const vatToman = totalToman - subtotalToman;
  return {
    qty: q,
    unitRials: unit,
    bookletsRials,
    shippingRials,
    vatPercent: percent,
    vatRials: vatToman * 10,
    totalRials: totalToman * 10,
  };
}

/** The charge createOrder stores. Display and payment both use this. */
export function chargeFor(product: BookletFacts, rates: BookletRates, qty = 1) {
  const unit = bookletUnit(product, rates);
  const quote = orderQuote(unit.unitRials, qty, rates);
  return {
    unit,
    quote,
    publicPrice: { priceRials: unit.unitRials } satisfies PublicBookletPrice,
    publicCheckout: { label: "مبلغ قابل پرداخت", payableRials: quote.totalRials } satisfies PublicCheckout,
  };
}

