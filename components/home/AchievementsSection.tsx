import Link from "next/link";
import { AchievementsShowcaseClient } from "@/components/home/AchievementsShowcaseClient";
import { Container } from "@/components/ui/Container";
import {
  achievementPlaceholders,
  achievementsContent,
  achievementTimeline,
} from "@/content/home";
import { loadHomepageAchievements } from "@/lib/website/achievements";
import { toPersianDigits } from "@/lib/persian";

const headingId = "achievements-heading";

export async function AchievementsSection() {
  /** One CMS query — grid + featured slider stay synchronized. */
  const { achievements, sliderAchievements } = await loadHomepageAchievements();

  return (
    <section
      aria-labelledby={headingId}
      className="achievements-showcase relative overflow-hidden border-y border-white/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.14),_transparent_50%)]"
      />
      <Container className="relative py-12 sm:py-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.18em] text-secondary">
              {toPersianDigits(achievementsContent.eyebrow)}
            </p>
            <h2
              id={headingId}
              className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              {toPersianDigits(achievementsContent.heading)}
            </h2>
            <p className="mt-4 text-base leading-9 text-white/75 sm:text-lg">
              {toPersianDigits(achievementsContent.description)}
            </p>
          </div>
          <Link
            href={achievementsContent.showcaseCta.href}
            className="achievements-cta-premium inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-secondary px-7 text-sm font-semibold text-primary transition hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {achievementsContent.showcaseCta.label}
          </Link>
        </div>

        <ul className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {achievementPlaceholders.map((stat) => (
            <li
              key={stat.id}
              className="flagship-metric-card flagship-metric-card--on-dark"
            >
              <p className="text-2xl font-bold text-secondary sm:text-3xl">
                {toPersianDigits(stat.value)}
              </p>
              <p className="mt-2 text-xs font-medium text-white/65 sm:text-sm">
                {toPersianDigits(stat.label)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <p className="text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(achievementsContent.showcaseEyebrow)}
          </p>
          <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            {toPersianDigits(achievementsContent.showcaseHeading)}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            {toPersianDigits(achievementsContent.showcaseDescription)}
          </p>

          <AchievementsShowcaseClient
            achievements={achievements}
            sliderAchievements={sliderAchievements}
            emptyMessage="به‌زودی افتخارات منتشرشده از سامانه محتوا اینجا نمایش داده می‌شود."
          />
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={achievementsContent.showcaseCta.href}
            className="achievements-cta-premium achievements-cta-premium--xl inline-flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-8 text-sm font-semibold text-primary transition hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {achievementsContent.showcaseCta.label}
          </Link>
        </div>

        <div className="mt-14">
          <p className="text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(achievementsContent.timelineHeading)}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
            {toPersianDigits(achievementsContent.timelineDescription)}
          </p>
          <ol className="achievement-timeline-alive mt-8">
            {achievementTimeline.map((item, index) => (
              <li key={item.id} className="achievement-timeline-alive-item">
                <span aria-hidden="true" className="achievement-timeline-alive-dot" />
                {index < achievementTimeline.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="achievement-timeline-alive-line"
                  />
                ) : null}
                <span className="inline-flex rounded-full border border-secondary/35 bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                  {toPersianDigits(item.year)}
                </span>
                <h4 className="mt-4 text-base font-bold text-white">
                  {toPersianDigits(item.title)}
                </h4>
                <p className="mt-2 text-sm leading-7 text-white/65">
                  {toPersianDigits(item.description)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
