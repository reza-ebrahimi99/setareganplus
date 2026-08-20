import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { CommerceBookletBranchKey } from "../generated/prisma/enums";
import {
  COMMERCE_BOOKLET_BRANCH_CATALOG,
  COMMERCE_BOOKLET_BRANCH_KEYS,
} from "../lib/commerce/booklet-branches";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Run migrations after PostgreSQL is configured.",
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "setareganplus" },
    update: {
      name: "ستارگان پلاس",
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "ستارگان پلاس",
      slug: "setareganplus",
      isActive: true,
    },
  });

  for (const key of COMMERCE_BOOKLET_BRANCH_KEYS) {
    const def = COMMERCE_BOOKLET_BRANCH_CATALOG[key];
    await prisma.branch.upsert({
      where: {
        organizationId_slug: {
          organizationId: organization.id,
          slug: def.slug,
        },
      },
      update: {
        name: def.name,
        address: def.address,
        accentColor: def.accentColor,
        bookletOpsKey: key as CommerceBookletBranchKey,
        isActive: true,
        deletedAt: null,
      },
      create: {
        organizationId: organization.id,
        name: def.name,
        slug: def.slug,
        address: def.address,
        accentColor: def.accentColor,
        bookletOpsKey: key as CommerceBookletBranchKey,
        isActive: true,
      },
    });
  }

  await prisma.branch.updateMany({
    where: {
      organizationId: organization.id,
      deletedAt: null,
      bookletOpsKey: null,
      slug: { notIn: COMMERCE_BOOKLET_BRANCH_KEYS.map((key) => COMMERCE_BOOKLET_BRANCH_CATALOG[key].slug) },
    },
    data: { isActive: false },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
