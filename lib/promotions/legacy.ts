/**
 * Ensure legacy hardcoded catalog coupons exist as Promotion rows.
 */

import { PromotionType, PromotionValueType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Historical catalog codes — seeded into Promotion table; catalogs stay empty. */
export const LEGACY_CATALOG_COUPONS: ReadonlyArray<{
  code: string;
  title: string;
  valueRials: number;
  catalogKey: string;
}> = [
  {
    code: "SETAREGAN10",
    title: "کد تخفیف ستارگان ۱۰",
    valueRials: 250_000,
    catalogKey: "qalamchi-exam",
  },
  {
    code: "WELCOME5",
    title: "کد خوش‌آمدگویی",
    valueRials: 125_000,
    catalogKey: "qalamchi-exam",
  },
];

export async function ensureLegacyCatalogPromotions(
  organizationId: string,
): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;

  for (const item of LEGACY_CATALOG_COUPONS) {
    const found = await prisma.promotion.findFirst({
      where: {
        organizationId,
        code: item.code,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (found) {
      existing += 1;
      continue;
    }

    await prisma.promotion.create({
      data: {
        organizationId,
        title: item.title,
        code: item.code,
        type: PromotionType.COUPON,
        valueType: PromotionValueType.FIXED,
        value: item.valueRials,
        stackable: true,
        priority: 50,
        isActive: true,
        metadata: {
          legacyCatalogKey: item.catalogKey,
          seededFromLegacyCatalog: true,
          allowedCatalogKeys: [item.catalogKey],
        },
      },
    });
    created += 1;
  }

  return { created, existing };
}
