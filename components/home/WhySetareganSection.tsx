import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  whySetareganContent,
  whySetareganPillars,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "why-setaregan-heading";

export function WhySetareganSection() {
  return (
    <Section
      className="flagship-section overflow-hidden"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={whySetareganContent.eyebrow}
          heading={whySetareganContent.heading}
          description={whySetareganContent.description}
          headingId={headingId}
        />

        <ol className="why-story mt-14 space-y-0">
          {whySetareganPillars.map((pillar, index) => {
            const reverse = index % 2 === 1;
            return (
              <li
                key={pillar.id}
                className={`why-story-row grid gap-6 border-t border-border/80 py-10 md:grid-cols-12 md:gap-10 md:py-12 ${
                  reverse ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="md:col-span-4">
                  <p className="text-xs font-medium tracking-[0.2em] text-secondary">
                    {toPersianDigits(String(index + 1).padStart(2, "0"))}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">
                    {toPersianDigits(pillar.title)}
                  </h3>
                </div>
                <div className="md:col-span-7 md:col-start-6">
                  <p className="max-w-xl text-base leading-9 text-muted sm:text-lg sm:leading-10">
                    {toPersianDigits(pillar.description)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}
