import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";
import type { StudentProfileWidgetModel } from "@/lib/guidance/profile360/types";

type StudentProfile360WidgetProps = {
  widget: StudentProfileWidgetModel;
};

/**
 * Guidance Home widget — Student 360° Profile completion / health / CTA.
 */
export function StudentProfile360Widget({ widget }: StudentProfile360WidgetProps) {
  return (
    <section
      className="profile360-home-widget"
      data-portal-accent={widget.accent}
      data-health={widget.health}
      data-status={widget.status}
      aria-labelledby="profile360-home-title"
    >
      <div className="profile360-home-widget__top">
        <span className="profile360-home-widget__icon" aria-hidden="true">
          <PortalIcon name={widget.icon} className="size-5" />
        </span>
        <span className="profile360-home-widget__status">
          {widget.statusLabel} · {widget.healthLabel}
        </span>
      </div>
      <h2 id="profile360-home-title" className="profile360-home-widget__title">
        {widget.title}
      </h2>
      <p className="profile360-home-widget__desc">{widget.description}</p>
      <div
        className="profile360-home-widget__bar"
        role="progressbar"
        aria-valuenow={widget.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="تکمیل پروفایل ۳۶۰"
      >
        <span style={{ width: `${widget.progressPercent}%` }} />
      </div>
      <p className="profile360-home-widget__completion">
        {widget.completionLabel} · {toPersianDigits(widget.progressPercent)}٪
      </p>
      {widget.cta ? (
        <Link href={widget.cta.href} className="profile360-home-widget__cta">
          {widget.cta.label}
        </Link>
      ) : null}
    </section>
  );
}
