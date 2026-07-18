import Image from "next/image";
import Link from "next/link";
import type { PublicAchievementCard } from "@/lib/website/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";

type AchievementCardProps = {
  achievement: PublicAchievementCard;
  priority?: boolean;
};

export function AchievementCard({
  achievement,
  priority = false,
}: AchievementCardProps) {
  const meta = [
    achievement.place,
    achievement.level,
    achievement.schoolYear,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/achievements/${achievement.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-[transform,opacity,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-1 hover:border-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/15">
        {achievement.coverUrl ? (
          <Image
            src={achievement.coverUrl}
            alt={achievement.coverAlt}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 360px"
            priority={priority}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-primary/50">
            {achievement.categoryName}
          </div>
        )}
        {achievement.categoryColor ? (
          <span
            className="absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: achievement.categoryColor }}
          >
            {achievement.categoryName}
          </span>
        ) : (
          <span className="absolute start-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white">
            {achievement.categoryName}
          </span>
        )}
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-primary">{achievement.title}</h3>
        <p className="text-sm text-muted">
          {achievement.studentName}
          {achievement.gradeName ? ` · ${achievement.gradeName}` : ""}
        </p>
        {meta ? <p className="text-sm text-secondary">{meta}</p> : null}
        {achievement.shortDescription ? (
          <p className="line-clamp-2 text-sm leading-7 text-muted">
            {achievement.shortDescription}
          </p>
        ) : null}
        {achievement.achievementDate ? (
          <p className="text-xs text-muted">
            {formatJalaliDateShort(achievement.achievementDate)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
