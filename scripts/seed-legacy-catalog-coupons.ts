/**
 * Idempotent seed script for legacy catalog coupons → Promotion rows.
 * Run: npx tsx --env-file=.env scripts/seed-legacy-catalog-coupons.ts
 */

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("seed-legacy-catalog-coupons SKIPPED: DATABASE_URL missing");
    process.exit(2);
  }

  const { prisma } = await import("../lib/prisma");
  const { ensureLegacyCatalogPromotions, LEGACY_CATALOG_COUPONS } =
    await import("../lib/promotions/legacy");

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
  });

  console.log(
    `Seeding ${LEGACY_CATALOG_COUPONS.length} legacy coupons for ${orgs.length} org(s)…`,
  );

  for (const org of orgs) {
    const result = await ensureLegacyCatalogPromotions(org.id);
    console.log(
      `  ${org.slug}: created=${result.created} existing=${result.existing}`,
    );
  }

  await prisma.$disconnect();
  console.log("seed-legacy-catalog-coupons OK");
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
