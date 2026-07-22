import type { CSSProperties } from "react";
import { ScoreBadge } from "@/components/assessments/top-results/ScoreBadge";
import { StudentAvatar } from "@/components/assessments/top-results/StudentAvatar";
import { studentDisplayName } from "@/components/assessments/top-results/display";
import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";
import { toPersianDigits } from "@/lib/persian";

type RankCardProps = {
  result: PublicAssessmentTopResult;
  style?: CSSProperties;
};

export function RankCard({ result, style }: RankCardProps) {
  const name = studentDisplayName(result);

  return (
    <li
      style={style}
      className="hof-reveal hof-rank-card flex items-center gap-4 rounded-xl border border-border/80 bg-white/75 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_14px_32px_-12px_rgba(15,23,42,0.12)] hover:border-secondary/35"
    >
      <StudentAvatar result={result} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-primary/5 px-2 py-0.5 text-xs font-bold tabular-nums text-primary ring-1 ring-border/80">
            <span className="sr-only">رتبه </span>
            {toPersianDigits(result.rank)}
          </span>
          <p className="truncate font-semibold text-primary">{name}</p>
        </div>
        <div className="mt-2.5">
          <ScoreBadge result={result} />
        </div>
      </div>
    </li>
  );
}
