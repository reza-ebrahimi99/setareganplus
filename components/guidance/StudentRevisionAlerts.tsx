import Link from "next/link";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";

export function StudentRevisionAlerts({
  items,
}: {
  items: Array<{
    stepNumber: number;
    message: string;
    requestedAtIso: string | null;
    status: string;
    sections: string[];
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="guidance-revision-alerts" dir="rtl" aria-label="نیازمند اصلاح">
      {items.map((item) => (
        <article key={item.stepNumber} className="guidance-revision-alerts__card">
          <h2>{item.status === "RESUBMITTED" ? "در انتظار بررسی مشاور" : "نیازمند اصلاح"} — مرحله {toPersianDigits(item.stepNumber)}</h2>
          <p className="guidance-revision-alerts__step">
            {counselorV2StepTitle(item.stepNumber)}
          </p>
          <p>{item.message}</p>
          {item.sections.length > 0 ? (
            <p className="guidance-revision-alerts__meta">
              بخش‌ها: {item.sections.join("، ")}
            </p>
          ) : null}
          {item.requestedAtIso ? (
            <p className="guidance-revision-alerts__meta">
              تاریخ درخواست: {formatJalaliDateTimeShort(new Date(item.requestedAtIso))}
            </p>
          ) : null}
          <Link
            href={guidanceJourneyV2StepPath(item.stepNumber as GuidanceV2StepId)}
            className="guidance-revision-alerts__cta"
          >
            {item.status === "RESUBMITTED" ? "مشاهده مرحله" : "رفتن به مرحله برای اصلاح"}
          </Link>
        </article>
      ))}
    </section>
  );
}
