/**
 * Logical JSON backup of counselor schedule plans + future booking slots (read-only export).
 *
 *   tsx --env-file=.env scripts/counselor-schedule-v2-logical-backup.ts > /tmp/counselor-schedule-backup.json
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { BookingSlotStatus } from "../generated/prisma/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const now = new Date();
  const plans = await prisma.counselorSchedulePlan.findMany({
    include: {
      days: { include: { windows: true }, orderBy: { localDate: "asc" } },
    },
  });
  const slots = await prisma.bookingSlot.findMany({
    where: {
      schedulePlanId: { not: null },
      startsAt: { gte: now },
      status: { in: [BookingSlotStatus.OPEN, BookingSlotStatus.FULL] },
    },
    select: {
      id: true,
      organizationId: true,
      schedulePlanId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      bookedCount: true,
      capacity: true,
    },
  });
  console.log(
    JSON.stringify(
      {
        exportedAt: now.toISOString(),
        planCount: plans.length,
        slotCount: slots.length,
        plans,
        slots,
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
