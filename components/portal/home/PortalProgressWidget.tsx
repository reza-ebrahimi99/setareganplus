import { PortalWidget } from "@/components/portal/PortalWidget";
import { PortalProgressRing } from "@/components/portal/home/PortalProgressRing";
import { toPersianDigits } from "@/lib/persian";
import type { PortalHomeProgressModel } from "@/lib/portal/student/home-presentation";

type PortalProgressWidgetProps = {
  progress: PortalHomeProgressModel | null;
  assessmentCount: number;
  achievementCount: number;
};

export function PortalProgressWidget({
  progress,
  assessmentCount,
  achievementCount,
}: PortalProgressWidgetProps) {
  if (!progress) {
    return (
      <PortalWidget
        id="progress"
        module="progress"
        title="پیشرفت من"
        icon="layers"
        description="وقتی مسیر فعالی داشته باشی، حلقه پیشرفت اینجا زنده می‌شود."
        empty
        emptyTitle="هنوز مسیری شروع نشده"
        emptyDescription="با شروع انتخاب رشته یا ثبت نتایج آزمون، تصویر پیشرفت ساخته می‌شود."
        emptyIcon="◎"
        className="portal-bento__progress"
      />
    );
  }

  return (
    <PortalWidget
      id="progress"
      module="progress"
      title="پیشرفت من"
      icon="layers"
      description="نمای بصری از مسیر فعلی — نه فقط عدد."
      meta={
        <span>
          فاز فعلی: <strong>{progress.phaseLabel}</strong>
        </span>
      }
      className="portal-bento__progress"
    >
      <div className="portal-progress-widget">
        <PortalProgressRing
          percent={progress.percent}
          caption="تکمیل مسیر"
          size={124}
        />
        <ul className="portal-progress-widget__stats">
          <li>
            <span className="portal-progress-widget__stat-label">انجام‌شده</span>
            <span className="portal-progress-widget__stat-value">
              {toPersianDigits(progress.completedSteps)} از{" "}
              {toPersianDigits(progress.totalSteps)}
            </span>
          </li>
          <li>
            <span className="portal-progress-widget__stat-label">باقی‌مانده</span>
            <span className="portal-progress-widget__stat-value">
              {toPersianDigits(progress.remainingSteps)} قدم
            </span>
          </li>
          <li>
            <span className="portal-progress-widget__stat-label">آزمون‌ها</span>
            <span className="portal-progress-widget__stat-value">
              {toPersianDigits(assessmentCount)}
            </span>
          </li>
          <li>
            <span className="portal-progress-widget__stat-label">افتخارات</span>
            <span className="portal-progress-widget__stat-value">
              {toPersianDigits(achievementCount)}
            </span>
          </li>
        </ul>
      </div>
    </PortalWidget>
  );
}
