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
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="guidance-revision-alerts" dir="rtl" aria-label="نیازمند اصلاح">
      {items.map((item) => (
        <article key={item.stepNumber} className="guidance-revision-alerts__card">
          <h2>نیازمند اصلاح — مرحله {toPersianDigits(item.stepNumber)}</h2>
          <p className="guidance-revision-alerts__step">
            {counselorV2StepTitle(item.stepNumber)}
          </p>
          <p>{item.message}</p>
          {item.requestedAtIso ? (
            <p className="guidance-revision-alerts__meta">
              تاریخ درخواست: {formatJalaliDateTimeShort(new Date(item.requestedAtIso))}
            </p>
          ) : null}
          <Link
            href={guidanceJourneyV2StepPath(item.stepNumber as GuidanceV2StepId)}
            className="guidance-revision-alerts__cta"
          >
            اصلاح مرحله
          </Link>
        </article>
      ))}
    </section>
  );
}
