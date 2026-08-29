"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";
import { useInViewOnce } from "./use-in-view-once";

export function StoryTimeline() {
  const { story } = aboutPageContent;
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <Section
      ariaLabelledby="about-story-heading"
      id="story"
      className="scroll-mt-28"
    >
      <Container>
        <SectionHeader
          eyebrow={story.eyebrow}
          heading={story.title}
          description={story.description}
          headingId="about-story-heading"
        />

        <div ref={ref} className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute inset-y-2 end-4 w-px bg-gradient-to-b from-secondary/50 via-border to-transparent sm:start-4 sm:end-auto"
          />
          <ol className="space-y-8">
            {story.timeline.map((item, index) => (
              <li
                key={item.year}
                className={`relative pe-10 transition-all duration-500 sm:ps-12 sm:pe-0 ${
                  inView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                }`}
                style={{
                  transitionDelay: inView ? `${index * 90}ms` : "0ms",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute end-2.5 top-5 size-3 rounded-full border-2 border-secondary bg-white shadow-sm sm:start-2.5 sm:end-auto"
                />
                <article className="premium-card p-5 sm:p-6">
                  <p className="text-sm font-semibold tracking-wide text-secondary">
                    {toPersianDigits(item.year)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-primary">
                    {toPersianDigits(item.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {toPersianDigits(item.description)}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
