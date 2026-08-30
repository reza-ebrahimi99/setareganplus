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
    <article
      className="portal-surface portal-assessment-card portal-surface--pad-md"
      data-portal-accent="blue"
    >
      <div>
        <h3 className="portal-assessment-card__title">{result.assessmentTitle}</h3>
        <p className="portal-assessment-card__meta">
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

      <dl className="portal-assessment-card__stats">
        <div>
          <dt>نمره</dt>
          <dd>{result.score != null ? toPersianDigits(result.score) : "—"}</dd>
        </div>
        <div>
          <dt>تراز</dt>
          <dd>
            {result.scaledScore != null
              ? toPersianDigits(result.scaledScore)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>صدک</dt>
          <dd>
            {result.percentile != null
              ? toPersianDigits(result.percentile)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>رشد</dt>
          <dd>{result.growth != null ? toPersianDigits(result.growth) : "—"}</dd>
        </div>
      </dl>

      {result.subjects.length > 0 ? (
        <div className="portal-assessment-card__subjects">
          <p className="portal-assessment-card__subjects-label">درس‌ها</p>
          <ul>
            {result.subjects.map((subject) => (
              <li key={subject.name}>
                <span>{subject.name}</span>
                <strong>
                  {subject.percentage != null
                    ? `${toPersianDigits(subject.percentage)}٪`
                    : "—"}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ranks.length > 0 ? (
        <p className="portal-assessment-card__ranks">رتبه: {ranks.join(" · ")}</p>
      ) : null}
    </article>
  );
}
