import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { MapPinIcon } from "@/components/ui/ContactIcons";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutMapContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-map-heading";

export function AboutMapSection() {
  const {
    eyebrow,
    heading,
    description,
    embedSrc,
    directionsHref,
    directionsLabel,
    branches,
  } = aboutMapContent;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow={eyebrow}
              heading={heading}
              description={description}
              headingId={headingId}
            />
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <MapPinIcon className="size-4" />
              {directionsLabel}
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={100} className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <iframe
              title="نقشه موقعیت مؤسسه آموزشی ستارگان"
              src={embedSrc}
              className="aspect-[4/3] w-full border-0 sm:aspect-[21/9]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </ScrollReveal>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {branches.map((branch, index) => (
            <ScrollReveal key={branch.name} as="li" delayMs={120 + index * 50}>
              <a
                href={branch.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-card block p-4 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-safe:hover:-translate-y-0.5"
              >
                <p className="text-sm font-semibold text-primary">
                  {branch.name}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {toPersianDigits(branch.address)}
                </p>
              </a>
            </ScrollReveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
