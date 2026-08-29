import { toPersianDigits } from "@/lib/persian";
import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";

type ScoreBadgeProps = {
  result: Pick<PublicAssessmentTopResult, "score" | "scoreSource">;
  className?: string;
};

export function ScoreBadge({ result, className = "" }: ScoreBadgeProps) {
  const label = result.scoreSource === "scaledScore" ? "تراز" : "نمره";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-gradient-to-l from-secondary/20 via-secondary/8 to-white px-3 py-1 text-xs font-semibold text-primary shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] ${className}`}
    >
      <span aria-hidden className="leading-none">
        ⭐
      </span>
      <span className="sr-only">{label} </span>
      <span className="tabular-nums tracking-tight">
        {toPersianDigits(result.score)}
      </span>
    </span>
  );
}
