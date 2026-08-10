import Link from "next/link";
import type { AchievementTimelineGroup } from "@/lib/website/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type AchievementTimelineProps = {
  groups: AchievementTimelineGroup[];
  heading?: string;
  description?: string;
  headingId?: string;
  compact?: boolean;
};

export function AchievementTimeline({
  groups,
  heading = "مسیر زمانی افتخارات",
  description,
  headingId = "achievement-timeline-heading",
  compact = false,
}: AchievementTimelineProps) {
  if (groups.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="achievement-timeline"
    >
      <div className="max-w-3xl">
        <h2
          id={headingId}
          className="text-xl font-bold text-primary sm:text-2xl"
        >
          {toPersianDigits(heading)}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-muted sm:text-base">
            {toPersianDigits(description)}
          </p>
        ) : null}
      </div>

      <ol className="achievement-timeline-list mt-8 space-y-8">
        {groups.map((group) => (
          <li key={group.key} className="achievement-timeline-group">
            <div className="achievement-timeline-year">
              <span className="achievement-timeline-year-badge">
                {group.label}
              </span>
            </div>
            <ul
              className={
                compact
                  ? "mt-4 grid gap-3 sm:grid-cols-2"
                  : "mt-4 grid gap-3"
              }
            >
              {group.achievements.map((achievement) => {
                const meta = [
                  achievement.categoryName,
                  achievement.place,
                  achievement.level,
                  achievement.gradeName,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={achievement.id}>
                    <Link
                      href={`/achievements/${achievement.slug}`}
                      className="achievement-timeline-item group"
                    >
                      <span
                        className="achievement-timeline-dot"
                        aria-hidden="true"
                        style={
                          achievement.categoryColor
                            ? { backgroundColor: achievement.categoryColor }
                            : undefined
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary transition-colors group-hover:text-secondary sm:text-base">
                          {toPersianDigits(achievement.title)}
                        </p>
                        {meta ? (
                          <p className="mt-1 truncate text-xs text-muted sm:text-sm">
                            {toPersianDigits(meta)}
                          </p>
                        ) : null}
                      </div>
                      {achievement.achievementDate ? (
                        <time className="shrink-0 text-xs text-muted">
                          {formatJalaliDateShort(achievement.achievementDate)}
                        </time>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
