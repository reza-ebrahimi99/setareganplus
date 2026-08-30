import { PortalWidget } from "@/components/portal/PortalWidget";
import { toPersianDigits } from "@/lib/persian";
import type { PortalJourneyProgress } from "@/components/portal/journey/types";

type PortalJourneySummaryProps = {
  progress: PortalJourneyProgress;
  title?: string;
};

/** Always-visible journey summary — existing progress data only. */
export function PortalJourneySummary({
  progress,
  title = "خلاصه مسیر",
}: PortalJourneySummaryProps) {
  return (
    <PortalWidget
      id="journey-summary"
      module="guidance"
      title={title}
      icon="route"
      description="وضعیت لحظه‌ای مسیر — بدون داده ساختگی."
      accent="gold"
      className="portal-journey-summary"
    >
      <dl className="portal-journey-summary__list">
        <div>
          <dt>قدم فعلی</dt>
          <dd>{progress.currentStageLabel}</dd>
        </div>
        <div>
          <dt>پیشرفت کلی</dt>
          <dd>{toPersianDigits(progress.percent)}٪</dd>
        </div>
        <div>
          <dt>انجام‌شده</dt>
          <dd>{toPersianDigits(progress.completedSteps)} قدم</dd>
        </div>
        <div>
          <dt>باقی‌مانده</dt>
          <dd>{toPersianDigits(progress.remainingSteps)} قدم</dd>
        </div>
      </dl>
      <p className="portal-journey-summary__note">
        زمان اتمام تخمینی وقتی داده‌های واقعی جلسه/زمان‌بندی موجود باشد اینجا
        نمایش داده می‌شود.
      </p>
    </PortalWidget>
  );
}
