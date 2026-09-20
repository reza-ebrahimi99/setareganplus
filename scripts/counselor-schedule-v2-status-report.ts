/**
 * Read-only counts for counselor schedule v2 plans and future OPEN slots.
 * Run: tsx --env-file=.env scripts/counselor-schedule-v2-status-report.ts
 */

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  BookingSlotStatus,
  CounselorSchedulePlanStatus,
} from "../generated/prisma/enums";
import { planLegacyArchivedAt } from "../lib/counselor-os/schedule-v2/plan-title";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const now = new Date();
  const plans = await prisma.counselorSchedulePlan.findMany({
    select: { id: true, status: true, legacyMeta: true },
  });
  const visible = plans.filter((p) => !planLegacyArchivedAt(p.legacyMeta));
  const byStatus = {
    DRAFT: visible.filter((p) => p.status === CounselorSchedulePlanStatus.DRAFT)
      .length,
    ACTIVE: visible.filter(
      (p) => p.status === CounselorSchedulePlanStatus.ACTIVE,
    ).length,
    PAUSED: visible.filter(
      (p) => p.status === CounselorSchedulePlanStatus.PAUSED,
    ).length,
    ARCHIVED: plans.length - visible.length,
  };

  async function futureOpenForPlanStatuses(
    statuses: CounselorSchedulePlanStatus[],
  ) {
    return prisma.bookingSlot.count({
      where: {
        startsAt: { gte: now },
        status: BookingSlotStatus.OPEN,
        bookedCount: 0,
        schedulePlanId: { not: null },
        schedulePlan: { status: { in: statuses } },
      },
    });
  }

  const openActive = await futureOpenForPlanStatuses([
    CounselorSchedulePlanStatus.ACTIVE,
  ]);
  const openPaused = await futureOpenForPlanStatuses([
    CounselorSchedulePlanStatus.PAUSED,
  ]);
  const openDraft = await futureOpenForPlanStatuses([
    CounselorSchedulePlanStatus.DRAFT,
  ]);
  const archivedPlanIds = plans
    .filter((p) => planLegacyArchivedAt(p.legacyMeta))
    .map((p) => p.id);
  const openArchived =
    archivedPlanIds.length === 0
      ? 0
      : await prisma.bookingSlot.count({
          where: {
            startsAt: { gte: now },
            status: BookingSlotStatus.OPEN,
            bookedCount: 0,
            schedulePlanId: { in: archivedPlanIds },
          },
        });

  console.log(
    JSON.stringify(
      {
        plans: byStatus,
        futureOpenUnbookedSlots: {
          ACTIVE: openActive,
          PAUSED: openPaused,
          DRAFT: openDraft,
          archivedMeta: openArchived,
        },
        generatedAt: now.toISOString(),
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
