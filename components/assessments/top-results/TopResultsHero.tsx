type TopResultsHeroProps = {
  title: string;
  subtitle: string;
  updatedAtLabel: string | null;
};

export function TopResultsHero({
  title,
  subtitle,
  updatedAtLabel,
}: TopResultsHeroProps) {
  return (
    <header className="hall-of-fame-hero relative overflow-hidden px-5 py-7 text-center sm:px-8 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(212,175,55,0.2),transparent_50%)]"
      />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-2.5">
        <div
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl bg-secondary/15 text-2xl ring-1 ring-secondary/30 shadow-[0_0_28px_rgba(212,175,55,0.22)] sm:size-12 sm:text-[1.65rem]"
        >
          🏆
        </div>
        <h2
          id="assessment-top-results-heading"
          className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.65rem]"
        >
          {title}
        </h2>
        <p className="text-sm leading-7 text-white/75 sm:text-[0.95rem]">
          {subtitle}
        </p>
        {updatedAtLabel ? (
          <p className="text-xs text-white/45 sm:text-[0.8rem]">
            <time className="font-medium text-secondary/90">
              {updatedAtLabel}
            </time>
          </p>
        ) : null}
      </div>
    </header>
  );
}
