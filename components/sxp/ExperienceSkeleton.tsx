export function ExperienceSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[840px] space-y-5"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">در حال بارگذاری خانه تجربه</span>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="sxp-skeleton h-28 sm:h-36" />
        <div className="space-y-3 px-5 py-5">
          <div className="sxp-skeleton h-5 w-40 rounded-full" />
          <div className="sxp-skeleton h-4 w-56 rounded-full" />
          <div className="sxp-skeleton h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="admin-card p-4">
            <div className="sxp-skeleton h-3 w-16 rounded-full" />
            <div className="sxp-skeleton mt-3 h-5 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="admin-card p-4">
            <div className="sxp-skeleton h-4 w-48 rounded-full" />
            <div className="sxp-skeleton mt-2 h-3 w-32 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
