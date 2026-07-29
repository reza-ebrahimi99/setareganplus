/**
 * Idempotent commerce category seed (application-level companion to SQL migration seed).
 */

import type { PrismaClient } from "@/generated/prisma/client";
import { COMMERCE_CATEGORY_SEED } from "@/lib/commerce/types";
import { planCategorySeedInserts } from "@/lib/commerce/categories/validation";

export type SeedCommerceCategoriesResult = {
  inserted: number;
  skipped: number;
  seedKeys: string[];
};

/**
 * Ensure default categories exist for an organization.
 * Safe to call repeatedly — skips existing seedKeys.
 */
export async function seedCommerceCategoriesForOrganization(
  prisma: Pick<PrismaClient, "commerceCategory">,
  organizationId: string,
): Promise<SeedCommerceCategoriesResult> {
  const existing = await prisma.commerceCategory.findMany({
    where: { organizationId, seedKey: { not: null } },
    select: { seedKey: true },
  });
  const existingSeedKeys = new Set(
    existing.map((row) => row.seedKey).filter((key): key is string => Boolean(key)),
  );

  const planned = planCategorySeedInserts({
    organizationId,
    existingSeedKeys,
    definitions: COMMERCE_CATEGORY_SEED,
  });

  if (planned.length === 0) {
    return {
      inserted: 0,
      skipped: COMMERCE_CATEGORY_SEED.length,
      seedKeys: [...existingSeedKeys],
    };
  }

  const seedKeyToId = new Map<string, string>();
  const known = await prisma.commerceCategory.findMany({
    where: { organizationId, seedKey: { not: null } },
    select: { id: true, seedKey: true },
  });
  for (const row of known) {
    if (row.seedKey) seedKeyToId.set(row.seedKey, row.id);
  }

  let inserted = 0;
  for (const row of planned) {
    const parentId = row.parentSeedKey
      ? (seedKeyToId.get(row.parentSeedKey) ?? null)
      : null;
    const created = await prisma.commerceCategory.create({
      data: {
        organizationId,
        parentId,
        seedKey: row.seedKey,
        title: row.title,
        slug: row.slug,
        sortOrder: row.sortOrder,
        isActive: true,
        isVisible: true,
      },
      select: { id: true, seedKey: true },
    });
    if (created.seedKey) seedKeyToId.set(created.seedKey, created.id);
    inserted += 1;
  }

  return {
    inserted,
    skipped: COMMERCE_CATEGORY_SEED.length - inserted,
    seedKeys: [...seedKeyToId.keys()],
  };
}
