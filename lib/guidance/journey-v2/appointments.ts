/**
 * V2 Steps 11 & 15 — booking against the assigned counselor only.
 * Reuses Counselor OS BookingAdvisor + CounselorAppointment. No second engine.
 */

import { CounselorAssignmentStatus } from "@/generated/prisma/enums";
import { cancelReservation, rescheduleReservation } from "@/lib/booking/manage-reservation";
import {
  bookCounselorSlotForStudent,
  ensureCounselorBookingService,
  loadCounselorAvailableSlots,
} from "@/lib/counselor-os/booking";
import {
  intervalsOverlap,
  readCounselorSessionDurations,
  slotDurationMinutes,
} from "@/lib/counselor-os/schedule";
import {
  formatJalaliDateTimeLabel,
  formatJalaliDateTimeShort,
} from "@/lib/datetime/jalali";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { assertQualifyingSessionBooking } from "@/lib/guidance/journey-v2/booking-gate";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  APPOINTMENT_PURPOSE,
  type AppointmentPurpose,
} from "@/lib/guidance/journey-v2/constants";
import {
  labelAppointmentPurpose,
  labelAppointmentStatus,
} from "@/lib/guidance/journey-v2/labels";
import { prisma } from "@/lib/prisma";

export type AssignedCounselorView = {
  advisorId: string;
  counselorUserId: string;
  name: string;
  title: string | null;
  specialty: string | null;
  photoUrl: string | null;
};

export type V2SlotView = {
  id: string;
  startsAtIso: string;
  endsAtIso?: string;
  label: string;
  remaining: number;
};

export type V2AppointmentView = {
  id: string;
  reservationId: string;
  purpose: AppointmentPurpose;
  purposeLabel: string;
  status: string;
  statusLabel: string;
  whenLabel: string;
  startsAtIso: string;
  canReschedule: boolean;
};

const LIVE_STATUSES = [...ACTIVE_APPOINTMENT_STATUSES];

export async function loadAssignedCounselorForStudent(params: {
  organizationId: string;
  studentId: string;
}): Promise<AssignedCounselorView | null> {
  const assignment = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    orderBy: { assignedAt: "desc" },
    select: { counselorUserId: true },
  });
  if (!assignment) return null;

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: assignment.counselorUserId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      displayName: true,
      title: true,
      specialty: true,
      photoMedia: { select: { storageKey: true } },
    },
  });
  if (!advisor?.userId) return null;

  let photoUrl: string | null = null;
  if (advisor.photoMedia?.storageKey) {
    try {
      photoUrl = publicUrlForStorageKey(advisor.photoMedia.storageKey);
    } catch {
      photoUrl = `/portal/student/services/guidance/journey/advisor-photo`;
    }
  }

  return {
    advisorId: advisor.id,
    counselorUserId: advisor.userId,
    name: advisor.displayName,
    title: advisor.title,
    specialty: advisor.specialty,
    photoUrl,
  };
}

export async function loadAssignedCounselorSlots(params: {
  organizationId: string;
  studentId: string;
  purpose?: AppointmentPurpose;
}): Promise<{ counselor: AssignedCounselorView | null; slots: V2SlotView[] }> {
  const counselor = await loadAssignedCounselorForStudent(params);
  if (!counselor) return { counselor: null, slots: [] };

  const slots = await loadCounselorAvailableSlots({
    organizationId: params.organizationId,
    advisorId: counselor.advisorId,
    purpose: params.purpose,
  });

  return {
    counselor,
    slots: slots.map((s) => ({
      id: s.id,
      startsAtIso: s.startsAtIso,
      endsAtIso: s.endsAtIso,
      label: s.label,
      remaining: s.remaining,
    })),
  };
}

export async function findActivePurposeAppointment(params: {
  organizationId: string;
  studentId: string;
  purpose: AppointmentPurpose;
}) {
  return prisma.counselorAppointment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: params.purpose,
      status: { in: [...LIVE_STATUSES] },
    },
    include: {
      bookingReservation: {
        include: { slot: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function mapAppointmentView(
  row: NonNullable<Awaited<ReturnType<typeof findActivePurposeAppointment>>>,
): V2AppointmentView {
  const slot = row.bookingReservation.slot;
  const startsAt = slot.startsAt;
  const purpose = (row.purpose ?? APPOINTMENT_PURPOSE.FIRST_SESSION) as AppointmentPurpose;
  return {
    id: row.id,
    reservationId: row.bookingReservationId,
    purpose,
    purposeLabel: labelAppointmentPurpose(purpose),
    status: row.status,
    statusLabel: labelAppointmentStatus(row.status),
    whenLabel: slot.endsAt
      ? formatJalaliDateTimeLabel(startsAt, slot.endsAt)
      : formatJalaliDateTimeShort(startsAt),
    startsAtIso: startsAt.toISOString(),
    canReschedule:
      (row.status === "BOOKED" || row.status === "CONFIRMED") &&
      startsAt.getTime() > Date.now(),
  };
}

export async function loadPurposeAppointmentView(params: {
  organizationId: string;
  studentId: string;
  purpose: AppointmentPurpose;
}): Promise<V2AppointmentView | null> {
  const row = await findActivePurposeAppointment(params);
  return row ? mapAppointmentView(row) : null;
}

export async function loadQualifyingSessionBooking(params: {
  organizationId: string;
  studentId: string;
  purpose: AppointmentPurpose;
  planId: string;
  counselorUserId: string;
  now?: Date;
}): Promise<
  | { ok: true; appointmentId: string; view: V2AppointmentView }
  | { ok: false; error: string }
> {
  const row = await findActivePurposeAppointment({
    organizationId: params.organizationId,
    studentId: params.studentId,
    purpose: params.purpose,
  });
  const reservation = row?.bookingReservation;
  const slot = reservation?.slot;
  const gate = assertQualifyingSessionBooking({
    expectedPurpose: params.purpose,
    expectedPlanId: params.planId,
    expectedCounselorUserId: params.counselorUserId,
    now: params.now,
    snapshot: row
      ? {
          appointmentId: row.id,
          purpose: row.purpose ?? "",
          appointmentStatus: row.status,
          guidancePlanId: row.guidancePlanId,
          counselorUserId: row.counselorUserId,
          reservationId: row.bookingReservationId,
          reservationStatus: reservation?.status ?? null,
          slotStartsAt: slot?.startsAt ?? null,
          slotAdvisorId: slot?.advisorId ?? null,
        }
      : null,
  });
  if (!gate.ok) return gate;
  if (!row) {
    return { ok: false, error: "ابتدا یک نوبت معتبر رزرو کنید." };
  }
  return { ok: true, appointmentId: row.id, view: mapAppointmentView(row) };
}

export async function bookV2Session(params: {
  organizationId: string;
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  slotId: string;
  purpose: AppointmentPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const counselor = await loadAssignedCounselorForStudent({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!counselor) {
    return { ok: false, error: "پرونده شما در حال تخصیص به مشاور است." };
  }

  const slot = await prisma.bookingSlot.findFirst({
    where: {
      id: params.slotId,
      organizationId: params.organizationId,
      advisorId: counselor.advisorId,
    },
    select: { id: true },
  });
  if (!slot) {
    return { ok: false, error: "این زمان متعلق به مشاور پرونده شما نیست." };
  }

  const existing = await findActivePurposeAppointment({
    organizationId: params.organizationId,
    studentId: params.studentId,
    purpose: params.purpose,
  });
  if (existing && (existing.status === "BOOKED" || existing.status === "CONFIRMED")) {
    const startsAt = existing.bookingReservation.slot.startsAt;
    if (startsAt.getTime() > Date.now()) {
      return {
        ok: false,
        error: "برای این جلسه یک نوبت فعال دارید. ابتدا آن را لغو یا جابه‌جا کنید.",
      };
    }
  }

  const booked = await bookCounselorSlotForStudent({
    organizationId: params.organizationId,
    studentId: params.studentId,
    userId: params.userId,
    slotId: params.slotId,
    firstName: params.firstName,
    lastName: params.lastName,
    mobile: params.mobile,
    purpose: params.purpose,
  });
  if (!booked.ok) return booked;

  return { ok: true };
}

export async function cancelV2Session(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
  purpose: AppointmentPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: params.purpose,
      status: { in: ["BOOKED", "CONFIRMED"] },
    },
    include: { bookingReservation: { include: { slot: true } } },
  });
  if (!appt) return { ok: false, error: "نوبت قابل لغو یافت نشد." };
  if (appt.bookingReservation.slot.startsAt.getTime() <= Date.now()) {
    return { ok: false, error: "زمان این جلسه گذشته است و از این صفحه قابل لغو نیست." };
  }

  const cancelled = await cancelReservation({
    organizationId: params.organizationId,
    reservationId: appt.bookingReservationId,
  });
  if (!cancelled.ok) return cancelled;

  await prisma.counselorAppointment.update({
    where: { id: appt.id },
    data: { status: "CANCELLED_BY_STUDENT" },
  });
  return { ok: true };
}

export async function rescheduleV2Session(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
  newSlotId: string;
  purpose: AppointmentPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const counselor = await loadAssignedCounselorForStudent({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!counselor) {
    return { ok: false, error: "پرونده شما در حال تخصیص به مشاور است." };
  }

  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.organizationId,
      studentId: params.studentId,
      purpose: params.purpose,
      status: { in: ["BOOKED", "CONFIRMED"] },
    },
  });
  if (!appt) return { ok: false, error: "نوبت قابل جابه‌جایی یافت نشد." };

  const slot = await prisma.bookingSlot.findFirst({
    where: {
      id: params.newSlotId,
      organizationId: params.organizationId,
      advisorId: counselor.advisorId,
    },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (!slot) {
    return { ok: false, error: "این زمان متعلق به مشاور پرونده شما نیست." };
  }

  const service = await ensureCounselorBookingService(params.organizationId);
  const durations = readCounselorSessionDurations(
    service.settings,
    counselor.advisorId,
  );
  const expected =
    params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
      ? durations.secondSessionMinutes
      : durations.firstSessionMinutes;
  if (slotDurationMinutes(slot.startsAt, slot.endsAt) !== expected) {
    return { ok: false, error: "این زمان برای این نوع جلسه معتبر نیست." };
  }

  const overlapping = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: params.organizationId,
      status: { in: ["PENDING", "CONFIRMED"] },
      id: { not: appt.bookingReservationId },
      slot: {
        advisorId: counselor.advisorId,
        startsAt: { lt: slot.endsAt },
        endsAt: { gt: slot.startsAt },
        NOT: { id: slot.id },
      },
    },
    select: { id: true },
  });
  if (overlapping) {
    return { ok: false, error: "این بازه با نوبت دیگری تداخل دارد." };
  }

  const result = await rescheduleReservation({
    organizationId: params.organizationId,
    reservationId: appt.bookingReservationId,
    newSlotId: params.newSlotId,
  });
  if (!result.ok) return result;

  await prisma.counselorAppointment.update({
    where: { id: appt.id },
    data: { bookingReservationId: result.newReservationId },
  });
  return { ok: true };
}

export function sessionPurposeCopy(purpose: AppointmentPurpose) {
  if (purpose === APPOINTMENT_PURPOSE.SECOND_SESSION) {
    return {
      title: "رزرو جلسه دوم",
      description:
        "این جلسه برای بررسی نهایی فهرست انتخاب‌ها و جمع‌بندی اصلاحات با مشاور پرونده شماست.",
    };
  }
  return {
    title: "رزرو جلسه اول",
    description:
      "پس از پرداخت بسته، جلسه اول مشاوره با مشاور تخصیص‌یافته به پرونده شما رزرو می‌شود.",
  };
}
