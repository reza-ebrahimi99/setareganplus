/**
 * Trophy Room — presentation helpers from existing achievement DTOs.
 */

import type { PortalAchievementDto } from "@/lib/portal/student/achievements";

export type TrophyRoomInsights = {
  total: number;
  featured: PortalAchievementDto | null;
  recent: PortalAchievementDto[];
  categories: Array<{ name: string; count: number }>;
  withCertificate: number;
};

export function buildTrophyRoomInsights(
  achievements: readonly PortalAchievementDto[],
): TrophyRoomInsights {
  const featured = achievements[0] ?? null;
  const categoryMap = new Map<string, number>();
  for (const item of achievements) {
    categoryMap.set(
      item.categoryName,
      (categoryMap.get(item.categoryName) ?? 0) + 1,
    );
  }

  return {
    total: achievements.length,
    featured,
    recent: achievements.slice(featured ? 1 : 0, featured ? 7 : 6),
    categories: [...categoryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    withCertificate: achievements.filter((item) => item.certificateUrl).length,
  };
}
