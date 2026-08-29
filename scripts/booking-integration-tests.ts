/**
 * StarOS v0.5.1 — booking integration tests against PostgreSQL.
 *
 * NOT run during `npm run build`.
 *
 * Usage (dev/staging only — never during build):
 *   npm run db:migrate:deploy
 *   npm run test:booking
 *
 * Requires:
 *   - DATABASE_URL in .env (loaded via `tsx --env-file=.env`)
 *   - migrated schema (including booking tables)
 *   - seeded organization `setareganplus`
 *
 * Creates temporary service/advisor/slot rows and deletes them afterwards.
 */

import { randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Ensure .env exists, then run: npm run test:booking",
  );
  process.exit(1);
}
import {
  BookingMeetingType,
  BookingSlotStatus,
  BookingStatus,
} from "../generated/prisma/enums";
import { detectBookingAnomalies, suggestBookingTimes } from "../lib/ai/booking-assistant";
import { getAiProvider, resetAiProviderCache } from "../lib/ai/ai-provider";
import { checkInReservation } from "../lib/booking/check-in";
import { cancelReservation, rescheduleReservation } from "../lib/booking/manage-reservation";
import { createReservation } from "../lib/booking/reserve";
import { generateOpaqueToken, hashOpaqueToken } from "../lib/booking/tokens";
import { prisma } from "../lib/prisma";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function getOrg() {
  const org = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null },
    select: { id: true },
  });
  assert(org, "Organization setareganplus not found — run db:seed first.");
  return org;
}

async function main() {
  const org = await getOrg();
  const suffix = randomBytes(3).toString("hex");
  const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

  let serviceId: string | null = null;
  let advisorId: string | null = null;

  try {
    const service = await prisma.bookingService.create({
      data: {
        organizationId: org.id,
        slug: `itest-${suffix}`,
        title: `Integration Test ${suffix}`,
        durationMinutes: 30,
        settings: {
          allowWaitingList: false,
          autoConfirm: true,
          duplicateKeys: ["normalizedMobile", "service", "bookingDate"],
          allowAdvisorSelection: true,
          allowBranchSelection: false,
          showRemainingCapacity: true,
          onlineMeetingInfo: null,
          addressInfo: null,
        },
      },
    });
    serviceId = service.id;

    const advisor = await prisma.bookingAdvisor.create({
      data: {
        organizationId: org.id,
        displayName: `Advisor ${suffix}`,
      },
    });
    advisorId = advisor.id;

    await prisma.bookingAdvisorService.create({
      data: {
        organizationId: org.id,
        advisorId: advisor.id,
        serviceId: service.id,
      },
    });

    const slot = await prisma.bookingSlot.create({
      data: {
        organizationId: org.id,
        serviceId: service.id,
        advisorId: advisor.id,
        startsAt,
        endsAt,
        capacity: 1,
        bookedCount: 0,
        waitingCount: 0,
        status: BookingSlotStatus.OPEN,
      },
    });

    const altSlot = await prisma.bookingSlot.create({
      data: {
        organizationId: org.id,
        serviceId: service.id,
        advisorId: advisor.id,
        startsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        endsAt: new Date(endsAt.getTime() + 60 * 60 * 1000),
        capacity: 1,
        bookedCount: 0,
        waitingCount: 0,
        status: BookingSlotStatus.OPEN,
      },
    });

    console.log("1) Concurrency: two claims on capacity=1");
    const [a, b] = await Promise.all([
      createReservation({
        organizationId: org.id,
        slotId: slot.id,
        firstName: "A",
        lastName: "One",
        mobile: "09120000001",
        meetingType: BookingMeetingType.IN_PERSON,
      }),
      createReservation({
        organizationId: org.id,
        slotId: slot.id,
        firstName: "B",
        lastName: "Two",
        mobile: "09120000002",
        meetingType: BookingMeetingType.IN_PERSON,
      }),
    ]);

    const wins = [a, b].filter((r) => r.ok);
    const losses = [a, b].filter((r) => !r.ok);
    assert(wins.length === 1, `Expected 1 success, got ${wins.length}`);
    assert(losses.length === 1, `Expected 1 failure, got ${losses.length}`);
    assert(
      !losses[0]!.ok && losses[0]!.error.includes("تکمیل"),
      `Expected capacity-full Persian message, got ${JSON.stringify(losses[0])}`,
    );

    const slotAfter = await prisma.bookingSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    assert(slotAfter.bookedCount === 1, `bookedCount expected 1, got ${slotAfter.bookedCount}`);
    const activeCount = await prisma.bookingReservation.count({
      where: {
        organizationId: org.id,
        slotId: slot.id,
        deletedAt: null,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    });
    assert(activeCount === 1, `active reservations expected 1, got ${activeCount}`);
    console.log("   OK");

    const winner = wins[0]!;
    assert(winner.ok, "winner reservation missing");

    console.log("2) Cancel releases capacity once; repeat is safe");
    const cancel1 = await cancelReservation({
      organizationId: org.id,
      reservationId: winner.reservationId,
    });
    assert(cancel1.ok, "first cancel failed");
    const slotCancelled = await prisma.bookingSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    assert(slotCancelled.bookedCount === 0, "bookedCount not released");
    const cancel2 = await cancelReservation({
      organizationId: org.id,
      reservationId: winner.reservationId,
    });
    assert(cancel2.ok, "second cancel should be no-op success");
    const slotCancelled2 = await prisma.bookingSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    assert(slotCancelled2.bookedCount === 0, "repeat cancel mutated capacity");
    console.log("   OK");

    console.log("3) Reschedule: claim new then release old");
    const base = await createReservation({
      organizationId: org.id,
      slotId: slot.id,
      firstName: "C",
      lastName: "Three",
      mobile: "09120000003",
    });
    assert(base.ok, "base reservation failed");
    const baseOk = base;
    assert(baseOk.ok, "base reservation missing");

    const moved = await rescheduleReservation({
      organizationId: org.id,
      reservationId: baseOk.reservationId,
      newSlotId: altSlot.id,
    });
    assert(moved.ok, `reschedule failed: ${JSON.stringify(moved)}`);
    const movedOk = moved;
    assert(movedOk.ok, "moved reservation missing");

    const oldSlot = await prisma.bookingSlot.findUniqueOrThrow({ where: { id: slot.id } });
    const newSlot = await prisma.bookingSlot.findUniqueOrThrow({ where: { id: altSlot.id } });
    assert(oldSlot.bookedCount === 0, "old slot not released");
    assert(newSlot.bookedCount === 1, "new slot not claimed");

    const original = await prisma.bookingReservation.findUniqueOrThrow({
      where: { id: baseOk.reservationId },
    });
    assert(
      original.status === BookingStatus.RESCHEDULED,
      `original status expected RESCHEDULED, got ${original.status}`,
    );

    const replacement = await prisma.bookingReservation.findUniqueOrThrow({
      where: { id: movedOk.newReservationId },
    });
    assert(
      replacement.status === BookingStatus.CONFIRMED,
      "replacement should be CONFIRMED",
    );
    assert(replacement.slotId === altSlot.id, "replacement on wrong slot");
    assert(
      replacement.rescheduledFromId === baseOk.reservationId,
      "replacement must point to original via rescheduledFromId",
    );
    assert(
      replacement.trackingCode === baseOk.trackingCode,
      "guest tracking code should be retained on replacement",
    );

    const activeReplacements = await prisma.bookingReservation.count({
      where: {
        organizationId: org.id,
        slot: { serviceId: service.id },
        deletedAt: null,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    });
    assert(
      activeReplacements === 1,
      `expected exactly one active reservation, got ${activeReplacements}`,
    );

    const repeat = await rescheduleReservation({
      organizationId: org.id,
      reservationId: baseOk.reservationId,
      newSlotId: slot.id,
    });
    assert(!repeat.ok, "reschedule of RESCHEDULED original must be rejected");
    const countsAfterRepeat = await prisma.bookingSlot.findMany({
      where: { id: { in: [slot.id, altSlot.id] } },
      select: { id: true, bookedCount: true },
    });
    const oldAfterRepeat = countsAfterRepeat.find((s) => s.id === slot.id);
    const newAfterRepeat = countsAfterRepeat.find((s) => s.id === altSlot.id);
    assert(oldAfterRepeat?.bookedCount === 0, "repeat mutated old capacity");
    assert(newAfterRepeat?.bookedCount === 1, "repeat mutated new capacity");
    console.log("   OK");

    console.log("4) Failed reschedule leaves old intact");
    await prisma.bookingSlot.update({
      where: { id: slot.id },
      data: { bookedCount: 1, capacity: 1, status: BookingSlotStatus.FULL },
    });
    const beforeFail = await prisma.bookingReservation.findUniqueOrThrow({
      where: { id: movedOk.newReservationId },
    });
    const failMove = await rescheduleReservation({
      organizationId: org.id,
      reservationId: movedOk.newReservationId,
      newSlotId: slot.id,
    });
    assert(!failMove.ok, "expected failed reschedule");
    const still = await prisma.bookingReservation.findUniqueOrThrow({
      where: { id: movedOk.newReservationId },
    });
    assert(still.status === BookingStatus.CONFIRMED, "old reservation should stay confirmed");
    assert(still.slotId === altSlot.id, "slot should be unchanged");
    assert(
      still.trackingCode === beforeFail.trackingCode,
      "failed reschedule must not alter tracking code",
    );
    const altAfterFail = await prisma.bookingSlot.findUniqueOrThrow({
      where: { id: altSlot.id },
    });
    assert(altAfterFail.bookedCount === 1, "failed reschedule released active slot");
    console.log("   OK");

    console.log("5) QR check-in + replay");
    const checkInToken = generateOpaqueToken();
    const reservation = await prisma.bookingReservation.findUniqueOrThrow({
      where: { id: movedOk.newReservationId },
    });
    await prisma.bookingReservation.update({
      where: { id: reservation.id },
      data: { checkInTokenHash: hashOpaqueToken(checkInToken) },
    });

    const adminUser = await prisma.user.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    assert(adminUser, "Need at least one user for check-in actor");

    const first = await checkInReservation({
      organizationId: org.id,
      actorUserId: adminUser.id,
      token: checkInToken,
    });
    assert(first.ok, `check-in failed: ${JSON.stringify(first)}`);
    const replay = await checkInReservation({
      organizationId: org.id,
      actorUserId: adminUser.id,
      token: checkInToken,
    });
    assert(!replay.ok && replay.error.includes("قبلاً"), "replay should fail");

    const otherOrg = await prisma.organization.findFirst({
      where: { id: { not: org.id }, deletedAt: null },
      select: { id: true },
    });
    if (otherOrg) {
      const cross = await checkInReservation({
        organizationId: otherOrg.id,
        actorUserId: adminUser.id,
        token: checkInToken,
      });
      assert(!cross.ok, "cross-org check-in should fail");
    }

    await prisma.bookingReservation.update({
      where: { id: reservation.id },
      data: { status: BookingStatus.CANCELLED, checkedInAt: null },
    });
    await prisma.bookingCheckIn.deleteMany({
      where: { reservationId: reservation.id },
    });
    const cancelledCheck = await checkInReservation({
      organizationId: org.id,
      actorUserId: adminUser.id,
      token: checkInToken,
    });
    assert(!cancelledCheck.ok, "cancelled reservation must not check in");
    console.log("   OK");

    console.log("6) AI null fallback + no PII in rule anomalies");
    resetAiProviderCache();
    process.env.STAROS_AI_ENABLED = "false";
    process.env.STAROS_AI_PROVIDER = "none";
    const provider = getAiProvider();
    assert(!provider.isEnabled(), "AI should be disabled");
    const suggestion = await suggestBookingTimes({
      organizationId: org.id,
      serviceId: service.id,
    });
    assert(suggestion.source === "rules", "expected rules source");
    const hints = detectBookingAnomalies({
      submissionDurationMs: 500,
      recentReservationsSameMobile: 4,
    });
    assert(hints.length >= 1, "expected anomaly hints");
    assert(
      !JSON.stringify(hints).includes("0912"),
      "anomaly hints must not echo mobile",
    );
    console.log("   OK");

    console.log("\nAll booking integration checks passed.");
  } finally {
    if (serviceId) {
      await prisma.bookingCheckIn.deleteMany({
        where: {
          organizationId: org.id,
          reservation: { slot: { serviceId } },
        },
      });
      await prisma.bookingReservation.deleteMany({
        where: { organizationId: org.id, slot: { serviceId } },
      });
      await prisma.bookingSlot.deleteMany({
        where: { organizationId: org.id, serviceId },
      });
      await prisma.bookingAdvisorService.deleteMany({
        where: { organizationId: org.id, serviceId },
      });
      await prisma.bookingService.delete({ where: { id: serviceId } }).catch(() => {});
    }
    if (advisorId) {
      await prisma.bookingAdvisor.delete({ where: { id: advisorId } }).catch(() => {});
    }
  }
}

main()
  .catch((error) => {
    console.error("\nBooking integration tests FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
