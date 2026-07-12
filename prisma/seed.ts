import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

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

  await prisma.branch.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "nasim-shahr",
      },
    },
    update: {
      name: "مرکز آموزشی نسیم‌شهر",
      isActive: true,
      deletedAt: null,
    },
    create: {
      organizationId: organization.id,
      name: "مرکز آموزشی نسیم‌شهر",
      slug: "nasim-shahr",
      isActive: true,
    },
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
