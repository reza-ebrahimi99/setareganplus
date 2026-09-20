import { CounselorAppointmentsWorkspace } from "@/components/counselor-os/CounselorAppointmentsWorkspace";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { buildCounselorDayTimeline } from "@/lib/counselor-os/appointment-timeline";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { utcToJalaliInTehran } from "@/lib/datetime/jalali";
export const dynamic = "force-dynamic";

export default async function CounselorAppointmentsPage() {
  const ctx = await requireCounselorContext();
  const canViewMobile = ctx.canReview || ctx.isSupervisor;

  const [pending, today, upcoming] = await Promise.all([
    listCounselorAppointments(ctx, "pending"),
    listCounselorAppointments(ctx, "today"),
    listCounselorAppointments(ctx, "upcoming"),
  ]);

  const now = new Date();
  const jalali = utcToJalaliInTehran(now);
  let timelineBlocks: Awaited<ReturnType<typeof buildCounselorDayTimeline>> = {
    dateLabel: "",
    weekdayLabel: "",
    blocks: [],
  };

  const focusCounselorUserId =
    today[0]?.counselorUserId ??
    pending[0]?.counselorUserId ??
    (ctx.canReview ? null : ctx.userId);

  if (focusCounselorUserId) {
    const advisor = await resolveCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: focusCounselorUserId,
    });
    if (advisor?.id) {
      timelineBlocks = await buildCounselorDayTimeline({
        organizationId: ctx.organizationId,
        advisorId: advisor.id,
        counselorUserId: focusCounselorUserId,
        jy: jalali.jy,
        jm: jalali.jm,
        jd: jalali.jd,
      });
    }
  }

  return (
    <CounselorAppointmentsWorkspace
      pending={pending}
      today={today}
      upcoming={upcoming}
      timelineBlocks={timelineBlocks.blocks}
      timelineDateLabel={timelineBlocks.dateLabel}
      timelineWeekday={timelineBlocks.weekdayLabel}
      canViewMobile={canViewMobile}
    />
  );
}
