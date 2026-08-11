import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

export function AiStarOsBlock() {
  const { aiStarOs } = aboutPageContent;

  return (
    <Section ariaLabelledby="about-ai-heading">
      <Container>
        <div className="cta-panel rounded-2xl border border-primary/20 p-6 shadow-sm sm:p-10">
          <p className="text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(aiStarOs.eyebrow)}
          </p>
          <h2
            id="about-ai-heading"
            className="mt-3 text-2xl font-bold sm:text-3xl"
          >
            {toPersianDigits(aiStarOs.title)}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8">
            {toPersianDigits(aiStarOs.description)}
          </p>
          <div className="mt-8">
            <Button
              href={aiStarOs.cta.href}
              variant="secondary"
              className="px-6 py-3 text-base"
            >
              {aiStarOs.cta.label}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
