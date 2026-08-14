import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ServiceCard } from "@/components/ui/ServiceCard";
import {
  educationalPaths,
  servicesSectionContent,
} from "@/content/home";

const headingId = "educational-paths-heading";

export function PremiumServices() {
  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={servicesSectionContent.eyebrow}
          heading={servicesSectionContent.heading}
          description={servicesSectionContent.description}
          headingId={headingId}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {educationalPaths.map((path) => (
            <ServiceCard
              key={path.title}
              title={path.title}
              description={path.description}
              href={path.href}
              statusLabel="مسیر آموزشی"
              statusTone="default"
            />
          ))}
        </ul>
      </Container>
    </Section>
  );
}
