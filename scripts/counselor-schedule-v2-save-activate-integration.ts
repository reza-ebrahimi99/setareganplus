/**
 * Integration: save draft → ACTIVE + slot materialization (persistence).
 * Run: tsx --env-file=.env scripts/counselor-schedule-v2-save-activate-integration.ts
 */

import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  CounselorSchedulePlanStatus,
  CounselorScheduleSessionKind,
  BookingSlotStatus,
  SystemRole,
} from "../generated/prisma/enums";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "../lib/counselor-os/constants";
import { jalaliPartsToGregorianDateOnly } from "../lib/datetime/jalali-form";
import {
  saveSchedulePlanDraft,
  saveAndActivateSchedulePlan,
  deleteSchedulePlan,
  pauseSchedulePlan,
} from "../lib/counselor-os/schedule-v2/plan-service";
import { computeSchedulePreview } from "../lib/counselor-os/schedule-v2/preview-compute";
import type { CounselorContext } from "../lib/counselor-os/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const service = await prisma.bookingService.findFirst({
    where: { slug: COUNSELOR_BOOKING_SERVICE_SLUG, deletedAt: null },
  });
  assert.ok(service, "counselor booking service missing");

  const link = await prisma.bookingAdvisorService.findFirst({
    where: { organizationId: service.organizationId, serviceId: service.id },
    include: { advisor: true },
  });
  assert.ok(link?.advisor, "no advisor linked to counselor service");

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: service.organizationId,
      status: "ACTIVE",
      deletedAt: null,
    },
  });
  assert.ok(membership?.userId, "no active membership for org");

  const ctx = {
    organizationId: service.organizationId,
    userId: membership.userId,
    displayName: "integration-test",
    isSupervisor: true,
    canReview: true,
    isPlatformAdmin: false,
    role: SystemRole.ORGANIZATION_OWNER,
    roleLabel: "Admin",
    viewingAsCounselor: false,
  } satisfies CounselorContext;

  const ymd = jalaliPartsToGregorianDateOnly(1405, 6, 30);
  const daysJson = JSON.stringify([
    {
      localDateGregorian: ymd,
      windows: [{ startLocalTime: "13:00", endLocalTime: "17:00" }],
    },
  ]);

  const preview = computeSchedulePreview({
    sessionMinutes: 60,
    days: [
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "13:00", endLocalTime: "17:00" }],
      },
    ],
  });
  assert.equal(preview.ok, true);
  if (preview.ok) {
    assert.equal(preview.totalSlots, 4);
  }

  const idem = `integration-${Date.now()}`;

  const draftOnly = await saveSchedulePlanDraft({
    ctx,
    advisorId: link.advisorId,
    sessionKind: CounselorScheduleSessionKind.SECOND_SESSION,
    sessionMinutes: 60,
    daysJson,
    idempotencyKey: `${idem}-draft`,
  });
  const draftRow = await prisma.counselorSchedulePlan.findUnique({
    where: { id: draftOnly.planId },
  });
  assert.equal(draftRow?.status, CounselorSchedulePlanStatus.DRAFT);

  const activated = await saveAndActivateSchedulePlan({
    ctx,
    advisorId: link.advisorId,
    sessionKind: CounselorScheduleSessionKind.FIRST_SESSION,
    sessionMinutes: 60,
    daysJson,
    idempotencyKey: `${idem}-activate`,
  });

  const active = await prisma.counselorSchedulePlan.findUnique({
    where: { id: activated.planId },
    include: { days: { include: { windows: true } } },
  });
  assert.equal(active?.status, CounselorSchedulePlanStatus.ACTIVE);
  assert.equal(active?.days.length, 1);
  assert.equal(active?.days[0]?.windows.length, 1);

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: service.organizationId,
      schedulePlanId: activated.planId,
      status: BookingSlotStatus.OPEN,
    },
    orderBy: { startsAt: "asc" },
  });
  assert.equal(slots.length, 4, `expected 4 OPEN slots, got ${slots.length}`);

  await deleteSchedulePlan({ ctx, planId: draftOnly.planId });
  await pauseSchedulePlan({ ctx, planId: activated.planId });
  await deleteSchedulePlan({ ctx, planId: activated.planId });

  console.log("✓ save-activate integration: DRAFT → ACTIVE with 4 slots");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
