import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";

export function CoreValues() {
  const { values } = aboutPageContent;

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="about-values-heading"
    >
      <Container>
        <SectionHeader
          eyebrow={values.eyebrow}
          heading={values.title}
          description={values.description}
          headingId="about-values-heading"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.items.map((item) => (
            <li key={item.title}>
              <FeatureCard title={item.title} description={item.description} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
