import { RankMedal } from "@/components/assessments/RankMedal";
import { ScoreBadge } from "@/components/assessments/top-results/ScoreBadge";
import { StudentAvatar } from "@/components/assessments/top-results/StudentAvatar";
import { studentDisplayName } from "@/components/assessments/top-results/display";
import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";
import { toPersianDigits } from "@/lib/persian";

type PodiumCardProps = {
  result: PublicAssessmentTopResult;
  /** Visual prominence: gold is center/largest. */
  prominence: "gold" | "silver" | "bronze";
};

const PROMINENCE = {
  gold: {
    shell:
      "hof-podium-card hof-podium-card--gold border-amber-400/55 bg-gradient-to-b from-amber-50/95 via-white/92 to-white/85 shadow-[0_28px_60px_-22px_rgba(212,175,55,0.58),0_0_40px_-8px_rgba(212,175,55,0.28)] ring-1 ring-amber-300/50",
    glow: "from-amber-400/40 via-amber-300/18",
    order: "order-1 sm:order-2",
    width:
      "sm:w-[17.5rem] sm:max-w-[17.5rem] sm:-translate-y-5 motion-safe:sm:hover:-translate-y-6",
    avatar: "lg" as const,
    nameClass: "text-lg font-extrabold tracking-tight text-primary sm:text-xl",
    placeClass: "text-[11px] font-semibold tracking-wide text-amber-800/80",
    placeLabel: "مقام اول",
  },
  silver: {
    shell:
      "hof-podium-card hof-podium-card--silver border-slate-300/75 bg-gradient-to-b from-slate-50/95 via-white/92 to-white/85 shadow-[0_14px_36px_-18px_rgba(100,116,139,0.4)] ring-1 ring-slate-200/70",
    glow: "from-slate-400/22 via-slate-300/10",
    order: "order-2 sm:order-1",
    width:
      "sm:w-[14rem] sm:max-w-[14rem] motion-safe:sm:hover:-translate-y-1",
    avatar: "md" as const,
    nameClass: "text-base font-bold tracking-tight text-primary",
    placeClass: "text-[11px] font-medium tracking-wide text-muted",
    placeLabel: "مقام دوم",
  },
  bronze: {
    shell:
      "hof-podium-card hof-podium-card--bronze border-amber-700/40 bg-gradient-to-b from-amber-50/90 via-white/92 to-white/85 shadow-[0_14px_36px_-18px_rgba(180,83,9,0.36)] ring-1 ring-amber-700/25",
    glow: "from-amber-700/22 via-amber-600/10",
    order: "order-3 sm:order-3",
    width:
      "sm:w-[14rem] sm:max-w-[14rem] motion-safe:sm:hover:-translate-y-1",
    avatar: "md" as const,
    nameClass: "text-base font-bold tracking-tight text-primary",
    placeClass: "text-[11px] font-medium tracking-wide text-muted",
    placeLabel: "مقام سوم",
  },
} as const;

export function PodiumCard({ result, prominence }: PodiumCardProps) {
  const meta = PROMINENCE[prominence];
  const name = studentDisplayName(result);

  return (
    <li
      className={`relative flex w-full max-w-xs flex-col items-center rounded-xl border p-5 text-center backdrop-blur-[2px] transition-[transform,box-shadow,border-color] duration-200 ease-out sm:max-w-none ${meta.shell} ${meta.width} ${meta.order}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-5 -top-1 h-20 rounded-b-full bg-gradient-to-b ${meta.glow} to-transparent blur-2xl`}
      />
      <div className="relative flex flex-col items-center gap-3">
        <RankMedal rank={result.rank} size="lg" glowing />
        <StudentAvatar result={result} size={meta.avatar} />
        <div>
          <p className={meta.placeClass}>{meta.placeLabel}</p>
          <p className={`mt-1 ${meta.nameClass}`}>{name}</p>
          <p className="sr-only">رتبه {toPersianDigits(result.rank)}</p>
        </div>
        <ScoreBadge result={result} />
      </div>
    </li>
  );
}
