import Image from "next/image";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";

type PortalAchievementCardProps = {
  achievement: PortalAchievementDto;
  priority?: boolean;
};

export function PortalAchievementCard({
  achievement,
  priority = false,
}: PortalAchievementCardProps) {
  return (
    <article className="admin-card overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/15">
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
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-primary/50">
            {achievement.categoryName}
          </div>
        )}
        <span className="absolute start-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white">
          {achievement.categoryName}
        </span>
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <h3 className="text-lg font-bold text-primary">{achievement.title}</h3>
        {achievement.schoolYear ? (
          <p className="text-sm text-secondary">{achievement.schoolYear}</p>
        ) : null}
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
        {achievement.certificateUrl ? (
          <a
            href={achievement.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-medium text-secondary underline-offset-2 hover:underline"
          >
            مشاهده گواهی
          </a>
        ) : null}
      </div>
    </article>
  );
}
