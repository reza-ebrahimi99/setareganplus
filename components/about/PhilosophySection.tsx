import {
  BookIcon,
  LayersIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/icons";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPhilosophyContent } from "@/content/about-page";

const headingId = "philosophy-heading";

const icons = [
  <BookIcon key="book" className="size-5" />,
  <SparkIcon key="spark" className="size-5" />,
  <UsersIcon key="users" className="size-5" />,
  <LayersIcon key="layers" className="size-5" />,
];

export function PhilosophySection() {
  const { eyebrow, heading, description, items } = aboutPhilosophyContent;

  return (
    <Section className="section-muted" ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            description={description}
            headingId={headingId}
          />
        </ScrollReveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <ScrollReveal key={item.title} as="li" delayMs={index * 70}>
              <FeatureCard
                title={item.title}
                description={item.description}
                icon={icons[index]}
              />
            </ScrollReveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
