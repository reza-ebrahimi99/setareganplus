import Image from "next/image";
import type { PublicAssessmentTopResultsByGrade } from "@/lib/assessment/featured-results";
import { toPersianDigits } from "@/lib/persian";

type AssessmentTopResultsSectionProps = {
  groups: PublicAssessmentTopResultsByGrade[];
  /** When publishing is on but no ranked rows qualify. */
  showEmptyState?: boolean;
};

export function AssessmentTopResultsSection({
  groups,
  showEmptyState = false,
}: AssessmentTopResultsSectionProps) {
  if (groups.length === 0) {
    if (!showEmptyState) return null;
    return (
      <section
        aria-labelledby="assessment-top-results-heading"
        className="admin-card space-y-3 p-6 sm:p-8"
      >
        <h2
          id="assessment-top-results-heading"
          className="text-xl font-bold text-primary"
        >
          برترین‌های آزمون
        </h2>
        <p className="text-sm leading-7 text-muted">
          هنوز برترینی برای نمایش عمومی ثبت نشده است.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="assessment-top-results-heading"
      className="space-y-8"
    >
      <div>
        <h2
          id="assessment-top-results-heading"
          className="text-xl font-bold text-primary sm:text-2xl"
        >
          برترین‌های آزمون
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          برترین نتایج منتشرشده به تفکیک پایه، بر اساس تراز یا نمره.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.gradeId} className="space-y-4">
          <h3 className="text-base font-semibold text-primary">
            {group.gradeName}
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.results.map((result) => {
              const displayName =
                `${result.firstName} ${result.lastName}`.trim() ||
                result.fullName;
              const initial = displayName.slice(0, 1) || "؟";
              const scoreLabel =
                result.scoreSource === "scaledScore" ? "تراز" : "نمره";

              return (
                <li
                  key={result.id}
                  className="flex items-center gap-4 rounded-2xl border border-border/80 bg-surface p-4"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-surface to-secondary/15">
                    {result.studentPortraitUrl ? (
                      <Image
                        src={result.studentPortraitUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="flex h-full items-center justify-center text-lg font-bold text-primary/45"
                      >
                        {initial}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted">
                      رتبه {toPersianDigits(result.rank)}
                    </p>
                    <p className="truncate font-semibold text-primary">
                      {displayName}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {group.gradeName}
                      <span className="mx-1.5 text-border">·</span>
                      {scoreLabel} {toPersianDigits(result.score)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
