// Pure price calculation shared by the public form (live total) and the server (authoritative amount).
import { optionsOf, PRICE_TYPES, type FieldDef, type FormValues } from "./types";
import { isVisible } from "./validate";

export type PayMode = "FREE" | "FIXED" | "OPTIONS";
export type Pricing = { payMode: PayMode | string; basePriceRials: number };
export type PriceLine = { label: string; rials: number };
export type Discount = { code: string; percent?: number | null; amountRials?: number | null };

export const isPaidMode = (p: Pricing) => p.payMode === "FIXED" || p.payMode === "OPTIONS";
/** Zibal's minimum payable amount (rials). */
export const MIN_PAY_RIALS = 10_000;

export function priceLines(p: Pricing, fields: FieldDef[], values: FormValues, baseLabel = "هزینهٔ ثبت‌نام"): PriceLine[] {
  if (!isPaidMode(p)) return [];
  const lines: PriceLine[] = [];
  if (p.basePriceRials > 0) lines.push({ label: baseLabel, rials: p.basePriceRials });
  if (p.payMode !== "OPTIONS") return lines;
  for (const f of fields) {
    if (!PRICE_TYPES.includes(f.type) || !f.prices || !isVisible(f, values)) continue;
    const v = values[f.id];
    const picked = Array.isArray(v) ? v : v ? [v] : [];
    const opts = optionsOf(f);
    for (const o of picked) {
      const r = Math.max(0, Math.trunc(f.prices[o] ?? 0));
      if (r > 0 && opts.includes(o)) lines.push({ label: `${f.label}: ${o}`, rials: r });
    }
  }
  return lines;
}

export function discountRials(subtotal: number, d?: Discount | null): number {
  if (!d || subtotal <= 0) return 0;
  const byPct = d.percent ? Math.floor((subtotal * Math.min(100, Math.max(0, d.percent))) / 100) : 0;
  const byAmt = d.amountRials ? Math.max(0, d.amountRials) : 0;
  // round to whole toman
  return Math.min(subtotal, Math.floor(Math.max(byPct, byAmt) / 10) * 10);
}

export function totals(p: Pricing, fields: FieldDef[], values: FormValues, d?: Discount | null) {
  const lines = priceLines(p, fields, values);
  const subtotal = lines.reduce((a, l) => a + l.rials, 0);
  const off = discountRials(subtotal, d);
  return { lines, subtotal, discount: off, total: subtotal - off };
}

/** "۱۲۰٬۰۰۰ تومان" without importing server-only shop config. */
export function tomanText(rials: number): string {
  const t = Math.round(rials / 10).toLocaleString("en-US").replace(/,/g, "٬");
  return `${t.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])} تومان`;
}
