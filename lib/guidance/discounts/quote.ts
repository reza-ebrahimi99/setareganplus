/**
 * Server-side guidance discount resolver.
 * DB-managed codes win. Legacy ENV/static codes remain a fallback.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findLegacyGuidanceDiscountAsync } from "@/lib/guidance/discounts/legacy";
import {
  assertCanonicalStoredFixedAmountRials,
  assertFinancialInvariant,
  calculateGuidanceDiscount,
  normalizeGuidanceDiscountCode,
} from "@/lib/guidance/discounts/engine";
import {
  parsePackageScope,
  scopeIncludesPackage,
} from "@/lib/guidance/discounts/packages";

export type GuidanceDiscountQuote =
  | {
      ok: true;
      source: "db" | "legacy";
      code: string;
      type: "FIXED_AMOUNT" | "PERCENTAGE";
      originalAmountRials: number;
      discountRials: number;
      finalAmountRials: number;
      packageCode: string;
      discountId: string | null;
    }
  | { ok: false; error: string };

export type StoredGuidanceDiscountRow = {
  id: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usageCount: number;
  type: string;
  value: number;
  packageScope: string;
};

export function evaluateStoredGuidanceDiscount(params: {
  row: StoredGuidanceDiscountRow;
  code: string;
  packageCode: string;
  packagePriceRials: number;
  now?: Date;
}): GuidanceDiscountQuote {
  const now = params.now ?? new Date();
  const price = Math.max(0, Math.floor(params.packagePriceRials));
  const row = params.row;
  if (!row.isActive) {
    return { ok: false, error: "این کد تخفیف غیرفعال است." };
  }
  if (row.startsAt && now < row.startsAt) {
    return { ok: false, error: "زمان استفاده از این کد هنوز نرسیده است." };
  }
  if (row.endsAt && now > row.endsAt) {
    return { ok: false, error: "اعتبار این کد تخفیف به پایان رسیده است." };
  }
  if (row.maxUses != null && row.usageCount >= row.maxUses) {
    return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است." };
  }
  const scope = parsePackageScope(row.packageScope);
  if (!scopeIncludesPackage(scope, params.packageCode)) {
    return { ok: false, error: "این کد برای بسته انتخاب‌شده معتبر نیست." };
  }
  const type = row.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT";
  if (type === "FIXED_AMOUNT") {
    const stored = assertCanonicalStoredFixedAmountRials(row.value);
    if (!stored.ok) return stored;
  }
  const calc = calculateGuidanceDiscount({
    originalAmountRials: price,
    type,
    value: row.value,
  });
  if (!calc.ok) return { ok: false, error: calc.error };
  return {
    ok: true,
    source: "db",
    code: params.code,
    type,
    originalAmountRials: calc.result.originalAmountRials,
    discountRials: calc.result.discountAmountRials,
    finalAmountRials: calc.result.finalAmountRials,
    packageCode: params.packageCode,
    discountId: row.id,
  };
}

export async function quoteGuidancePackageDiscount(params: {
  organizationId: string;
  packageCode: string;
  packagePriceRials: number;
  discountCode: string;
  now?: Date;
}): Promise<GuidanceDiscountQuote> {
  const code = normalizeGuidanceDiscountCode(params.discountCode);
  if (!code) {
    return { ok: false, error: "کد تخفیف را وارد کنید." };
  }

  const price = Math.max(0, Math.floor(params.packagePriceRials));
  const now = params.now ?? new Date();

  const row = await prisma.guidanceDiscountCode.findFirst({
    where: {
      organizationId: params.organizationId,
      code,
      archivedAt: null,
    },
  });

  if (row) {
    return evaluateStoredGuidanceDiscount({
      row,
      code,
      packageCode: params.packageCode,
      packagePriceRials: price,
      now,
    });
  }

  const legacy = await findLegacyGuidanceDiscountAsync(code, params.packageCode, price);
  if (!legacy) {
    return { ok: false, error: "کد تخفیف معتبر نیست." };
  }
  const calc = calculateGuidanceDiscount({
    originalAmountRials: price,
    type: "FIXED_AMOUNT",
    value: Math.max(1, legacy.discountRials),
  });
  if (!calc.ok) return { ok: false, error: calc.error };
  const invariant = assertFinancialInvariant({
    originalAmountRials: calc.result.originalAmountRials,
    discountAmountRials: calc.result.discountAmountRials,
    finalAmountRials: calc.result.finalAmountRials,
  });
  if (!invariant.ok) return { ok: false, error: invariant.error };
  return {
    ok: true,
    source: "legacy",
    code,
    type: "FIXED_AMOUNT",
    originalAmountRials: calc.result.originalAmountRials,
    discountRials: calc.result.discountAmountRials,
    finalAmountRials: calc.result.finalAmountRials,
    packageCode: params.packageCode,
    discountId: null,
  };
}

type DiscountDb = Prisma.TransactionClient | typeof prisma;

export async function consumeGuidanceDiscountUse(params: {
  organizationId: string;
  discountId: string;
  tx?: DiscountDb;
}): Promise<boolean> {
  const db = params.tx ?? prisma;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE guidance_discount_codes
    SET
      "usageCount" = "usageCount" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${params.discountId}
      AND "organizationId" = ${params.organizationId}
      AND "isActive" = true
      AND "archivedAt" IS NULL
      AND ("maxUses" IS NULL OR "usageCount" < "maxUses")
    RETURNING id
  `;
  return rows.length > 0;
}

export async function releaseGuidanceDiscountUse(params: {
  organizationId: string;
  discountId: string;
  tx?: DiscountDb;
}): Promise<void> {
  const db = params.tx ?? prisma;
  await db.$executeRaw`
    UPDATE guidance_discount_codes
    SET
      "usageCount" = GREATEST("usageCount" - 1, 0),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${params.discountId}
      AND "organizationId" = ${params.organizationId}
  `;
}
