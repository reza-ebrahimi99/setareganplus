import Link from "next/link";
import { PortalWidget } from "@/components/portal/PortalWidget";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalHomeProgressModel } from "@/lib/portal/student/home-presentation";

type PortalGuidanceSummaryWidgetProps = {
  enabled: boolean;
  hasPlan: boolean;
  steps: readonly GuidanceTimelineStep[] | null;
  progress: PortalHomeProgressModel | null;
};

export function PortalGuidanceSummaryWidget({
  enabled,
  hasPlan,
  steps,
  progress,
}: PortalGuidanceSummaryWidgetProps) {
  if (!enabled) {
    return null;
  }

  if (!hasPlan || !steps || !progress) {
    return (
      <PortalWidget
        id="guidance-summary"
        module="guidance"
        title="مسیر انتخاب رشته"
        icon="route"
        description="خلاصه فشرده مسیر — جزئیات کامل در صفحه اختصاصی."
        empty
        emptyTitle="مسیر هنوز شروع نشده"
        emptyDescription="با پیش‌ثبت‌نام، نقشه راه انتخاب رشته برای تو فعال می‌شود."
        action={{ href: "/guidance/pre-register", label: "شروع مسیر" }}
        className="portal-bento__guidance"
      />
    );
  }

  const current =
    steps.find((step) => step.state === "active" || step.state === "pending_review") ??
    steps.find((step) => step.state === "complete");
  const nextLocked = steps.find((step) => step.state === "locked");

  return (
    <PortalWidget
      id="guidance-summary"
      module="guidance"
      title="مسیر انتخاب رشته"
      icon="route"
      description="خلاصه وضعیت — بدون تکرار کل تایم‌لاین."
      status={`${toPersianDigits(progress.percent)}٪`}
      meta={
        <span>
          {toPersianDigits(progress.remainingSteps)} قدم باقی‌مانده
        </span>
      }
      action={{
        href: "/portal/student/services/guidance",
        label: "جزئیات مسیر",
      }}
      className="portal-bento__guidance"
    >
      <div className="portal-guidance-summary">
        <div className="portal-guidance-summary__row">
          <span className="portal-guidance-summary__label">قدم فعلی</span>
          <span className="portal-guidance-summary__value">
            {current?.label ?? progress.phaseLabel}
          </span>
        </div>
        <div className="portal-guidance-summary__row">
          <span className="portal-guidance-summary__label">قدم بعدی</span>
          <span className="portal-guidance-summary__value">
            {nextLocked?.label ?? "به‌زودی اعلام می‌شود"}
          </span>
        </div>
        <div
          className="portal-guidance-summary__bar"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        {current?.href ? (
          <Link href={current.href} className="portal-guidance-summary__cta">
            {current.state === "pending_review"
              ? "پیگیری بررسی کارنامه"
              : "انجام قدم فعلی"}
          </Link>
        ) : (
          <Link
            href="/portal/student/services/guidance"
            className="portal-guidance-summary__cta"
          >
            مشاهده مسیر کامل
          </Link>
        )}
      </div>
    </PortalWidget>
  );
}
