import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { achievementItems, achievementsContent } from "@/content/home";

const headingId = "achievements-heading";

export function AchievementsSection() {
  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={achievementsContent.eyebrow}
          heading={achievementsContent.heading}
          description={achievementsContent.description}
          headingId={headingId}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {achievementItems.map((item) => (
            <li key={item.title}>
              <FeatureCard
                metric={item.metric}
                title={item.title}
                description={item.description}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
