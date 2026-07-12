import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ctaContent } from "@/content/home";

export function ContactCta() {
  return (
    <Section ariaLabelledby="cta-heading">
      <Container>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
          <h2
            id="cta-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {ctaContent.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            {ctaContent.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href={ctaContent.primaryHref} variant="primary">
              {ctaContent.primaryLabel}
            </Button>
            <Button href={ctaContent.secondaryHref} variant="outline">
              {ctaContent.secondaryLabel}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
