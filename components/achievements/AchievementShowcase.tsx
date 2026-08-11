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
  /** Preferred slide sources (CMS placements) */
  heroItems?: PublicAchievementCard[];
  sliderItems?: PublicAchievementCard[];
  tickerSource?: PublicAchievementCard[];
  gallerySource?: PublicAchievementCard[];
  /** @deprecated use sliderItems / heroItems */
  featured?: PublicAchievementCard[];
  /** @deprecated unused for placement-driven showcase */
  timeline?: AchievementTimelineGroup[];
  timelineHeading?: string;
  timelineDescription?: string;
  cta: { label: string; href: string };
  variant?: "home" | "page";
};

function uniqueById(
  items: ReadonlyArray<PublicAchievementCard>,
): PublicAchievementCard[] {
  const seen = new Set<string>();
  const out: PublicAchievementCard[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

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
    desktopFocusX: achievement.desktopFocusX,
    desktopFocusY: achievement.desktopFocusY,
    tabletFocusX: achievement.tabletFocusX,
    tabletFocusY: achievement.tabletFocusY,
    mobileFocusX: achievement.mobileFocusX,
    mobileFocusY: achievement.mobileFocusY,
    desktopZoom: achievement.desktopZoom,
    tabletZoom: achievement.tabletZoom,
    mobileZoom: achievement.mobileZoom,
  };
}

/**
 * Server shell — maps CMS placement loaders into the cinematic stage.
 */
export function AchievementShowcase({
  eyebrow,
  heading,
  description,
  headingId = "achievement-showcase-heading",
  metrics = [],
  heroItems = [],
  sliderItems = [],
  tickerSource = [],
  gallerySource = [],
  featured = [],
  cta,
  variant = "home",
}: AchievementShowcaseProps) {
  const sliderPool = uniqueById([
    ...heroItems,
    ...sliderItems,
    ...(sliderItems.length === 0 && heroItems.length === 0 ? featured : []),
  ]);

  const slides: CinematicSlide[] =
    sliderPool.length > 0
      ? sliderPool.map((item) => slideFromAchievement(item, eyebrow))
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
            desktopFocusX: 50,
            desktopFocusY: 42,
            tabletFocusX: 50,
            tabletFocusY: 40,
            mobileFocusX: 50,
            mobileFocusY: 35,
            desktopZoom: 1,
            tabletZoom: 1,
            mobileZoom: 1,
          },
        ];

  const tickerPool =
    tickerSource.length > 0 ? tickerSource : sliderPool.slice(0, 8);

  const tickerItems: CinematicTickerItem[] =
    tickerPool.length > 0
      ? tickerPool.map((item) => ({
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

  const galleryPool = uniqueById(
    gallerySource.length > 0 ? gallerySource : sliderPool,
  ).slice(0, 12);

  const galleryItems: CinematicGalleryItem[] = galleryPool.map(
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
      desktopFocusX: item.desktopFocusX,
      desktopFocusY: item.desktopFocusY,
      tabletFocusX: item.tabletFocusX,
      tabletFocusY: item.tabletFocusY,
      mobileFocusX: item.mobileFocusX,
      mobileFocusY: item.mobileFocusY,
      desktopZoom: item.desktopZoom,
      tabletZoom: item.tabletZoom,
      mobileZoom: item.mobileZoom,
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
      variant={variant}
    />
  );
}
