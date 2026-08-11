"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";
import { AnimatedStatValue } from "./AnimatedStatValue";
import { useInViewOnce } from "./use-in-view-once";

export function AboutStatistics() {
  const { statistics } = aboutPageContent;
  const { ref, inView } = useInViewOnce<HTMLUListElement>(0.25);

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="about-stats-heading"
    >
      <Container>
        <SectionHeader
          eyebrow={statistics.eyebrow}
          heading={statistics.title}
          description={statistics.description}
          headingId="about-stats-heading"
        />

        <ul
          ref={ref}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statistics.items.map((item) => (
            <li key={item.label}>
              <article className="premium-card h-full px-5 py-6 text-center sm:px-6">
                <p className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
                  <AnimatedStatValue value={item.value} active={inView} />
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {toPersianDigits(item.label)}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
