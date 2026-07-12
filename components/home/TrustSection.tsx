import {
  LayersIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/icons";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { TrustItem } from "@/components/ui/TrustItem";
import { trustItems, trustSectionContent } from "@/content/home";

const trustIcons = [
  <UsersIcon key="users" className="size-5" />,
  <ShieldIcon key="shield" className="size-5" />,
  <RouteIcon key="route" className="size-5" />,
  <LayersIcon key="layers" className="size-5" />,
  <SparkIcon key="spark" className="size-5" />,
];

export function TrustSection() {
  return (
    <Section ariaLabelledby="trust-heading">
      <Container>
        <div className="max-w-3xl">
          <h2
            id="trust-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {trustSectionContent.heading}
          </h2>
          <p className="mt-3 text-base leading-8 text-muted">
            {trustSectionContent.description}
          </p>
        </div>
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
