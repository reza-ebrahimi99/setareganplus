import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutVisionContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "vision-heading";

export function VisionSection() {
  const { eyebrow, heading, description } = aboutVisionContent;

  return (
    <Section
      className="relative overflow-hidden border-y border-border bg-primary"
      ariaLabelledby={headingId}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(212_175_55/0.16),transparent_60%)]"
      />
      <Container className="relative">
        <ScrollReveal className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-4 text-2xl font-bold leading-10 text-white sm:text-3xl sm:leading-[2.75rem] lg:text-4xl lg:leading-[3.2rem]"
          >
            {toPersianDigits(heading)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/80">
            {toPersianDigits(description)}
          </p>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
