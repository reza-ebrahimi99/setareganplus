import { Container } from "@/components/ui/Container";
import { CtaPanel } from "@/components/ui/CtaPanel";
import { Section } from "@/components/ui/Section";
import { finalCtaContent } from "@/content/home";

export function FinalCta() {
  return (
    <Section ariaLabelledby="final-cta-heading">
      <Container>
        <CtaPanel
          heading={finalCtaContent.heading}
          description={finalCtaContent.description}
          primary={{
            label: finalCtaContent.primaryLabel,
            href: finalCtaContent.primaryHref,
            variant: "secondary",
          }}
          secondary={{
            label: finalCtaContent.secondaryLabel,
            href: finalCtaContent.secondaryHref,
            variant: "outline",
          }}
        />
      </Container>
    </Section>
  );
}
