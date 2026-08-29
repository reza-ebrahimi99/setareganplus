import {
  LayersIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/icons";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrustItem } from "@/components/ui/TrustItem";
import { trustItems, trustSectionContent } from "@/content/home";

const trustIcons = [
  <UsersIcon key="users" className="size-5" />,
  <ShieldIcon key="shield" className="size-5" />,
  <RouteIcon key="route" className="size-5" />,
  <LayersIcon key="layers" className="size-5" />,
  <SparkIcon key="spark" className="size-5" />,
];

const headingId = "trust-heading";

export function TrustSection() {
  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={trustSectionContent.eyebrow}
          heading={trustSectionContent.heading}
          description={trustSectionContent.description}
          headingId={headingId}
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trustItems.map((item, index) => (
            <li key={item.title}>
              <TrustItem
                title={item.title}
                description={item.description}
                icon={trustIcons[index]}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
