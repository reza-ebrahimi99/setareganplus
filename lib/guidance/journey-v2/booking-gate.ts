/**
 * Pure booking-advance gate for Guidance V2 steps 11 and 15.
 * A visual slot selection is never enough — a live reservation must exist.
 */

export const BOOKING_ADVANCE_STATUSES = ["BOOKED", "CONFIRMED"] as const;

export const LIVE_RESERVATION_STATUSES = ["PENDING", "CONFIRMED"] as const;

export type BookingAdvanceSnapshot = {
  appointmentId: string;
  purpose: string;
  appointmentStatus: string;
  guidancePlanId: string | null;
  counselorUserId: string;
  reservationId: string | null;
  reservationStatus: string | null;
  slotStartsAt: Date | null;
  slotAdvisorId: string | null;
};

export function isLiveReservationStatus(status: string): boolean {
  return (LIVE_RESERVATION_STATUSES as readonly string[]).includes(status);
}

export function isAdvanceAppointmentStatus(status: string): boolean {
  return (BOOKING_ADVANCE_STATUSES as readonly string[]).includes(status);
}

export function assertQualifyingSessionBooking(params: {
  snapshot: BookingAdvanceSnapshot | null;
  expectedPurpose: string;
  expectedPlanId: string;
  expectedCounselorUserId: string;
  now?: Date;
}): { ok: true } | { ok: false; error: string } {
  const now = params.now ?? new Date();
  const row = params.snapshot;
  if (!row) {
    return { ok: false, error: "ابتدا یک نوبت معتبر رزرو کنید." };
  }
  if (row.purpose !== params.expectedPurpose) {
    return { ok: false, error: "نوبت رزروشده با نوع این جلسه هم‌خوان نیست." };
  }
  if (!isAdvanceAppointmentStatus(row.appointmentStatus)) {
    return { ok: false, error: "نوبت فعالی برای ادامه مسیر وجود ندارد." };
  }
  if (!row.guidancePlanId || row.guidancePlanId !== params.expectedPlanId) {
    return { ok: false, error: "نوبت به پرونده انتخاب رشته فعلی متصل نیست." };
  }
  if (row.counselorUserId !== params.expectedCounselorUserId) {
    return { ok: false, error: "نوبت متعلق به مشاور پرونده شما نیست." };
  }
  if (!row.reservationId || !row.reservationStatus || !row.slotStartsAt) {
    return { ok: false, error: "رزرو معتبری برای این نوبت ثبت نشده است." };
  }
  if (!isLiveReservationStatus(row.reservationStatus)) {
    return { ok: false, error: "وضعیت رزرو این نوبت دیگر معتبر نیست." };
  }
  if (row.slotStartsAt.getTime() <= now.getTime()) {
    return { ok: false, error: "نوبت فعال آینده‌ای برای این جلسه وجود ندارد." };
  }
  return { ok: true };
}
