"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { aboutTimelineContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-timeline-heading";

export function AboutTimeline() {
  const { eyebrow, heading, description, events } = aboutTimelineContent;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            description={description}
            headingId={headingId}
          />
        </ScrollReveal>

        <ol className="about-timeline mt-12 space-y-0">
          {events.map((event, index) => (
            <ScrollReveal
              key={event.year}
              as="li"
              className="about-timeline__item"
              delayMs={index * 90}
            >
              <div className="about-timeline__marker" aria-hidden="true">
                <span className="about-timeline__dot" />
              </div>
              <article className="premium-card about-timeline__card p-5 sm:p-6">
                <p className="text-sm font-bold tracking-wide text-secondary">
                  {toPersianDigits(event.year)}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-primary">
                  {toPersianDigits(event.title)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted sm:text-base sm:leading-8">
                  {toPersianDigits(event.description)}
                </p>
                {event.tags.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted"
                      >
                        {toPersianDigits(tag)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </ScrollReveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
