import Link from "next/link";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  achievementPlaceholders,
  achievementsContent,
  achievementTimeline,
} from "@/content/home";
import { loadFeaturedAchievements } from "@/lib/website/achievements";
import { toPersianDigits } from "@/lib/persian";

const headingId = "achievements-heading";

export async function AchievementsSection() {
  const featured = await loadFeaturedAchievements();

  return (
    <Section className="flagship-section" ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={achievementsContent.eyebrow}
          heading={achievementsContent.heading}
          description={achievementsContent.description}
          headingId={headingId}
        />

        <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {achievementPlaceholders.map((stat) => (
            <li key={stat.id} className="flagship-metric-card">
              <p className="text-2xl font-bold text-secondary sm:text-3xl">
                {toPersianDigits(stat.value)}
              </p>
              <p className="mt-2 text-xs font-medium text-muted sm:text-sm">
                {toPersianDigits(stat.label)}
              </p>
            </li>
          ))}
        </ul>

        {featured.length > 0 ? (
          <div className="mt-14">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-secondary">
                {toPersianDigits(achievementsContent.showcaseEyebrow)}
              </p>
              <h3 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
                {toPersianDigits(achievementsContent.showcaseHeading)}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted sm:text-base">
                {toPersianDigits(achievementsContent.showcaseDescription)}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  priority={index === 0}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-14">
          <p className="text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(achievementsContent.timelineHeading)}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            {toPersianDigits(achievementsContent.timelineDescription)}
          </p>
          <ol className="achievement-timeline mt-8 grid gap-4 md:grid-cols-3">
            {achievementTimeline.map((item) => (
              <li key={item.id} className="achievement-timeline-item">
                <span className="inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {toPersianDigits(item.year)}
                </span>
                <h4 className="mt-4 text-base font-bold text-primary">
                  {toPersianDigits(item.title)}
                </h4>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {toPersianDigits(item.description)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={achievementsContent.showcaseCta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {achievementsContent.showcaseCta.label}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
