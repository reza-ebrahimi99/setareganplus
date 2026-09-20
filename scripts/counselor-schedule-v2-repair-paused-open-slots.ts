/**
 * Idempotent repair: cancel future OPEN unbooked slots on non-ACTIVE plans.
 *
 *   tsx --env-file=.env scripts/counselor-schedule-v2-repair-paused-open-slots.ts --dry-run
 *   tsx --env-file=.env scripts/counselor-schedule-v2-repair-paused-open-slots.ts --execute
 *
 * Before --execute on production, run scripts/counselor-schedule-v2-logical-backup.ts
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

const mode = process.argv.includes("--execute") ? "execute" : "dry-run";

async function main() {
  const now = new Date();
  const candidateSlots = await prisma.bookingSlot.findMany({
    where: {
      startsAt: { gte: now },
      status: BookingSlotStatus.OPEN,
      bookedCount: 0,
      schedulePlanId: { not: null },
      OR: [
        {
          schedulePlan: {
            status: {
              in: [
                CounselorSchedulePlanStatus.PAUSED,
                CounselorSchedulePlanStatus.DRAFT,
              ],
            },
          },
        },
      ],
    },
    select: {
      id: true,
      schedulePlanId: true,
      schedulePlan: { select: { status: true, legacyMeta: true } },
    },
  });

  const toCancel = candidateSlots.filter((slot) => {
    if (!slot.schedulePlan) return false;
    if (slot.schedulePlan.status === CounselorSchedulePlanStatus.ACTIVE) {
      return false;
    }
    if (planLegacyArchivedAt(slot.schedulePlan.legacyMeta)) return true;
    return (
      slot.schedulePlan.status === CounselorSchedulePlanStatus.PAUSED ||
      slot.schedulePlan.status === CounselorSchedulePlanStatus.DRAFT
    );
  });

  const allPlans = await prisma.counselorSchedulePlan.findMany({
    select: { id: true, legacyMeta: true },
  });
  const archivedIds = new Set(
    allPlans
      .filter((p) => planLegacyArchivedAt(p.legacyMeta))
      .map((p) => p.id),
  );
  const archivedOpen = await prisma.bookingSlot.findMany({
    where: {
      startsAt: { gte: now },
      status: BookingSlotStatus.OPEN,
      bookedCount: 0,
      schedulePlanId: { in: [...archivedIds] },
    },
    select: { id: true },
  });

  const allIds = [
    ...new Set([
      ...toCancel.map((s) => s.id),
      ...archivedOpen.map((s) => s.id),
    ]),
  ];

  console.log(
    JSON.stringify(
      {
        mode,
        wouldCancel: allIds.length,
        breakdown: {
          nonActivePlanSlots: toCancel.length,
          archivedPlanSlots: archivedOpen.length,
        },
      },
      null,
      2,
    ),
  );

  if (mode === "dry-run" || allIds.length === 0) {
    return;
  }

  const result = await prisma.bookingSlot.updateMany({
    where: {
      id: { in: allIds },
      status: BookingSlotStatus.OPEN,
      bookedCount: 0,
      startsAt: { gte: now },
    },
    data: { status: BookingSlotStatus.CANCELLED },
  });

  console.log(JSON.stringify({ mode, cancelled: result.count }, null, 2));
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
