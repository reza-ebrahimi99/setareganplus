import Image from "next/image";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutFooterCtaContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-footer-cta-heading";

export function AboutFooterCta() {
  const { heading, description, background, primary, secondary } =
    aboutFooterCtaContent;

  return (
    <Section
      className="relative isolate overflow-hidden border-y border-border py-16 sm:py-20"
      ariaLabelledby={headingId}
    >
      <Image
        src={background.url}
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-l from-primary/92 via-primary/88 to-primary/80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgb(212_175_55/0.22),transparent_50%)]"
      />

      <Container className="relative">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2
            id={headingId}
            className="text-2xl font-bold leading-10 text-white sm:text-3xl sm:leading-[2.75rem] lg:text-4xl"
          >
            {toPersianDigits(heading)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/85">
            {toPersianDigits(description)}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href={primary.href} variant="secondary" className="min-h-11">
              {primary.label}
            </Button>
            <Button
              href={secondary.href}
              variant="outline"
              className="min-h-11 border-white/30 bg-white/10 text-white hover:border-secondary/50 hover:bg-white/15"
            >
              {secondary.label}
            </Button>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
