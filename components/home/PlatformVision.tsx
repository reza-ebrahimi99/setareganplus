import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { platformVisionContent, platformVisionItems } from "@/content/home";

export function PlatformVision() {
  return (
    <Section ariaLabelledby="vision-heading">
      <Container>
        <div className="max-w-3xl">
          <h2
            id="vision-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {platformVisionContent.heading}
          </h2>
          <p className="mt-3 text-base leading-8 text-muted">
            {platformVisionContent.description}
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformVisionItems.map((item) => (
            <li key={item.title}>
              <FeatureCard
                title={item.title}
                description={item.description}
                badge={item.badge}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
