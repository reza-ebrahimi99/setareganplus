/**
 * Appointments hub data — filters, timeline, legacy, advisors.
 */

import {
  BookingStatus,
  CounselorAppointmentStatus,
  CounselorSchedulePlanStatus,
} from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { listManagedCounselorAdvisors, resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { labelCounselorAppointmentStatus } from "@/lib/counselor-os/appointment-lifecycle";
import { listLegacyInconsistentAppointments } from "@/lib/counselor-os/appointment-legacy";
import { expireStaleAltProposals } from "@/lib/counselor-os/appointment-alternative";
import { listCounselorAppointments, type CounselorAppointmentView } from "@/lib/counselor-os/appointments";
import { ensureCounselorBookingService } from "@/lib/counselor-os/booking";
import { findActiveSchedulePlan } from "@/lib/counselor-os/schedule-v2/active-plan";
import { CounselorScheduleSessionKind } from "@/generated/prisma/enums";
import { labelAppointmentPurpose } from "@/lib/guidance/journey-v2/labels";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import {
  computeBreakRanges,
  computeGapRanges,
  mergeTimelineBlocks,
  unionWorkingHours,
  workingBoundsFromWindows,
  type TimelineComputedBlock,
} from "@/lib/counselor-os/timeline-compute";
import { prisma } from "@/lib/prisma";
import { utcToJalaliInTehran, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import {
  formatTehranTime24,
  getPersianWeekdayIndex,
  getTehranParts,
  tehranDayBoundsUtc,
} from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import { dbDateToGregorianYmd } from "@/lib/counselor-os/schedule-v2/local-date";

export type AppointmentsHubFilters = {
  jy: number;
  jm: number;
  jd: number;
  advisorId: string | null;
  counselorUserId: string | null;
  purpose: string | null;
  status: string | null;
  q: string | null;
  view: "day" | "week" | "list";
  bucket: "all" | "action" | "today" | "upcoming" | "past";
};

export type HubTimelineBlock = TimelineComputedBlock & {
  startLabel: string;
  endLabel: string;
  statusLabel: string;
  stepLabel: string | null;
};

export type WeekColumn = {
  dateKey: string;
  weekdayLabel: string;
  items: CounselorAppointmentView[];
};

export type AppointmentsHubModel = {
  filters: AppointmentsHubFilters;
  dateLabel: string;
  weekdayLabel: string;
  advisors: Array<{ id: string; displayName: string; userId: string | null }>;
  pending: CounselorAppointmentView[];
  legacy: CounselorAppointmentView[];
  listItems: CounselorAppointmentView[];
  timelineBlocks: HubTimelineBlock[];
  weekColumns: WeekColumn[];
  bounds: { startMin: number; endMin: number } | null;
  nowMinutes: number;
};

function tehranMinutes(date: Date): number {
  const p = getTehranParts(date);
  return p.hour * 60 + p.minute;
}

function parseDateKey(key: string | undefined, fallback: Date): { jy: number; jm: number; jd: number } {
  if (key && /^\d+-\d+-\d+$/.test(key)) {
    const [jy, jm, jd] = key.split("-").map(Number);
    if (jy && jm && jd) return { jy, jm, jd };
  }
  return utcToJalaliInTehran(fallback);
}

export async function loadAppointmentsHub(
  ctx: CounselorContext,
  searchParams: Record<string, string | undefined>,
): Promise<AppointmentsHubModel> {
  await expireStaleAltProposals(ctx.organizationId);

  const now = new Date();
  const jalali = parseDateKey(searchParams.date, now);
  const view =
    searchParams.view === "week" || searchParams.view === "list"
      ? searchParams.view
      : "day";
  const bucket =
    searchParams.bucket === "action" ||
    searchParams.bucket === "today" ||
    searchParams.bucket === "upcoming" ||
    searchParams.bucket === "past"
      ? searchParams.bucket
      : "all";

  let advisorId = searchParams.advisorId ?? null;
  let counselorUserId = searchParams.counselorUserId ?? null;

  if (!ctx.canReview && !ctx.isSupervisor) {
    counselorUserId = ctx.userId;
    const selfAdvisor = await resolveCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });
    advisorId = selfAdvisor?.id ?? null;
  } else if (advisorId && !counselorUserId) {
    const adv = await prisma.bookingAdvisor.findFirst({
      where: { id: advisorId, organizationId: ctx.organizationId },
      select: { userId: true },
    });
    counselorUserId = adv?.userId ?? null;
  }

  const advisors = ctx.canReview || ctx.isSupervisor
    ? await listManagedCounselorAdvisors(ctx.organizationId)
    : [];

  const [pending, legacy, allRows] = await Promise.all([
    listCounselorAppointments(ctx, "pending"),
    listLegacyInconsistentAppointments(ctx),
    listCounselorAppointments(ctx, "all"),
  ]);

  let listItems = allRows;
  const q = searchParams.q?.trim();
  if (q) {
    listItems = listItems.filter((a) => a.studentName.includes(q));
  }
  if (searchParams.purpose) {
    listItems = listItems.filter((a) => a.purposeLabel.includes(searchParams.purpose!));
  }
  if (searchParams.status) {
    listItems = listItems.filter((a) => a.status === searchParams.status);
  }
  if (bucket === "action") {
    listItems = listItems.filter((a) => a.needsConfirmation);
  }

  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);
  const dateLabel = formatJalaliDateTimeShort(startUtc).split("،")[0] ?? "";
  const weekdayLabel =
    ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"][
      getPersianWeekdayIndex(startUtc)
    ] ?? "";

  let timelineBlocks: HubTimelineBlock[] = [];
  let bounds: { startMin: number; endMin: number } | null = null;

  if (advisorId && counselorUserId) {
    const service = await ensureCounselorBookingService(ctx.organizationId);
    const gregorianYmd = `${getTehranParts(startUtc).year}-${String(getTehranParts(startUtc).month).padStart(2, "0")}-${String(getTehranParts(startUtc).day).padStart(2, "0")}`;

    const plans = await Promise.all([
      findActiveSchedulePlan({
        organizationId: ctx.organizationId,
        advisorId,
        sessionKind: CounselorScheduleSessionKind.FIRST_SESSION,
      }),
      findActiveSchedulePlan({
        organizationId: ctx.organizationId,
        advisorId,
        sessionKind: CounselorScheduleSessionKind.SECOND_SESSION,
      }),
    ]);

    const windowRows: Array<{ startLocalTime: string; endLocalTime: string }> = [];
    for (const plan of plans) {
      if (!plan) continue;
      const day = plan.days.find(
        (d) => dbDateToGregorianYmd(d.localDate) === gregorianYmd,
      );
      if (day) {
        for (const w of day.windows) {
          windowRows.push({
            startLocalTime: w.startLocalTime,
            endLocalTime: w.endLocalTime,
          });
        }
      }
    }

    const working = unionWorkingHours(windowRows);
    const breaks = computeBreakRanges(windowRows);
    const workBounds = workingBoundsFromWindows(windowRows);

    const [appointments, openSlots] = await Promise.all([
      prisma.counselorAppointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          counselorUserId,
          bookingReservation: {
            slot: {
              advisorId,
              startsAt: { gte: startUtc, lt: endUtc },
            },
          },
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              guidancePlans: {
                where: { deletedAt: null, journeyVersion: 2 },
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: { currentStep: true },
              },
            },
          },
          bookingReservation: { include: { slot: true } },
        },
        orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
      }),
      prisma.bookingSlot.findMany({
        where: {
          organizationId: ctx.organizationId,
          serviceId: service.id,
          advisorId,
          startsAt: { gte: startUtc, lt: endUtc },
          status: "OPEN",
          bookedCount: 0,
          OR:
            plans.filter(Boolean).length > 0
              ? plans.filter(Boolean).map((p) => ({
                  schedulePlanId: p!.id,
                  schedulePlan: { status: CounselorSchedulePlanStatus.ACTIVE },
                }))
              : [{ id: "__no_open_slots__" }],
        },
        orderBy: { startsAt: "asc" },
      }),
    ]);

    const apptBlocks: TimelineComputedBlock[] = appointments.map((a) => {
      const slot = a.bookingReservation.slot;
      const start = tehranMinutes(slot.startsAt);
      const end = tehranMinutes(slot.endsAt);
      let kind: TimelineComputedBlock["kind"] = "confirmed";
      if (a.status === CounselorAppointmentStatus.BOOKED) kind = "pending";
      else if (a.status === CounselorAppointmentStatus.COMPLETED) kind = "completed";
      else if (a.status === CounselorAppointmentStatus.NO_SHOW) kind = "no_show";
      else if (
        a.status === CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR ||
        a.status === CounselorAppointmentStatus.CANCELLED_BY_STUDENT
      ) {
        kind = "cancelled";
      }
      return {
        id: a.id,
        kind,
        start,
        end,
        title: a.student.fullName,
        subtitle: labelAppointmentPurpose(a.purpose),
        appointmentId: a.id,
        slotId: slot.id,
        studentId: a.student.id,
        clickable: true,
      };
    });

    const openBlocks: TimelineComputedBlock[] = openSlots
      .filter((slot) => {
        return !appointments.some((a) => {
          const s = a.bookingReservation.slot;
          return s.startsAt < slot.endsAt && s.endsAt > slot.startsAt;
        });
      })
      .map((slot) => ({
        id: `open-${slot.id}`,
        kind: "open_slot" as const,
        start: tehranMinutes(slot.startsAt),
        end: tehranMinutes(slot.endsAt),
        title: "نوبت آزاد",
        subtitle: "قابل رزرو",
        appointmentId: null,
        slotId: slot.id,
        studentId: null,
        clickable: true,
      }));

    const occupied = apptBlocks.map((b) => ({ start: b.start, end: b.end }));
    const openRanges = openBlocks.map((b) => ({ start: b.start, end: b.end }));
    const gapRanges = computeGapRanges({
      working,
      occupied,
      breaks,
      openSlots: openRanges,
    });

    const breakBlocks: TimelineComputedBlock[] = breaks.map((b, i) => ({
      id: `break-${i}`,
      kind: "break",
      start: b.start,
      end: b.end,
      title: "استراحت",
      subtitle: "غیرقابل رزرو",
      appointmentId: null,
      slotId: null,
      studentId: null,
      clickable: false,
    }));

    const gapBlocks: TimelineComputedBlock[] = gapRanges.map((g, i) => ({
      id: `gap-${i}`,
      kind: "gap",
      start: g.start,
      end: g.end,
      title: `زمان آزاد: ${toPersianDigits(String(g.end - g.start))} دقیقه`,
      subtitle: "فاصله کاری",
      appointmentId: null,
      slotId: null,
      studentId: null,
      clickable: false,
    }));

    const merged = mergeTimelineBlocks([
      ...apptBlocks,
      ...openBlocks,
      ...breakBlocks,
      ...gapBlocks,
    ]);

    const stepByStudent = new Map(
      appointments.map((a) => [
        a.id,
        a.student.guidancePlans[0]?.currentStep
          ? counselorV2StepTitle(a.student.guidancePlans[0].currentStep)
          : null,
      ]),
    );

    timelineBlocks = merged.map((b) => {
      const appt = appointments.find((a) => a.id === b.appointmentId);
      return {
        ...b,
        startLabel: toPersianDigits(
          `${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}`,
        ),
        endLabel: toPersianDigits(
          `${String(Math.floor(b.end / 60)).padStart(2, "0")}:${String(b.end % 60).padStart(2, "0")}`,
        ),
        statusLabel: appt
          ? labelCounselorAppointmentStatus(
              appt.status,
              appt.bookingReservation.status,
            )
          : b.subtitle,
        stepLabel: b.appointmentId ? stepByStudent.get(b.appointmentId) ?? null : null,
      };
    });

    if (workBounds) {
      bounds = { startMin: workBounds.start, endMin: workBounds.end };
    } else if (merged.length > 0) {
      bounds = {
        startMin: Math.min(...merged.map((m) => m.start)),
        endMin: Math.max(...merged.map((m) => m.end)),
      };
    }
  }

  const persianWd = getPersianWeekdayIndex(startUtc);
  const weekStartMs = startUtc.getTime() - persianWd * 86400000;
  const weekColumns: WeekColumn[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayUtc = new Date(weekStartMs + i * 86400000);
    const j = utcToJalaliInTehran(dayUtc);
    const key = `${j.jy}-${j.jm}-${j.jd}`;
    const wd =
      ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"][i] ?? "";
    weekColumns.push({
      dateKey: key,
      weekdayLabel: wd,
      items: allRows.filter((a) => a.dateKey === key),
    });
  }

  return {
    filters: {
      jy: jalali.jy,
      jm: jalali.jm,
      jd: jalali.jd,
      advisorId,
      counselorUserId,
      purpose: searchParams.purpose ?? null,
      status: searchParams.status ?? null,
      q: q ?? null,
      view,
      bucket,
    },
    dateLabel,
    weekdayLabel,
    advisors,
    pending,
    legacy,
    listItems,
    timelineBlocks,
    weekColumns,
    bounds,
    nowMinutes: tehranMinutes(now),
  };
}
