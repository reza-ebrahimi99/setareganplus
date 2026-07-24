"use client";

import { AnimatedCounter } from "@/components/about/AnimatedCounter";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutStatsContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-stats-heading";

export function AboutStatsSection() {
  const { eyebrow, heading, description, items } = aboutStatsContent;

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

        <ul className="mt-10 grid grid-cols-2 gap-4 lg:mx-auto lg:max-w-2xl">
          {items.map((item, index) => (
            <ScrollReveal key={item.label} as="li" delayMs={index * 70}>
              <article className="premium-card h-full px-4 py-6 text-center sm:px-5 sm:py-8">
                <p
                  className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl"
                  aria-label={`${item.label}: ${item.value}${item.suffix}`}
                >
                  <AnimatedCounter
                    value={item.value}
                    suffix={item.suffix}
                    isYear={item.isYear}
                  />
                </p>
                <h3 className="mt-3 text-sm font-semibold text-primary">
                  {toPersianDigits(item.label)}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {toPersianDigits(item.hint)}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
