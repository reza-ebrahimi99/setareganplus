import { toPersianDigits } from "@/lib/persian";
import type { CounselorHollandScoreRow } from "@/lib/counselor-os/view-models";

export function HollandScoreChart({
  scores,
}: {
  scores: CounselorHollandScoreRow[];
}) {
  if (scores.length === 0) return null;
  return (
    <div className="cos-holland-chart" role="img" aria-label="نمودار شش بُعد رغبت">
      {scores.map((score) => (
        <div key={score.type} className="cos-holland-chart__row">
          <div className="cos-holland-chart__label">
            <strong>
              {score.typeLabel} ({score.type})
            </strong>
            <span>
              رتبه {toPersianDigits(score.rank)} · {score.intensity}
            </span>
          </div>
          <div className="cos-holland-chart__track">
            <span
              className="cos-holland-chart__fill"
              style={{ width: `${Math.max(0, Math.min(100, score.normalized))}%` }}
            />
          </div>
          <strong className="cos-holland-chart__value">
            {toPersianDigits(score.normalized)}٪
          </strong>
        </div>
      ))}
    </div>
  );
}
