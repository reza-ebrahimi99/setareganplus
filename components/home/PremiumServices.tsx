import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { servicesSectionContent } from "@/content/home";
import { services } from "@/content/services";

const headingId = "services-heading";

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
          {services.map((service) => (
            <ServiceCard
              key={service.href}
              title={service.title}
              description={service.description}
              href={service.href}
              statusLabel={service.statusLabel}
              statusTone={service.statusTone}
            />
          ))}
        </ul>
      </Container>
    </Section>
  );
}
