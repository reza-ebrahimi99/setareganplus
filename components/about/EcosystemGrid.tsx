import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

export function EcosystemGrid() {
  const { ecosystem } = aboutPageContent;

  return (
    <Section ariaLabelledby="about-ecosystem-heading">
      <Container>
        <SectionHeader
          eyebrow={ecosystem.eyebrow}
          heading={ecosystem.title}
          description={ecosystem.description}
          headingId="about-ecosystem-heading"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystem.items.map((item, index) => (
            <li key={item.title}>
              <FeatureCard
                title={item.title}
                description={item.description}
                badge={toPersianDigits(String(index + 1).padStart(2, "0"))}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
