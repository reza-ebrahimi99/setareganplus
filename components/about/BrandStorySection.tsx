import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { aboutBrandStoryContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "brand-story-heading";

export function BrandStorySection() {
  const { id, eyebrow, heading, opening, paragraphs } = aboutBrandStoryContent;

  return (
    <Section id={id} ariaLabelledby={headingId} className="section-muted">
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            headingId={headingId}
          />
        </ScrollReveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <ScrollReveal className="lg:col-span-5" delayMs={80}>
            <blockquote className="premium-card border-s-4 border-s-secondary p-6 sm:p-8">
              <p className="text-xl font-semibold leading-10 text-primary sm:text-2xl sm:leading-[2.6rem]">
                {toPersianDigits(opening)}
              </p>
            </blockquote>
          </ScrollReveal>

          <div className="space-y-5 lg:col-span-7">
            {paragraphs.map((paragraph, index) => (
              <ScrollReveal key={paragraph.slice(0, 24)} delayMs={120 + index * 80}>
                <p className="text-base leading-8 text-muted sm:text-[1.05rem] sm:leading-9">
                  {toPersianDigits(paragraph)}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
