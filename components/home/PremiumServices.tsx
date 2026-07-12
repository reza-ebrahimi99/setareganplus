import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { servicesSectionContent } from "@/content/home";
import { services } from "@/content/services";

export function PremiumServices() {
  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="services-heading"
    >
      <Container>
        <div className="max-w-3xl">
          <h2
            id="services-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {servicesSectionContent.heading}
          </h2>
          <p className="mt-3 text-base leading-8 text-muted">
            {servicesSectionContent.description}
          </p>
        </div>
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
