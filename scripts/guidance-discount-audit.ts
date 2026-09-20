/**
 * Read-only audit of guidance discount codes (DB + legacy ENV).
 * Run: npx tsx --env-file=.env scripts/guidance-discount-audit.ts > /tmp/guidance-discount-audit.json
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { loadLegacyGuidanceDiscountCatalog } from "../lib/guidance/discounts/legacy";
import { rialToToman } from "../lib/guidance/discounts/engine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dbRows = await prisma.guidanceDiscountCode.findMany({
    where: { archivedAt: null },
    orderBy: { code: "asc" },
  });
  const legacy = loadLegacyGuidanceDiscountCatalog();
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        db: dbRows.map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          code: row.code,
          type: row.type,
          value: row.value,
          valueTomanHint:
            row.type === "FIXED_AMOUNT" ? rialToToman(row.value) : null,
          packageScope: row.packageScope,
          isActive: row.isActive,
          maxUses: row.maxUses,
          usageCount: row.usageCount,
          startsAt: row.startsAt?.toISOString() ?? null,
          endsAt: row.endsAt?.toISOString() ?? null,
        })),
        legacyEnv: legacy.map((row) => ({
          code: row.code,
          discountRials: row.discountRials,
          discountToman: rialToToman(row.discountRials),
          source: row.source,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
