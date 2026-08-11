import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

export function MissionVision() {
  const { mission, vision } = aboutPageContent;

  return (
    <Section ariaLabelledby="about-mission-heading">
      <Container>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="premium-card p-6 sm:p-8">
            <SectionHeader
              eyebrow={mission.eyebrow}
              heading={mission.title}
              headingId="about-mission-heading"
            />
            <p className="mt-6 text-lg font-medium leading-9 text-primary sm:text-xl">
              {toPersianDigits(mission.body)}
            </p>
          </article>
          <article className="premium-card p-6 sm:p-8">
            <SectionHeader
              eyebrow={vision.eyebrow}
              heading={vision.title}
              headingId="about-vision-heading"
            />
            <p className="mt-6 text-lg font-medium leading-9 text-primary sm:text-xl">
              {toPersianDigits(vision.body)}
            </p>
          </article>
        </div>
      </Container>
    </Section>
  );
}
