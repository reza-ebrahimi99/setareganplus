/**
 * Read-only integrity report for counselor appointments vs reservations.
 * Usage: tsx --env-file=.env scripts/counselor-appointment-integrity-report.ts [--dry-run]
 */
import { prisma } from "../lib/prisma";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const total = await prisma.counselorAppointment.count();
  const byStatus = await prisma.counselorAppointment.groupBy({
    by: ["status"],
    _count: true,
  });
  const bookedPending = await prisma.counselorAppointment.count({
    where: {
      status: "BOOKED",
      bookingReservation: { status: "PENDING" },
    },
  });
  const bookedConfirmedRes = await prisma.counselorAppointment.count({
    where: {
      status: "BOOKED",
      bookingReservation: { status: "CONFIRMED" },
    },
  });
  const confirmedAppt = await prisma.counselorAppointment.count({
    where: { status: "CONFIRMED" },
  });
  const orphanReservations = await prisma.bookingReservation.count({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      counselorAppointment: null,
      slot: {
        service: { slug: "guidance-counseling-session" },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        total,
        byStatus,
        bookedPending,
        bookedConfirmedRes,
        confirmedAppt,
        orphanReservations,
        note:
          "Legacy rows with BOOKED + CONFIRMED reservation are not auto-repaired; review manually.",
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
  .finally(() => prisma.$disconnect());
