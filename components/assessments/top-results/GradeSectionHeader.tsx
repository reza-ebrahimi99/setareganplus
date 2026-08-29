type GradeSectionHeaderProps = {
  gradeName: string;
  headingId: string;
};

export function GradeSectionHeader({
  gradeName,
  headingId,
}: GradeSectionHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-l from-secondary/[0.1] via-secondary/[0.03] to-surface px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-secondary via-secondary/70 to-primary/35"
      />
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/8 to-secondary/15 text-lg ring-1 ring-border/70"
        >
          📚
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={headingId}
            className="text-lg font-bold tracking-tight text-primary sm:text-xl"
          >
            {gradeName}
          </h3>
          <div
            aria-hidden
            className="mt-2.5 h-px w-full max-w-[14rem] bg-gradient-to-l from-secondary/55 via-secondary/25 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
