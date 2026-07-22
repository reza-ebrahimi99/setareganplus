import { majorHeaderEmoji } from "@/components/assessments/top-results/display";
import { UNREGISTERED_MAJOR_LABEL } from "@/lib/assessment/featured-results";

type MajorHeaderProps = {
  majorName: string;
  headingId: string;
};

export function MajorHeader({ majorName, headingId }: MajorHeaderProps) {
  const label =
    majorName === UNREGISTERED_MAJOR_LABEL
      ? majorName
      : `رشته ${majorName}`;
  const emoji =
    majorName === UNREGISTERED_MAJOR_LABEL
      ? "📋"
      : majorHeaderEmoji(majorName);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gradient-to-l from-primary/[0.03] to-transparent px-2 py-2">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-base ring-1 ring-border/80 sm:text-lg"
      >
        {emoji}
      </span>
      <h4
        id={headingId}
        className="text-sm font-semibold tracking-tight text-primary/90 sm:text-base"
      >
        {label}
      </h4>
      <div
        aria-hidden
        className="h-px flex-1 bg-gradient-to-l from-border via-border/60 to-transparent"
      />
    </div>
  );
}
