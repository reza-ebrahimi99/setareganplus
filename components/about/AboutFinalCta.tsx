import { Container } from "@/components/ui/Container";
import { CtaPanel } from "@/components/ui/CtaPanel";
import { Section } from "@/components/ui/Section";
import { aboutPageContent } from "@/content/about-page";

export function AboutFinalCta() {
  const { finalCta } = aboutPageContent;

  return (
    <Section ariaLabelledby="about-final-cta-heading">
      <Container>
        <div id="about-final-cta-heading">
          <CtaPanel
            heading={finalCta.heading}
            description={finalCta.description}
            primary={{
              label: finalCta.primary.label,
              href: finalCta.primary.href,
              variant: "secondary",
            }}
            secondary={{
              label: finalCta.secondary.label,
              href: finalCta.secondary.href,
              variant: "outline",
            }}
          />
        </div>
      </Container>
    </Section>
  );
}
