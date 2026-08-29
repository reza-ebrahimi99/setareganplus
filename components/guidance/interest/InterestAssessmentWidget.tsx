import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";
import type { InterestDashboardWidgetModel } from "@/lib/guidance/interest/types";

type InterestAssessmentWidgetProps = {
  widget: InterestDashboardWidgetModel;
};

/**
 * Guidance Home dashboard widget — Interest Assessment status / progress / CTA.
 */
export function InterestAssessmentWidget({
  widget,
}: InterestAssessmentWidgetProps) {
  return (
    <section
      className="interest-widget"
      data-portal-accent={widget.accent}
      data-status={widget.status}
      aria-labelledby="interest-widget-title"
    >
      <div className="interest-widget__top">
        <span className="interest-widget__icon" aria-hidden="true">
          <PortalIcon name={widget.icon} className="size-5" />
        </span>
        <span className="interest-widget__status">{widget.statusLabel}</span>
      </div>
      <h2 id="interest-widget-title" className="interest-widget__title">
        {widget.title}
      </h2>
      <p className="interest-widget__desc">{widget.description}</p>
      <div
        className="interest-widget__bar"
        role="progressbar"
        aria-valuenow={widget.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="پیشرفت آزمون رغبت"
      >
        <span style={{ width: `${widget.progressPercent}%` }} />
      </div>
      <p className="interest-widget__completion">
        {widget.completionLabel} · {toPersianDigits(widget.progressPercent)}٪
      </p>
      {widget.cta ? (
        <Link href={widget.cta.href} className="interest-widget__cta">
          {widget.cta.label}
        </Link>
      ) : null}
    </section>
  );
}
