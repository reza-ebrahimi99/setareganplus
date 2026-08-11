"use client";

import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";
import { AnimatedStatValue } from "./AnimatedStatValue";
import { useInViewOnce } from "./use-in-view-once";

export function FounderAchievements() {
  const { founderAchievements: content } = aboutPageContent;
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="about-founder-heading"
    >
      <Container>
        <SectionHeader
          eyebrow={content.eyebrow}
          heading={content.title}
          description={content.subtitle}
          headingId="about-founder-heading"
        />

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <figure className="premium-card overflow-hidden">
              <div className="founder-portrait-frame relative aspect-[4/5] bg-primary/[0.03]">
                {hasMediaUrl(content.portrait) ? (
                  <MediaImage
                    media={content.portrait}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 320px"
                  />
                ) : null}
              </div>
              <figcaption className="space-y-2 px-5 py-4">
                <p className="text-base font-semibold text-primary">
                  {toPersianDigits(content.founderName)}
                </p>
                <p className="text-sm leading-7 text-muted">
                  {toPersianDigits(content.narrative)}
                </p>
              </figcaption>
            </figure>
          </div>

          <div ref={ref} className="relative lg:col-span-8">
            <div
              aria-hidden="true"
              className="absolute inset-y-2 end-4 w-px bg-gradient-to-b from-secondary/50 via-border to-transparent sm:start-4 sm:end-auto"
            />
            <ol className="space-y-5">
              {content.milestones.map((item, index) => (
                <li
                  key={item.title}
                  className={`relative pe-10 transition-all duration-500 sm:ps-12 sm:pe-0 ${
                    inView
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  }`}
                  style={{
                    transitionDelay: inView ? `${index * 70}ms` : "0ms",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute end-2.5 top-5 size-3 rounded-full border-2 border-secondary bg-white shadow-sm sm:start-2.5 sm:end-auto"
                  />
                  <FeatureCard
                    title={item.title}
                    description={item.description}
                    badge={toPersianDigits(String(index + 1).padStart(2, "0"))}
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {content.impactStats.map((item) => {
            const isNumeric = typeof item.value === "number";
            return (
              <li key={item.label}>
                <article className="premium-card h-full px-4 py-5 text-center">
                  <p className="text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
                    {isNumeric ? (
                      <AnimatedStatValue value={item.value} active={inView} />
                    ) : (
                      toPersianDigits(item.value)
                    )}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {toPersianDigits(item.label)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>

        <div className="mt-10">
          <ContentCard heading="پیام مؤسسه" body={`«${content.quote}»`} variant="quote" />
        </div>
      </Container>
    </Section>
  );
}
