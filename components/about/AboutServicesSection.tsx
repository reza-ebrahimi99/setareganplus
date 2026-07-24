import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutServicesContent } from "@/content/about-page";

const headingId = "about-services-heading";

export function AboutServicesSection() {
  const { eyebrow, heading, description, items } = aboutServicesContent;

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

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <ScrollReveal key={item.title} as="li" delayMs={index * 60} className="h-full">
              <FeatureCard
                title={item.title}
                description={item.description}
                href={item.href}
              />
            </ScrollReveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
