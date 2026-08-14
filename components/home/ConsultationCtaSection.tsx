import { Container } from "@/components/ui/Container";
import { CtaPanel } from "@/components/ui/CtaPanel";
import { Section } from "@/components/ui/Section";
import { consultationCtaContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "consultation-cta-heading";

export function ConsultationCtaSection() {
  return (
    <Section
      className="border-y border-border/70 bg-gradient-to-b from-background via-primary/[0.03] to-background"
      ariaLabelledby={headingId}
    >
      <Container>
        <p className="mb-3 text-xs font-medium tracking-wide text-secondary">
          {toPersianDigits(consultationCtaContent.eyebrow)}
        </p>
        <div id={headingId}>
          <CtaPanel
            heading={consultationCtaContent.heading}
            description={consultationCtaContent.description}
            primary={{
              label: consultationCtaContent.primary.label,
              href: consultationCtaContent.primary.href,
              variant: "secondary",
            }}
            secondary={{
              label: consultationCtaContent.secondary.label,
              href: consultationCtaContent.secondary.href,
              variant: "outline",
            }}
          />
        </div>
      </Container>
    </Section>
  );
}
