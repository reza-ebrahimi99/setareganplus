import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FirstSessionBooked } from "@/components/guidance/office/FirstSessionBooked";
import { FirstSessionPrep } from "@/components/guidance/office/FirstSessionPrep";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import {
  GUIDANCE_FIRST_SESSION_SERVICE_SLUG,
  loadGuidanceCounselingSessionState,
} from "@/lib/guidance/journey/booking";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { getBookingConfirmationPath } from "@/lib/booking/public-url";
import {
  deriveSessionCountdown,
  FIRST_SESSION_BOOK_HREF,
} from "@/lib/guidance/office/first-session";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { prisma } from "@/lib/prisma";
import {
  formatJalaliDateLong,
  formatPersianTimeRange,
} from "@/lib/datetime/jalali";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نخستین گفتگو",
  robots: { index: false, follow: false },
};

const MEETING_LABELS: Record<string, string> = {
  IN_PERSON: "حضوری",
  ONLINE: "آنلاین",
  PHONE: "تلفنی",
};

export default async function MajorOfficeSessionPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) redirect(GUIDANCE_ONBOARDING_PATH);

  const state = await loadGuidanceCounselingSessionState({
    organizationId: context.organization.id,
    planPublicId: plan.publicId,
    sessionNumber: 1,
  });

  if (!state.isActive || !state.session) {
    return <FirstSessionPrep bookHref={FIRST_SESSION_BOOK_HREF} />;
  }

  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      id: state.session.reservationId,
      organizationId: context.organization.id,
      deletedAt: null,
    },
    select: {
      trackingCode: true,
      meetingType: true,
      slot: {
        select: {
          startsAt: true,
          endsAt: true,
          advisor: { select: { displayName: true } },
        },
      },
    },
  });

  const startsAt = reservation?.slot.startsAt ?? new Date(state.session.startsAtIso);
  const endsAt = reservation?.slot.endsAt ?? startsAt;
  const trackingCode = reservation?.trackingCode || state.session.trackingCode;
  const confirmationHref = getBookingConfirmationPath(
    GUIDANCE_FIRST_SESSION_SERVICE_SLUG,
    trackingCode,
  );
  const countdown = deriveSessionCountdown(startsAt.toISOString());

  return (
    <FirstSessionBooked
      counselorName={reservation?.slot.advisor.displayName ?? "مهندس رضا ابراهیمی"}
      whenLabel={`${formatJalaliDateLong(startsAt)} · ${formatPersianTimeRange(startsAt, endsAt)}`}
      meetingLabel={
        reservation
          ? (MEETING_LABELS[reservation.meetingType] ?? reservation.meetingType)
          : "حضوری / آنلاین"
      }
      trackingCode={trackingCode}
      countdownLabel={
        countdown.upcoming ? countdown.label : "جلسه اول در پرونده شما ثبت شده است"
      }
      confirmationHref={confirmationHref}
      calendarHref={`${confirmationHref}/calendar`}
    />
  );
}
