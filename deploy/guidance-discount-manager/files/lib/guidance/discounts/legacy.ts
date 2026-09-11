/**
 * Legacy static/ENV guidance discount codes.
 * Do not remove: issued codes must keep working until migrated to DB.
 *
 * Supported env names (first non-empty wins):
 *   GUIDANCE_PACKAGE_DISCOUNT_CODES
 *   GUIDANCE_DISCOUNT_CODES
 *   GUIDANCE_V2_DISCOUNT_CODES
 *
 * Formats:
 *   CODE:500000,CODE2:250000          → toman (admin-facing)
 *   CODE=5000000                      → rials if value looks like rials (>= 10_000 and % 10 === 0)
 *   JSON array of { code, amountToman } or { code, amountRials }
 */

import { tomanToRials } from "@/lib/guidance/discounts/money";

const ENV_KEYS = [
  "GUIDANCE_PACKAGE_DISCOUNT_CODES",
  "GUIDANCE_DISCOUNT_CODES",
  "GUIDANCE_V2_DISCOUNT_CODES",
] as const;

export type LegacyDiscountEntry = {
  code: string;
  discountRials: number;
  source: "env";
};

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function parseJsonCatalog(raw: string): LegacyDiscountEntry[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const rows: LegacyDiscountEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const code = typeof rec.code === "string" ? normalizeCode(rec.code) : "";
      if (!code) continue;
      if (typeof rec.amountRials === "number" && Number.isInteger(rec.amountRials)) {
        rows.push({ code, discountRials: Math.max(0, rec.amountRials), source: "env" });
        continue;
      }
      if (typeof rec.amountToman === "number" && Number.isInteger(rec.amountToman)) {
        rows.push({
          code,
          discountRials: tomanToRials(Math.max(0, rec.amountToman)),
          source: "env",
        });
      }
    }
    return rows;
  } catch {
    return null;
  }
}

function parsePairCatalog(raw: string): LegacyDiscountEntry[] {
  const rows: LegacyDiscountEntry[] = [];
  const parts = raw.split(/[,\n;]+/);
  for (const part of parts) {
    const match = /^\s*([A-Za-z0-9_-]{3,40})\s*[:=]\s*(\d+)\s*$/.exec(part);
    if (!match) continue;
    const code = normalizeCode(match[1] ?? "");
    const amount = Number(match[2]);
    if (!code || !Number.isInteger(amount) || amount <= 0) continue;
    const discountRials =
      amount >= 10_000 && amount % 10 === 0 ? amount : tomanToRials(amount);
    rows.push({ code, discountRials, source: "env" });
  }
  return rows;
}

export function loadLegacyGuidanceDiscountCatalog(): LegacyDiscountEntry[] {
  let raw = "";
  for (const key of ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      raw = value;
      break;
    }
  }
  if (!raw) return [];
  return parseJsonCatalog(raw) ?? parsePairCatalog(raw);
}

export function findLegacyGuidanceDiscount(
  code: string,
): LegacyDiscountEntry | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return (
    loadLegacyGuidanceDiscountCatalog().find((row) => row.code === normalized) ??
    null
  );
}

/**
 * Production Step 10 may keep a static catalog inside its preview action.
 * Apply overlay registers that lookup so checkout uses the same fallback.
 */
export type LegacyDiscountLookup = (
  code: string,
  packageCode: string,
  packagePriceRials: number,
) =>
  | { discountRials: number }
  | null
  | Promise<{ discountRials: number } | null>;

let extraLookup: LegacyDiscountLookup | null = null;

export function registerLegacyGuidanceDiscountLookup(
  lookup: LegacyDiscountLookup,
): void {
  extraLookup = lookup;
}

export async function findLegacyGuidanceDiscountAsync(
  code: string,
  packageCode: string,
  packagePriceRials: number,
): Promise<LegacyDiscountEntry | null> {
  const immediate = findLegacyGuidanceDiscount(code);
  if (immediate) return immediate;
  if (!extraLookup) return null;
  const extra = await extraLookup(normalizeCode(code), packageCode, packagePriceRials);
  if (!extra || !Number.isInteger(extra.discountRials) || extra.discountRials <= 0) {
    return null;
  }
  return {
    code: normalizeCode(code),
    discountRials: extra.discountRials,
    source: "env",
  };
}
