import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { aboutContent } from "@/content/site";

export const metadata: Metadata = {
  title: aboutContent.title,
  description: aboutContent.subtitle,
};

export default function AboutPage() {
  return (
    <SiteShell activePath="/about">
      <Section ariaLabelledby="page-heading">
        <Container>
          <Breadcrumbs items={aboutContent.breadcrumbs} />
          <PageHeading
            title={aboutContent.title}
            subtitle={aboutContent.subtitle}
          />
          <div className="space-y-6">
            {aboutContent.sections.map((section) => (
              <ContentCard
                key={section.heading}
                heading={section.heading}
                body={section.body}
              />
            ))}
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
