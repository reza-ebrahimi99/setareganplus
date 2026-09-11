/**
 * Server-side guidance discount resolver.
 * DB-managed codes win. Legacy ENV/static codes remain a fallback.
 */

import { prisma } from "@/lib/prisma";
import { findLegacyGuidanceDiscountAsync } from "@/lib/guidance/discounts/legacy";
import {
  computeDiscountRials,
  computePayableRials,
} from "@/lib/guidance/discounts/money";
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
      discountRials: number;
      finalAmountRials: number;
      packageCode: string;
      discountId: string | null;
    }
  | { ok: false; error: string };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function quoteGuidancePackageDiscount(params: {
  organizationId: string;
  packageCode: string;
  packagePriceRials: number;
  discountCode: string;
  now?: Date;
}): Promise<GuidanceDiscountQuote> {
  const code = normalizeCode(params.discountCode);
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
    const discountRials = computeDiscountRials({
      type,
      value: row.value,
      packagePriceRials: price,
    });
    const payable = computePayableRials({
      packagePriceRials: price,
      discountRials,
    });
    return {
      ok: true,
      source: "db",
      code,
      type,
      discountRials: payable.discountRials,
      finalAmountRials: payable.finalAmountRials,
      packageCode: params.packageCode,
      discountId: row.id,
    };
  }

  const legacy = await findLegacyGuidanceDiscountAsync(code, params.packageCode, price);
  if (!legacy) {
    return { ok: false, error: "کد تخفیف معتبر نیست." };
  }
  const payable = computePayableRials({
    packagePriceRials: price,
    discountRials: legacy.discountRials,
  });
  return {
    ok: true,
    source: "legacy",
    code,
    type: "FIXED_AMOUNT",
    discountRials: payable.discountRials,
    finalAmountRials: payable.finalAmountRials,
    packageCode: params.packageCode,
    discountId: null,
  };
}

export async function consumeGuidanceDiscountUse(params: {
  organizationId: string;
  discountId: string;
}): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
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
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE guidance_discount_codes
    SET
      "usageCount" = GREATEST("usageCount" - 1, 0),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${params.discountId}
      AND "organizationId" = ${params.organizationId}
  `;
}
