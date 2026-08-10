import {
  AchievementCinematicStage,
  type CinematicGalleryItem,
  type CinematicSlide,
  type CinematicTickerItem,
} from "@/components/achievements/AchievementCinematicStage";
import type {
  AchievementTimelineGroup,
  PublicAchievementCard,
} from "@/lib/website/achievements";

export type AchievementShowcaseMetric = {
  metric: string;
  title: string;
  description: string;
};

type AchievementShowcaseProps = {
  eyebrow: string;
  heading: string;
  description: string;
  headingId?: string;
  metrics?: ReadonlyArray<AchievementShowcaseMetric>;
  featured: PublicAchievementCard[];
  timeline: AchievementTimelineGroup[];
  timelineHeading?: string;
  timelineDescription?: string;
  cta: { label: string; href: string };
  /** Kept for API compatibility — cinematic stage uses density via content only */
  variant?: "home" | "page";
};

function slideFromAchievement(
  achievement: PublicAchievementCard,
  eyebrow: string,
): CinematicSlide {
  const meta = [
    achievement.categoryName,
    achievement.place,
    achievement.level,
    achievement.schoolYear,
    achievement.gradeName,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: achievement.id,
    href: `/achievements/${achievement.slug}`,
    title: achievement.title,
    eyebrow: achievement.categoryName || eyebrow,
    support: achievement.shortDescription,
    meta,
    coverUrl: achievement.coverUrl,
    coverAlt: achievement.coverAlt,
    accent: achievement.categoryColor,
  };
}

function flattenTimeline(
  timeline: AchievementTimelineGroup[],
): PublicAchievementCard[] {
  const seen = new Set<string>();
  const items: PublicAchievementCard[] = [];
  for (const group of timeline) {
    for (const achievement of group.achievements) {
      if (seen.has(achievement.id)) continue;
      seen.add(achievement.id);
      items.push(achievement);
    }
  }
  return items;
}

/**
 * Server shell — maps CMS/loader data into the cinematic stage.
 * UI lives entirely in AchievementCinematicStage (no AchievementCard grid).
 */
export function AchievementShowcase({
  eyebrow,
  heading,
  description,
  headingId = "achievement-showcase-heading",
  metrics = [],
  featured,
  timeline,
  cta,
}: AchievementShowcaseProps) {
  const timelineItems = flattenTimeline(timeline);

  const slides: CinematicSlide[] =
    featured.length > 0
      ? featured.map((item) => slideFromAchievement(item, eyebrow))
      : timelineItems.length > 0
        ? timelineItems
            .slice(0, 6)
            .map((item) => slideFromAchievement(item, eyebrow))
        : [
            {
              id: "fallback-showcase",
              href: cta.href,
              title: heading,
              eyebrow,
              support: description,
              meta: "",
              coverUrl: null,
              coverAlt: heading,
              accent: "#D4AF37",
            },
          ];

  const tickerSource =
    featured.length > 0
      ? featured
      : timelineItems.length > 0
        ? timelineItems
        : [];

  const tickerItems: CinematicTickerItem[] =
    tickerSource.length > 0
      ? tickerSource.map((item) => ({
          id: item.id,
          text: [item.title, item.categoryName, item.place]
            .filter(Boolean)
            .join(" — "),
        }))
      : [
          { id: "t1", text: "ویترین افتخارات ستارگان پلاس فعال است" },
          { id: "t2", text: "مسیر موفقیت دانش‌آموزان بدون انتشار هویت فردی" },
          { id: "t3", text: "المپیاد، پذیرش و گواهی‌های مؤسسه" },
        ];

  const gallerySource = [
    ...featured,
    ...timelineItems.filter(
      (item) => !featured.some((featuredItem) => featuredItem.id === item.id),
    ),
  ].slice(0, 12);

  const galleryItems: CinematicGalleryItem[] = gallerySource.map(
    (item, index) => ({
      id: item.id,
      href: `/achievements/${item.slug}`,
      title: item.title,
      meta: [item.categoryName, item.schoolYear, item.place]
        .filter(Boolean)
        .join(" · "),
      coverUrl: item.coverUrl,
      coverAlt: item.coverAlt,
      accent: item.categoryColor,
      tall: index % 5 === 0 || index % 5 === 3,
    }),
  );

  return (
    <AchievementCinematicStage
      headingId={headingId}
      eyebrow={eyebrow}
      heading={heading}
      description={description}
      cta={cta}
      slides={slides}
      metrics={metrics}
      tickerItems={tickerItems}
      galleryItems={galleryItems}
      autoplayMs={8000}
    />
  );
}
