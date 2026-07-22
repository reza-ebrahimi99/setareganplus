import { MedalIcon } from "@/components/icons/MedalIcon";
import { toPersianDigits } from "@/lib/persian";

const MEDAL_META = {
  1: {
    label: "مدال طلایی",
    className: "text-amber-500",
    ringClassName:
      "ring-amber-400/55 bg-gradient-to-br from-amber-200/90 via-amber-50 to-white",
    glowClassName:
      "shadow-[0_0_28px_rgba(245,158,11,0.5),0_0_8px_rgba(212,175,55,0.35)]",
  },
  2: {
    label: "مدال نقره‌ای",
    className: "text-slate-500",
    ringClassName:
      "ring-slate-300/80 bg-gradient-to-br from-slate-200 via-slate-50 to-white",
    glowClassName:
      "shadow-[0_0_22px_rgba(148,163,184,0.45),0_0_6px_rgba(148,163,184,0.3)]",
  },
  3: {
    label: "مدال برنزی",
    className: "text-amber-800",
    ringClassName:
      "ring-amber-700/45 bg-gradient-to-br from-amber-300/60 via-amber-100/85 to-white",
    glowClassName:
      "shadow-[0_0_22px_rgba(180,83,9,0.4),0_0_6px_rgba(180,83,9,0.25)]",
  },
} as const;

type RankMedalProps = {
  rank: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  glowing?: boolean;
};

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

const ICON_SIZE = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

/**
 * Gold / silver / bronze medal for public top-result ranks 1–3.
 * Color is decorative; medal label is exposed to assistive tech.
 */
export function RankMedal({
  rank,
  className = "",
  size = "sm",
  glowing = false,
}: RankMedalProps) {
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const meta = MEDAL_META[rank];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ${SIZE_CLASS[size]} ${meta.ringClassName} ${glowing ? meta.glowClassName : ""} ${className}`}
      title={meta.label}
    >
      <MedalIcon className={`${ICON_SIZE[size]} ${meta.className}`} />
      <span className="sr-only">
        {meta.label}، رتبه {toPersianDigits(rank)}
      </span>
    </span>
  );
}
