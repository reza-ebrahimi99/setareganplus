import Link from "next/link";
import type { PublicAssessmentResultCard } from "@/lib/assessment/results";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type AssessmentResultCardProps = {
  result: PublicAssessmentResultCard;
  showStudent?: boolean;
};

export function AssessmentResultCard({
  result,
  showStudent = false,
}: AssessmentResultCardProps) {
  const ranks = [
    result.rankSchool != null
      ? `مدرسه ${toPersianDigits(result.rankSchool)}`
      : null,
    result.rankCity != null ? `شهر ${toPersianDigits(result.rankCity)}` : null,
    result.rankProvince != null
      ? `استان ${toPersianDigits(result.rankProvince)}`
      : null,
    result.rankCountry != null
      ? `کشور ${toPersianDigits(result.rankCountry)}`
      : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/assessments/${result.assessmentSlug}`}
            className="text-base font-bold text-primary underline-offset-2 hover:underline"
          >
            {result.assessmentTitle}
          </Link>
          <p className="mt-1 text-sm text-muted">
            {[
              result.providerName,
              result.assessmentTypeLabel,
              result.schoolYear,
              result.assessmentDate
                ? formatJalaliDateShort(result.assessmentDate)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {result.isFeatured ? (
          <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
            ویژه
          </span>
        ) : null}
      </div>

      {showStudent && result.studentName ? (
        <p className="mt-3 text-sm">
          <span className="font-medium text-primary">{result.studentName}</span>
          {result.gradeName ? (
            <span className="text-muted"> · {result.gradeName}</span>
          ) : null}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">نمره</dt>
          <dd className="font-semibold text-primary">
            {result.score != null ? toPersianDigits(result.score) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">تراز</dt>
          <dd className="font-semibold text-primary">
            {result.scaledScore != null
              ? toPersianDigits(result.scaledScore)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">صدک</dt>
          <dd className="font-semibold text-primary">
            {result.percentile != null
              ? toPersianDigits(result.percentile)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">رشد</dt>
          <dd className="font-semibold text-primary">
            {result.growth != null ? toPersianDigits(result.growth) : "—"}
          </dd>
        </div>
      </dl>

      {ranks.length > 0 ? (
        <p className="mt-3 text-xs text-muted">رتبه: {ranks.join(" · ")}</p>
      ) : null}
    </article>
  );
}
