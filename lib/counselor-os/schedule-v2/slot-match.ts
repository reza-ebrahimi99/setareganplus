import type { CounselorSchedulePlan } from "@/generated/prisma/client";
import { dbDateToGregorianYmd } from "@/lib/counselor-os/schedule-v2/local-date";
import { slotFitsSingleWindow } from "@/lib/counselor-os/schedule-windows";
import { formatTehranTime24, parseLocalTimeHm } from "@/lib/datetime/tehran-zone";

type PlanWithDays = CounselorSchedulePlan & {
  days: Array<{
    localDate: Date;
    windows: Array<{ startLocalTime: string; endLocalTime: string }>;
  }>;
};

export function slotMatchesActivePlan(params: {
  slot: {
    startsAt: Date;
    endsAt: Date;
    schedulePlanId: string | null;
  };
  plan: PlanWithDays;
  durationMinutes: number;
  tehranYmd: string;
}): boolean {
  const slotDuration = Math.round(
    (params.slot.endsAt.getTime() - params.slot.startsAt.getTime()) / 60000,
  );
  if (slotDuration !== params.durationMinutes) return false;

  if (params.slot.schedulePlanId) {
    return params.slot.schedulePlanId === params.plan.id;
  }

  const day = params.plan.days.find(
    (d) => dbDateToGregorianYmd(d.localDate) === params.tehranYmd,
  );
  if (!day) return false;

  const hm = parseLocalTimeHm(formatTehranTime24(params.slot.startsAt));
  if (!hm) return false;
  const startMinutes = hm.hour * 60 + hm.minute;
  return slotFitsSingleWindow({
    startMinutes,
    durationMinutes: params.durationMinutes,
    windows: day.windows,
  });
}
