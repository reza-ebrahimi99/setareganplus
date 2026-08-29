import { PortalProgressRing } from "@/components/portal/home/PortalProgressRing";
import { PortalSurface } from "@/components/portal/PortalSurface";
import { toPersianDigits } from "@/lib/persian";
import type { PortalJourneyProgress } from "@/components/portal/journey/types";

type PortalJourneyProgressBarProps = {
  progress: PortalJourneyProgress;
  sticky?: boolean;
};

export function PortalJourneyProgressBar({
  progress,
  sticky = false,
}: PortalJourneyProgressBarProps) {
  return (
    <PortalSurface
      as="section"
      accent="gold"
      padding="md"
      className={[
        "portal-journey-progress",
        sticky ? "portal-journey-progress--sticky" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="portal-journey-progress__layout">
        <PortalProgressRing
          percent={progress.percent}
          size={96}
          caption="تکمیل"
        />
        <div className="portal-journey-progress__copy">
          <p className="portal-journey-progress__stage">
            مرحله فعلی: <strong>{progress.currentStageLabel}</strong>
          </p>
          <ul className="portal-journey-progress__stats">
            <li>
              <span>انجام‌شده</span>
              <strong>
                {toPersianDigits(progress.completedSteps)} از{" "}
                {toPersianDigits(progress.totalSteps)}
              </strong>
            </li>
            <li>
              <span>باقی‌مانده</span>
              <strong>{toPersianDigits(progress.remainingSteps)} قدم</strong>
            </li>
          </ul>
        </div>
      </div>
    </PortalSurface>
  );
}
