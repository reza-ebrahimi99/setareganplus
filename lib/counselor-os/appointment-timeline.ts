/**
 * Daily counselor timeline — appointments, open slots, gaps between sessions.
 */

import { BookingStatus, CounselorAppointmentStatus } from "@/generated/prisma/enums";
import { ensureCounselorBookingService } from "@/lib/counselor-os/booking";
import { labelCounselorAppointmentStatus } from "@/lib/counselor-os/appointment-lifecycle";
import { labelAppointmentPurpose } from "@/lib/guidance/journey-v2/labels";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import {
  formatTehranTime24,
  getPersianWeekdayIndex,
  tehranDayBoundsUtc,
} from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

export type TimelineBlockKind =
  | "pending"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled"
  | "open_slot"
  | "gap";

export type CounselorTimelineBlock = {
  id: string;
  kind: TimelineBlockKind;
  startMs: number;
  endMs: number;
  startLabel: string;
  endLabel: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  appointmentId: string | null;
  slotId: string | null;
  studentId: string | null;
};

function mapAppointmentKind(status: string, reservationStatus: string): TimelineBlockKind {
  if (status === CounselorAppointmentStatus.BOOKED) return "pending";
  if (status === CounselorAppointmentStatus.CONFIRMED) return "confirmed";
  if (status === CounselorAppointmentStatus.COMPLETED) return "completed";
  if (status === CounselorAppointmentStatus.NO_SHOW) return "no_show";
  if (
    status === CounselorAppointmentStatus.CANCELLED_BY_STUDENT ||
    status === CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR
  ) {
    return "cancelled";
  }
  if (reservationStatus === BookingStatus.PENDING) return "pending";
  return "confirmed";
}

export async function buildCounselorDayTimeline(params: {
  organizationId: string;
  advisorId: string;
  counselorUserId: string;
  jy: number;
  jm: number;
  jd: number;
}): Promise<{ dateLabel: string; weekdayLabel: string; blocks: CounselorTimelineBlock[] }> {
  const { startUtc, endUtc } = tehranDayBoundsUtc(params.jy, params.jm, params.jd);
  const jalali = utcToJalaliInTehran(startUtc);
  const weekdayLabel =
    ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"][
      getPersianWeekdayIndex(startUtc)
    ] ?? "";
  const dateLabel = formatJalaliDateTimeShort(startUtc).split("،")[0] ?? "";

  const service = await ensureCounselorBookingService(params.organizationId);

  const [appointments, openSlots] = await Promise.all([
    prisma.counselorAppointment.findMany({
      where: {
        organizationId: params.organizationId,
        counselorUserId: params.counselorUserId,
        bookingReservation: {
          slot: {
            advisorId: params.advisorId,
            startsAt: { gte: startUtc, lt: endUtc },
          },
        },
      },
      include: {
        student: { select: { id: true, fullName: true } },
        bookingReservation: { include: { slot: true } },
      },
      orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
    }),
    prisma.bookingSlot.findMany({
      where: {
        organizationId: params.organizationId,
        serviceId: service.id,
        advisorId: params.advisorId,
        startsAt: { gte: startUtc, lt: endUtc },
        status: "OPEN",
        bookedCount: 0,
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const blocks: CounselorTimelineBlock[] = [];

  for (const appt of appointments) {
    const slot = appt.bookingReservation.slot;
    const kind = mapAppointmentKind(
      appt.status,
      appt.bookingReservation.status,
    );
    blocks.push({
      id: appt.id,
      kind,
      startMs: slot.startsAt.getTime(),
      endMs: slot.endsAt.getTime(),
      startLabel: toPersianDigits(formatTehranTime24(slot.startsAt)),
      endLabel: toPersianDigits(formatTehranTime24(slot.endsAt)),
      title: appt.student.fullName,
      subtitle: labelAppointmentPurpose(appt.purpose),
      statusLabel: labelCounselorAppointmentStatus(
        appt.status,
        appt.bookingReservation.status,
      ),
      appointmentId: appt.id,
      slotId: slot.id,
      studentId: appt.student.id,
    });
  }

  for (const slot of openSlots) {
    const overlapsAppointment = appointments.some((a) => {
      const s = a.bookingReservation.slot;
      return s.startsAt < slot.endsAt && s.endsAt > slot.startsAt;
    });
    if (overlapsAppointment) continue;
    blocks.push({
      id: `open-${slot.id}`,
      kind: "open_slot",
      startMs: slot.startsAt.getTime(),
      endMs: slot.endsAt.getTime(),
      startLabel: toPersianDigits(formatTehranTime24(slot.startsAt)),
      endLabel: toPersianDigits(formatTehranTime24(slot.endsAt)),
      title: "نوبت آزاد",
      subtitle: "قابل رزرو",
      statusLabel: "آزاد",
      appointmentId: null,
      slotId: slot.id,
      studentId: null,
    });
  }

  blocks.sort((a, b) => a.startMs - b.startMs);

  const sessionBlocks = blocks.filter(
    (b) => b.kind !== "open_slot" && b.kind !== "gap",
  );
  const withGaps: CounselorTimelineBlock[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!;
    if (
      withGaps.length > 0 &&
      block.kind !== "gap" &&
      withGaps[withGaps.length - 1]!.kind !== "open_slot" &&
      withGaps[withGaps.length - 1]!.kind !== "gap"
    ) {
      const prev = withGaps[withGaps.length - 1]!;
      if (
        prev.endMs < block.startMs &&
        (prev.kind !== "open_slot" || block.kind !== "open_slot")
      ) {
        const gapMin = Math.round((block.startMs - prev.endMs) / 60000);
        if (gapMin >= 5 && prev.kind !== "open_slot" && block.kind !== "open_slot") {
          withGaps.push({
            id: `gap-${prev.id}-${block.id}`,
            kind: "gap",
            startMs: prev.endMs,
            endMs: block.startMs,
            startLabel: prev.endLabel,
            endLabel: block.startLabel,
            title: `زمان آزاد: ${toPersianDigits(String(gapMin))} دقیقه`,
            subtitle: "فاصله بین جلسات",
            statusLabel: "آزاد",
            appointmentId: null,
            slotId: null,
            studentId: null,
          });
        }
      }
    }
    withGaps.push(block);
  }

  void sessionBlocks;
  void jalali;

  return { dateLabel, weekdayLabel, blocks: withGaps };
}
