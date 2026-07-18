import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type PortalAssessmentCardProps = {
  result: PortalAssessmentResultDto;
};

export function PortalAssessmentCard({ result }: PortalAssessmentCardProps) {
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
    <article className="admin-card p-4 sm:p-5">
      <div>
        <h3 className="text-base font-bold text-primary">{result.assessmentTitle}</h3>
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

      {result.subjects.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted">درس‌ها</p>
          <ul className="mt-2 space-y-1.5">
            {result.subjects.map((subject) => (
              <li
                key={subject.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-primary">{subject.name}</span>
                <span className="font-medium text-secondary">
                  {subject.percentage != null
                    ? `${toPersianDigits(subject.percentage)}٪`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ranks.length > 0 ? (
        <p className="mt-3 text-xs text-muted">رتبه: {ranks.join(" · ")}</p>
      ) : null}
    </article>
  );
}
