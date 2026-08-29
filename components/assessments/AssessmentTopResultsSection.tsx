import type { CSSProperties } from "react";
import { GradeSectionHeader } from "@/components/assessments/top-results/GradeSectionHeader";
import { MajorHeader } from "@/components/assessments/top-results/MajorHeader";
import { Podium } from "@/components/assessments/top-results/Podium";
import { RankCard } from "@/components/assessments/top-results/RankCard";
import { TopResultsHero } from "@/components/assessments/top-results/TopResultsHero";
import { splitPodiumAndRest } from "@/components/assessments/top-results/display";
import type {
  PublicAssessmentTopMajorGroup,
  PublicAssessmentTopResultsByGrade,
} from "@/lib/assessment/featured-results";

type AssessmentTopResultsSectionProps = {
  groups: PublicAssessmentTopResultsByGrade[];
  /** When publishing is on but no ranked rows qualify. */
  showEmptyState?: boolean;
  /** Hero title, e.g. برترین‌های آزمون قلم‌چی */
  heroTitle?: string;
  heroSubtitle?: string;
  /** Jalali-formatted assessment / publish date for caption */
  updatedAtLabel?: string | null;
};

function MajorGroupHall({
  grade,
  majorGroup,
  gradeIndex,
  majorIndex,
}: {
  grade: PublicAssessmentTopResultsByGrade;
  majorGroup: PublicAssessmentTopMajorGroup;
  gradeIndex: number;
  majorIndex: number;
}) {
  if (majorGroup.results.length === 0) return null;

  const { podium, rest } = splitPodiumAndRest(majorGroup.results);
  const majorHeadingId = `hof-major-${grade.gradeId}-${majorGroup.majorId ?? "none"}`;

  return (
    <div
      className="space-y-7"
      role="group"
      aria-labelledby={
        grade.splitByMajor && majorGroup.majorName
          ? majorHeadingId
          : undefined
      }
    >
      {grade.splitByMajor && majorGroup.majorName ? (
        <MajorHeader
          majorName={majorGroup.majorName}
          headingId={majorHeadingId}
        />
      ) : null}

      {podium.length > 0 ? <Podium results={podium} /> : null}

      {rest.length > 0 ? (
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((result, index) => (
            <RankCard
              key={result.id}
              result={result}
              style={
                {
                  animationDelay: `${Math.min((gradeIndex + majorIndex) * 40 + index * 45, 360)}ms`,
                } as CSSProperties
              }
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AssessmentTopResultsSection({
  groups,
  showEmptyState = false,
  heroTitle = "برترین‌های آزمون",
  heroSubtitle = "افتخارآفرینان ستارگان آینده",
  updatedAtLabel = null,
}: AssessmentTopResultsSectionProps) {
  if (groups.length === 0) {
    if (!showEmptyState) return null;
    return (
      <section
        aria-labelledby="assessment-top-results-heading"
        className="hall-of-fame-shell overflow-hidden rounded-3xl border border-border/70"
      >
        <TopResultsHero
          title={heroTitle}
          subtitle={heroSubtitle}
          updatedAtLabel={updatedAtLabel}
        />
        <div className="px-6 py-14 text-center sm:px-10">
          <p className="text-4xl" aria-hidden>
            ✨
          </p>
          <p className="mt-4 text-base font-semibold text-primary">
            هنوز برترینی برای نمایش عمومی ثبت نشده است
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
            به‌محض انتشار برترین نتایج این آزمون، نام افتخارآفرینان اینجا نمایش
            داده می‌شود.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="assessment-top-results-heading"
      className="hall-of-fame-shell overflow-hidden rounded-3xl border border-border/70"
    >
      <TopResultsHero
        title={heroTitle}
        subtitle={heroSubtitle}
        updatedAtLabel={updatedAtLabel}
      />

      <div className="space-y-14 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {groups.map((grade, gradeIndex) => {
          const gradeHeadingId = `hof-grade-${grade.gradeId}`;
          return (
            <section
              key={grade.gradeId}
              aria-labelledby={gradeHeadingId}
              className="hof-reveal space-y-7"
              style={
                {
                  animationDelay: `${Math.min(gradeIndex * 60, 240)}ms`,
                } as CSSProperties
              }
            >
              <GradeSectionHeader
                gradeName={grade.gradeName}
                headingId={gradeHeadingId}
              />
              <div className="space-y-10">
                {grade.majorGroups.map((majorGroup, majorIndex) => (
                  <MajorGroupHall
                    key={`${grade.gradeId}:${majorGroup.majorId ?? "none"}`}
                    grade={grade}
                    majorGroup={majorGroup}
                    gradeIndex={gradeIndex}
                    majorIndex={majorIndex}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
