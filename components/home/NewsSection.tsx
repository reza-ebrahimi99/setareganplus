import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { newsContent, newsItems } from "@/content/home";

const headingId = "news-heading";

export function NewsSection() {
  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={newsContent.eyebrow}
          heading={newsContent.heading}
          description={newsContent.description}
          headingId={headingId}
        />

        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {newsItems.map((item) => (
            <li key={item.title}>
              <FeatureCard
                title={item.title}
                description={item.description}
                date={item.date}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
