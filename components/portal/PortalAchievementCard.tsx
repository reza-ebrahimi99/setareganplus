import Image from "next/image";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";

type PortalAchievementCardProps = {
  achievement: PortalAchievementDto;
  priority?: boolean;
  featured?: boolean;
};

export function PortalAchievementCard({
  achievement,
  priority = false,
  featured = false,
}: PortalAchievementCardProps) {
  return (
    <article
      className={[
        "portal-surface portal-achievement-card",
        featured ? "portal-achievement-card--featured" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-portal-accent="orange"
    >
      <div className="portal-achievement-card__media">
        {achievement.coverUrl ? (
          <Image
            src={achievement.coverUrl}
            alt={achievement.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 360px"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="portal-achievement-card__fallback">
            {achievement.categoryName}
          </div>
        )}
        <span className="portal-achievement-card__chip">
          {achievement.categoryName}
        </span>
      </div>
      <div className="portal-achievement-card__body">
        <h3 className="portal-achievement-card__title">{achievement.title}</h3>
        {achievement.schoolYear ? (
          <p className="portal-achievement-card__year">{achievement.schoolYear}</p>
        ) : null}
        {achievement.shortDescription ? (
          <p className="portal-achievement-card__desc">
            {achievement.shortDescription}
          </p>
        ) : null}
        {achievement.achievementDate ? (
          <p className="portal-achievement-card__date">
            {formatJalaliDateShort(achievement.achievementDate)}
          </p>
        ) : null}
        {achievement.certificateUrl ? (
          <a
            href={achievement.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-achievement-card__link"
          >
            مشاهده گواهی
          </a>
        ) : null}
      </div>
    </article>
  );
}
