import Link from "next/link";
import type { PublicAssessmentCard } from "@/lib/assessment/assessments";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";

type AssessmentCardProps = {
  assessment: PublicAssessmentCard;
};

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  return (
    <Link
      href={`/assessments/${assessment.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-[transform,opacity,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-1 hover:border-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      <div
        className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/15"
        style={
          assessment.providerColor
            ? {
                backgroundImage: `linear-gradient(135deg, ${assessment.providerColor}22, transparent 55%)`,
              }
            : undefined
        }
      >
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          <span
            className="w-fit rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white"
            style={
              assessment.providerColor
                ? { backgroundColor: assessment.providerColor }
                : undefined
            }
          >
            {assessment.providerName}
          </span>
          <div>
            <p className="text-xs text-muted">{assessment.assessmentTypeLabel}</p>
            <p className="mt-1 text-sm font-medium text-primary">
              {assessment.gradeName}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-primary">{assessment.title}</h3>
        <p className="text-sm text-muted">
          {[
            assessment.schoolYear,
            assessment.assessmentDate
              ? formatJalaliDateShort(assessment.assessmentDate)
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
