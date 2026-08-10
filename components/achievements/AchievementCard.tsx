import Image from "next/image";
import Link from "next/link";
import type { PublicAchievementCard } from "@/lib/website/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type AchievementCardProps = {
  achievement: PublicAchievementCard;
  priority?: boolean;
  featured?: boolean;
  size?: "default" | "spotlight";
};

export function AchievementCard({
  achievement,
  priority = false,
  featured = false,
  size = "default",
}: AchievementCardProps) {
  const meta = [
    achievement.gradeName,
    achievement.place,
    achievement.level,
    achievement.schoolYear,
  ]
    .filter(Boolean)
    .join(" · ");

  const isSpotlight = size === "spotlight";

  return (
    <Link
      href={`/achievements/${achievement.slug}`}
      className={`achievement-card group${
        isSpotlight ? " achievement-card--spotlight" : ""
      }${featured || achievement.isFeatured ? " achievement-card--featured" : ""}`}
    >
      <div
        className={`achievement-card-media relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/15 ${
          isSpotlight ? "aspect-[16/11] sm:aspect-[16/10]" : "aspect-[16/10]"
        }`}
      >
        {achievement.coverUrl ? (
          <Image
            src={achievement.coverUrl}
            alt={achievement.coverAlt}
            fill
            unoptimized
            sizes={
              isSpotlight
                ? "(max-width: 1024px) 100vw, 640px"
                : "(max-width: 768px) 100vw, 360px"
            }
            priority={priority}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-primary/50">
            {toPersianDigits(achievement.categoryName)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/35 to-transparent" />

        {achievement.categoryColor ? (
          <span
            className="absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: achievement.categoryColor }}
          >
            {toPersianDigits(achievement.categoryName)}
          </span>
        ) : (
          <span className="absolute start-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            {toPersianDigits(achievement.categoryName)}
          </span>
        )}

        {achievement.isFeatured || featured ? (
          <span className="absolute end-3 top-3 rounded-full border border-secondary/40 bg-primary/80 px-2.5 py-1 text-[0.7rem] font-medium text-secondary backdrop-blur-sm">
            برجسته
          </span>
        ) : null}
      </div>

      <div
        className={
          isSpotlight
            ? "space-y-2.5 p-5 sm:p-6"
            : "space-y-2 p-4 sm:p-5"
        }
      >
        <h3
          className={
            isSpotlight
              ? "text-xl font-bold text-primary sm:text-2xl"
              : "text-lg font-bold text-primary"
          }
        >
          {toPersianDigits(achievement.title)}
        </h3>
        {meta ? (
          <p className="text-sm text-secondary">{toPersianDigits(meta)}</p>
        ) : null}
        {achievement.shortDescription ? (
          <p
            className={`text-sm leading-7 text-muted ${
              isSpotlight ? "line-clamp-3" : "line-clamp-2"
            }`}
          >
            {toPersianDigits(achievement.shortDescription)}
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
