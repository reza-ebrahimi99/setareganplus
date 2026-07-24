import {
  ChartIcon,
  LayersIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/icons";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrustItem } from "@/components/ui/TrustItem";
import { aboutWhyContent } from "@/content/about-page";

const headingId = "why-setaregan-heading";

const icons = [
  <ChartIcon key="chart" className="size-5" />,
  <ShieldIcon key="shield" className="size-5" />,
  <SparkIcon key="spark" className="size-5" />,
  <RouteIcon key="route" className="size-5" />,
  <UsersIcon key="users" className="size-5" />,
  <LayersIcon key="layers" className="size-5" />,
];

export function WhySetareganSection() {
  const { eyebrow, heading, description, items } = aboutWhyContent;

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

        <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <ScrollReveal key={item.title} as="li" delayMs={index * 60}>
              <TrustItem
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
