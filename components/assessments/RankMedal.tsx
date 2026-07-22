import { MedalIcon } from "@/components/icons/MedalIcon";
import { toPersianDigits } from "@/lib/persian";

const MEDAL_META = {
  1: {
    label: "مدال طلایی",
    className: "text-amber-500",
    ringClassName: "ring-amber-400/40 bg-amber-500/10",
  },
  2: {
    label: "مدال نقره‌ای",
    className: "text-slate-400",
    ringClassName: "ring-slate-300/50 bg-slate-400/10",
  },
  3: {
    label: "مدال برنزی",
    className: "text-amber-700",
    ringClassName: "ring-amber-700/35 bg-amber-700/10",
  },
} as const;

type RankMedalProps = {
  rank: number;
  className?: string;
};

/**
 * Gold / silver / bronze medal for public top-result ranks 1–3.
 * Color is decorative; medal label is exposed to assistive tech.
 */
export function RankMedal({ rank, className = "" }: RankMedalProps) {
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const meta = MEDAL_META[rank];

  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ${meta.ringClassName} ${className}`}
      title={meta.label}
    >
      <MedalIcon className={`size-4 ${meta.className}`} />
      <span className="sr-only">
        {meta.label}، رتبه {toPersianDigits(rank)}
      </span>
    </span>
  );
}
